from dotenv import load_dotenv
load_dotenv()

import os
import re
import uuid
import secrets
import logging
import ipaddress
from datetime import datetime, timezone, timedelta
from html import escape
from html.parser import HTMLParser
from typing import Optional, List
from urllib.parse import urlparse

import bcrypt
import httpx
import jwt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid.uuid4())


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode("utf-8"), h.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": now() + timedelta(hours=12)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "type": "refresh", "exp": now() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookies(response: Response, user_id: str, email: str):
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")
    return access


async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    auth = request.headers.get("Authorization", "")
    if not token and auth.startswith("Bearer "):
        token = auth[7:]
    if not token:
        raise HTTPException(401, "Non authentifié")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(401, "Type de jeton invalide")
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Jeton expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Jeton invalide")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "Utilisateur introuvable")
    return user


async def get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


async def get_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(403, "Accès réservé à l'administrateur")
    return user


# ---------- Models ----------

class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str


class ProductIn(BaseModel):
    name: str
    description: str = ""
    category: str
    price: float
    member_price: float
    stock: int = 0
    image: str = ""
    featured: bool = False


class OrderItemIn(BaseModel):
    product_id: str
    qty: int


class CustomerIn(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    wilaya: str = ""
    commune: str = ""
    delivery_mode: str = "domicile"
    relay_point: str = ""
    address: str


class OrderIn(BaseModel):
    customer: CustomerIn
    items: List[OrderItemIn]
    payment_method: str = "cod"
    origin_url: Optional[str] = None


class StatusIn(BaseModel):
    status: str


class FavoriteIn(BaseModel):
    product_id: str


class ConvStartIn(BaseModel):
    guest_id: Optional[str] = None
    name: Optional[str] = None


class MessageIn(BaseModel):
    content: str


class BulkIn(BaseModel):
    ids: List[str]
    action: str
    value: Optional[float] = None


class PointsIn(BaseModel):
    points: int


ORDER_STATUSES = ["en_attente", "confirmee", "en_preparation", "livree", "annulee"]

TIER_KEYS = ["bronze", "silver", "gold"]


def compute_tier(points: int, tiers: list) -> dict:
    ordered = sorted(tiers, key=lambda t: t["min"])
    current = ordered[0]
    for t in ordered:
        if points >= t["min"]:
            current = t
    return current


# ---------- Auth ----------

@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Un compte existe déjà avec cet email")
    if len(data.password) < 6:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 6 caractères")
    user = {
        "id": uid(), "name": data.name, "email": email,
        "password_hash": hash_password(data.password), "phone": data.phone or "",
        "role": "client", "points": 0, "created_at": now().isoformat(),
    }
    await db.users.insert_one(user)
    access = set_auth_cookies(response, user["id"], email)
    user.pop("password_hash")
    user.pop("_id", None)
    user["token"] = access
    return user


@api.post("/auth/login")
async def login(data: LoginIn, request: Request, response: Response):
    email = data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempts["locked_until"])
        if now() < locked_until:
            raise HTTPException(429, "Trop de tentatives. Réessayez dans 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (now() + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(401, "Email ou mot de passe incorrect")
    await db.login_attempts.delete_one({"identifier": identifier})
    access = set_auth_cookies(response, user["id"], email)
    user.pop("password_hash")
    user.pop("_id", None)
    user["token"] = access
    return user


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Déconnecté"}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "Pas de jeton de rafraîchissement")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Type de jeton invalide")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Jeton invalide")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(401, "Utilisateur introuvable")
    access = create_access_token(user["id"], user["email"])
    response.set_cookie("access_token", access, httponly=True, secure=True,
                        samesite="none", max_age=43200, path="/")
    return {"token": access}


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotIn):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "Si un compte existe, un lien de réinitialisation a été généré."}
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token, "email": email,
        "expires_at": (now() + timedelta(hours=1)).isoformat(), "used": False,
    })
    link = f"{FRONTEND_URL}/reinitialiser?token={token}"
    try:
        await send_reset_email(email, link)
    except Exception as e:
        logger.error(f"Envoi email reset impossible: {e}")
    return {"message": "Si un compte existe, un email de réinitialisation vient d'être envoyé (valable 1h)."}


@api.post("/auth/reset-password")
async def reset_password(data: ResetIn):
    doc = await db.password_reset_tokens.find_one({"token": data.token})
    if not doc or doc.get("used"):
        raise HTTPException(400, "Lien invalide ou déjà utilisé")
    if now() > datetime.fromisoformat(doc["expires_at"]):
        raise HTTPException(400, "Lien expiré")
    if len(data.new_password) < 6:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 6 caractères")
    await db.users.update_one({"email": doc["email"]},
                              {"$set": {"password_hash": hash_password(data.new_password)}})
    await db.password_reset_tokens.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"message": "Mot de passe mis à jour. Vous pouvez vous connecter."}


# ---------- Emails (proxy Resend géré par Emergent) ----------

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "L'olivier")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: Optional[str] = None):
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to:
        payload["contact_email"] = reply_to
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{EMAIL_BASE_URL}/api/v1/email/send",
            headers={"X-Email-Key": EMAIL_KEY},
            json=payload,
        )
    resp.raise_for_status()
    email_id = resp.json().get("id")
    logger.info(f"Email envoyé à {to} (id={email_id})")
    return email_id


def _fmt_da(n) -> str:
    return f"{float(n):,.0f}".replace(",", " ") + " DA"


def _email_layout(title: str, content: str) -> str:
    brand = escape(EMAIL_FROM_NAME)
    return (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF8F5;padding:32px 0">'
        '<tr><td align="center">'
        '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif">'
        f'<tr><td style="background:#3E4E30;padding:22px 32px"><span style="color:#FAF8F5;font-size:20px;font-weight:bold">{brand}</span></td></tr>'
        f'<tr><td style="padding:32px"><p style="font-size:20px;color:#181C14;font-weight:bold;margin:0 0 16px">{escape(title)}</p>{content}</td></tr>'
        '<tr><td style="padding:20px 32px;background:#F3EFEA;font-size:11px;color:#73786D;line-height:1.6">'
        f'{brand} · 0770777685 / 0560285199 · Ouvert 7j/7 — 24h/24<br/>'
        "Nous ne vous demanderons jamais votre mot de passe ni vos données bancaires par email."
        "</td></tr></table></td></tr></table>"
    )


async def send_order_confirmation_email(order: dict, to: str, name: str):
    ref = order["id"][:8].upper()
    rows = "".join(
        f'<tr><td style="padding:6px 0;font-size:14px;color:#181C14">{escape(it["name"])} × {it["qty"]}</td>'
        f'<td align="right" style="padding:6px 0;font-size:14px;color:#3E4E30;font-weight:bold">{_fmt_da(it["unit_price"] * it["qty"])}</td></tr>'
        for it in order["items"]
    )
    points_html = ""
    if order.get("points_earned"):
        points_html = (
            f'<p style="font-size:13px;color:#3E4E30;background:#EAF0E6;padding:10px 14px;border-radius:10px">'
            f'Membre Privilège : <strong>{order["points_earned"]} points</strong> seront crédités sur votre compte à la livraison.</p>'
        )
    content = (
        f'<p style="font-size:14px;color:#181C14;line-height:1.6">Bonjour {escape(name)},</p>'
        f'<p style="font-size:14px;color:#181C14;line-height:1.6">Votre commande <strong>#{escape(ref)}</strong> est bien confirmée. '
        "Paiement à la livraison — notre équipe vous contactera si besoin.</p>"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0">{rows}</table>'
        f'<p style="font-size:13px;color:#73786D">Livraison {("(" + escape(order["customer"].get("wilaya", "")) + ")") if order["customer"].get("wilaya") else ""} : '
        f'{"<strong>Offerte</strong>" if not order.get("delivery_fee") else _fmt_da(order["delivery_fee"])}</p>'
        f'<p style="font-size:16px;color:#181C14;border-top:1px solid #E2DED6;padding-top:14px">Total : <strong style="color:#3E4E30">{_fmt_da(order["total"])}</strong></p>'
        f'{points_html}'
        f'<p style="font-size:13px;color:#73786D;line-height:1.6">Suivez votre commande depuis '
        f'<a href="{FRONTEND_URL}/compte" style="color:#C86D51;font-weight:bold">votre espace membre</a>.</p>'
    )
    await send_email(to=to, subject=f"Confirmation de votre commande #{ref} — {EMAIL_FROM_NAME}",
                     html=_email_layout("Commande confirmée", content))


async def send_reset_email(to: str, link: str):
    content = (
        '<p style="font-size:14px;color:#181C14;line-height:1.6">Bonjour,</p>'
        f'<p style="font-size:14px;color:#181C14;line-height:1.6">Vous avez demandé la réinitialisation de votre mot de passe {escape(EMAIL_FROM_NAME)}. '
        "Ce lien est valable 1 heure :</p>"
        f'<p style="margin:24px 0"><a href="{link}" style="display:inline-block;background:#3E4E30;color:#FAF8F5;padding:13px 28px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:14px">Réinitialiser mon mot de passe</a></p>'
        '<p style="font-size:12px;color:#73786D;line-height:1.6">Si vous n\'êtes pas à l\'origine de cette demande, ignorez simplement cet email — votre mot de passe reste inchangé.</p>'
    )
    await send_email(to=to, subject=f"Réinitialisation de votre mot de passe — {EMAIL_FROM_NAME}",
                     html=_email_layout("Mot de passe oublié", content))


async def send_admin_order_alert(order: dict):
    s = await db.settings.find_one({"key": "site"}, {"_id": 0})
    notify = ((s or {}).get("delivery") or {}).get("notify_email")
    if not notify:
        return
    ref = order["id"][:8].upper()
    cust = order["customer"]
    rows = "".join(
        f'<tr><td style="padding:5px 0;font-size:13px;color:#181C14">{escape(it["name"])} × {it["qty"]}</td>'
        f'<td align="right" style="padding:5px 0;font-size:13px;color:#3E4E30;font-weight:bold">{_fmt_da(it["unit_price"] * it["qty"])}</td></tr>'
        for it in order["items"]
    )
    content = (
        '<p style="font-size:14px;color:#181C14;line-height:1.6">Une nouvelle commande vient d\'être passée sur le site :</p>'
        f'<p style="font-size:14px;color:#181C14;line-height:1.7">'
        f'<strong>Commande :</strong> #{escape(ref)}<br/>'
        f'<strong>Client :</strong> {escape(cust.get("name", ""))} · {escape(cust.get("phone", ""))}<br/>'
        f'<strong>Livraison :</strong> {escape(cust.get("wilaya", ""))} — {escape(cust.get("address", ""))}</p>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0">{rows}</table>'
        f'<p style="font-size:13px;color:#73786D">Frais de livraison : {"Offerts" if not order.get("delivery_fee") else _fmt_da(order["delivery_fee"])}</p>'
        f'<p style="font-size:16px;color:#181C14;border-top:1px solid #E2DED6;padding-top:12px">Total à encaisser : <strong style="color:#3E4E30">{_fmt_da(order["total"])}</strong></p>'
        f'<p style="font-size:13px"><a href="{FRONTEND_URL}/admin" style="color:#C86D51;font-weight:bold">Ouvrir le back-office pour traiter la commande</a></p>'
    )
    await send_email(to=notify, subject=f"Nouvelle commande #{ref} — {EMAIL_FROM_NAME}",
                     html=_email_layout("Nouvelle commande reçue", content))


# ---------- Products & Categories ----------

@api.get("/products")
async def list_products(category: Optional[str] = None, search: Optional[str] = None,
                        subcategory: Optional[str] = None, featured: Optional[bool] = None):
    q = {}
    if category:
        q["category"] = category
    if subcategory:
        q["subcategory"] = subcategory
    if featured is not None:
        q["featured"] = featured
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    return await db.products.find(q, {"_id": 0}).to_list(500)


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Produit introuvable")
    return p


@api.get("/categories")
async def list_categories():
    order = ["Soins Visage", "Dermatologie", "Hygiène & Corps", "Compléments", "Bébés"]
    cats = await db.products.distinct("category")
    cats = sorted(cats, key=lambda c: order.index(c) if c in order else 99)
    out = []
    for c in cats:
        subs = await db.products.distinct("subcategory", {"category": c, "subcategory": {"$nin": ["", None]}})
        out.append({"name": c, "subcategories": sorted(s for s in subs if s)})
    return out


async def notify_order(order: dict):
    to = None
    if order.get("user_id"):
        user_doc = await db.users.find_one({"id": order["user_id"]})
        to = (user_doc or {}).get("email")
    to = to or order.get("customer", {}).get("email")
    if to:
        try:
            await send_order_confirmation_email(order, to, order["customer"].get("name", ""))
        except Exception as e:
            logger.error(f"Email confirmation commande impossible: {e}")
    try:
        await send_admin_order_alert(order)
    except Exception as e:
        logger.error(f"Email alerte admin impossible: {e}")


async def create_stripe_session(order: dict, origin: str) -> str:
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
        webhook_url=f"{FRONTEND_URL}/api/webhook/stripe",
    )
    req = CheckoutSessionRequest(
        amount=float(order["total"]), currency="dzd",
        success_url=f"{origin}/commande/{order['id']}?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/panier",
        metadata={"order_id": order["id"]},
    )
    session = await stripe_checkout.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "order_id": order["id"],
        "amount": float(order["total"]), "currency": "dzd",
        "status": "initiated", "payment_status": "pending",
        "created_at": now().isoformat(), "updated_at": now().isoformat(),
    })
    await db.orders.update_one({"id": order["id"]}, {"$set": {"stripe_session_id": session.session_id}})
    return session.url


# ---------- Orders ----------

@api.post("/orders")
async def create_order(data: OrderIn, request: Request):
    user = await get_optional_user(request)
    if not data.items:
        raise HTTPException(400, "Le panier est vide")
    items_out = []
    total = 0.0
    for it in data.items:
        p = await db.products.find_one({"id": it.product_id}, {"_id": 0})
        if not p:
            raise HTTPException(404, f"Produit introuvable: {it.product_id}")
        if it.qty < 1:
            raise HTTPException(400, "Quantité invalide")
        if p["stock"] < it.qty:
            raise HTTPException(400, f"Stock insuffisant pour {p['name']}")
        unit = p["member_price"] if user else p["price"]
        total += unit * it.qty
        items_out.append({"product_id": p["id"], "name": p["name"], "image": p.get("image", ""),
                          "unit_price": unit, "qty": it.qty})
    subtotal = round(total, 2)
    dcfg = ((await db.settings.find_one({"key": "site"})) or {}).get("delivery", DEFAULT_DELIVERY)
    w = next((x for x in dcfg.get("wilayas", []) if x["name"] == data.customer.wilaya), None)
    if data.customer.delivery_mode == "relais" and w and w.get("relay_enabled") and data.customer.relay_point:
        fee = w.get("relay_fee", 0)
    else:
        fee = w.get("fee", 0) if w else 0
    threshold = dcfg.get("free_threshold", 0)
    if dcfg.get("free_enabled") and threshold > 0 and subtotal >= threshold:
        fee = 0
    grand_total = round(subtotal + fee, 2)
    points = int(subtotal // 100) if user else 0
    is_card = data.payment_method == "card"
    doc = {
        "id": uid(), "user_id": user["id"] if user else None,
        "customer": data.customer.model_dump(), "items": items_out,
        "subtotal": subtotal, "delivery_fee": fee,
        "total": grand_total, "status": "en_attente",
        "payment": "Carte bancaire (en ligne)" if is_card else "Paiement à la livraison",
        "payment_method": data.payment_method,
        "payment_status": "en_attente" if is_card else "a_la_livraison",
        "points_earned": points, "points_credited": False,
        "created_at": now().isoformat(),
    }
    await db.orders.insert_one(doc)
    for it in data.items:
        await db.products.update_one({"id": it.product_id}, {"$inc": {"stock": -it.qty}})
    doc.pop("_id", None)
    if is_card:
        try:
            doc["checkout_url"] = await create_stripe_session(doc, data.origin_url or FRONTEND_URL)
        except Exception as e:
            logger.error(f"Stripe session impossible: {e}")
            raise HTTPException(502, "Impossible de créer la session de paiement en ligne")
    else:
        await notify_order(doc)
    return doc


@api.get("/orders/my")
async def my_orders(user=Depends(get_current_user)):
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.get("/orders/{order_id}")
async def get_order(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Commande introuvable")
    return o


async def mark_order_paid(order_id: str, session_id: str):
    res = await db.orders.update_one({"id": order_id, "payment_status": {"$ne": "payee"}},
                                     {"$set": {"payment_status": "payee"}})
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "completed", "payment_status": "paid", "updated_at": now().isoformat()}})
    if res.modified_count:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if order:
            await notify_order(order)


@api.get("/orders/{order_id}/payment-status")
async def order_payment_status(order_id: str, session_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order or order.get("stripe_session_id") != session_id:
        raise HTTPException(404, "Transaction introuvable")
    if order.get("payment_status") != "payee":
        try:
            stripe_checkout = StripeCheckout(
                api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
                webhook_url=f"{FRONTEND_URL}/api/webhook/stripe",
            )
            st = await stripe_checkout.get_checkout_status(session_id)
            if st.payment_status == "paid":
                await mark_order_paid(order_id, session_id)
                order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        except Exception as e:
            logger.error(f"Stripe status check impossible: {e}")
    return {"payment_status": order.get("payment_status"), "status": order.get("status"), "total": order.get("total")}


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe_checkout = StripeCheckout(
        api_key=os.environ.get("STRIPE_API_KEY", "sk_test_emergent"),
        webhook_url=f"{FRONTEND_URL}/api/webhook/stripe",
    )
    try:
        wh = await stripe_checkout.handle_webhook(body, sig)
    except Exception:
        raise HTTPException(400, "Signature invalide")
    if wh.event_type == "checkout.session.completed":
        order_id = (wh.metadata or {}).get("order_id")
        if order_id:
            await mark_order_paid(order_id, wh.session_id)
    return {"status": "ok"}


# ---------- Favorites ----------

@api.get("/favorites")
async def list_favorites(user=Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    ids = [f["product_id"] for f in favs]
    products = await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)
    return products


@api.post("/favorites")
async def add_favorite(data: FavoriteIn, user=Depends(get_current_user)):
    if not await db.products.find_one({"id": data.product_id}):
        raise HTTPException(404, "Produit introuvable")
    await db.favorites.update_one(
        {"user_id": user["id"], "product_id": data.product_id},
        {"$setOnInsert": {"user_id": user["id"], "product_id": data.product_id,
                          "created_at": now().isoformat()}},
        upsert=True)
    return {"message": "Ajouté aux favoris"}


@api.delete("/favorites/{product_id}")
async def remove_favorite(product_id: str, user=Depends(get_current_user)):
    await db.favorites.delete_one({"user_id": user["id"], "product_id": product_id})
    return {"message": "Retiré des favoris"}


# ---------- Loyalty ----------

@api.get("/loyalty/config")
async def loyalty_config():
    cfg = await db.loyalty_config.find_one({"key": "loyalty"}, {"_id": 0})
    return cfg


@api.get("/loyalty/me")
async def loyalty_me(user=Depends(get_current_user)):
    cfg = await db.loyalty_config.find_one({"key": "loyalty"}, {"_id": 0})
    points = user.get("points", 0)
    tier = compute_tier(points, cfg["tiers"])
    ordered = sorted(cfg["tiers"], key=lambda t: t["min"])
    idx = [t["key"] for t in ordered].index(tier["key"])
    next_tier = ordered[idx + 1] if idx + 1 < len(ordered) else None
    return {"points": points, "tier": tier, "next_tier": next_tier,
            "points_rule": cfg.get("points_rule", "1 point = 100 DA d'achat")}


# ---------- Chat ----------

WELCOME_MESSAGES = [
    "Bienvenue chez L'olivier. Notre équipe de pharmaciens vous répond 7j/7, 24h/24.",
    "Comment pouvons-nous vous aider aujourd'hui ?",
]


@api.post("/chat/conversations")
async def start_conversation(data: ConvStartIn, request: Request):
    user = await get_optional_user(request)
    q = {"user_id": user["id"]} if user else {"guest_id": data.guest_id}
    if not user and not data.guest_id:
        raise HTTPException(400, "Identifiant invité manquant")
    conv = await db.chat_conversations.find_one(q, {"_id": 0})
    if conv:
        return conv
    conv = {
        "id": uid(), "user_id": user["id"] if user else None,
        "guest_id": None if user else data.guest_id,
        "name": user["name"] if user else (data.name or "Visiteur"),
        "status": "ouverte", "created_at": now().isoformat(),
        "last_message_at": now().isoformat(),
    }
    await db.chat_conversations.insert_one(conv)
    for msg in WELCOME_MESSAGES:
        await db.chat_messages.insert_one({
            "id": uid(), "conversation_id": conv["id"], "sender": "bot",
            "content": msg, "created_at": now().isoformat()})
    conv.pop("_id", None)
    return conv


@api.get("/chat/conversations/{conv_id}/messages")
async def get_messages(conv_id: str):
    return await db.chat_messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api.post("/chat/conversations/{conv_id}/messages")
async def post_message(conv_id: str, data: MessageIn, request: Request):
    conv = await db.chat_conversations.find_one({"id": conv_id})
    if not conv:
        raise HTTPException(404, "Conversation introuvable")
    user = await get_optional_user(request)
    sender = "admin" if (user and user.get("role") == "admin") else "client"
    msg = {"id": uid(), "conversation_id": conv_id, "sender": sender,
           "content": data.content, "created_at": now().isoformat()}
    await db.chat_messages.insert_one(msg)
    await db.chat_conversations.update_one({"id": conv_id},
                                           {"$set": {"last_message_at": now().isoformat()}})
    msg.pop("_id", None)
    return msg


# ---------- Settings (public) ----------

@api.get("/settings/public")
async def public_settings():
    s = await db.settings.find_one({"key": "site"}, {"_id": 0})
    return s


@api.get("/delivery")
async def delivery_public():
    s = await db.settings.find_one({"key": "site"}, {"_id": 0})
    d = (s or {}).get("delivery", DEFAULT_DELIVERY)
    return {
        "free_enabled": d.get("free_enabled", False),
        "free_threshold": d.get("free_threshold", 0),
        "wilayas": d.get("wilayas", []),
    }


# ---------- Admin ----------

@api.get("/admin/settings")
async def get_settings(admin=Depends(get_admin)):
    return await db.settings.find_one({"key": "site"}, {"_id": 0})

@api.get("/admin/stats")
async def admin_stats(admin=Depends(get_admin)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    valid = [o for o in orders if o["status"] != "annulee"]
    revenue = round(sum(o["total"] for o in valid), 2)
    by_status = {}
    for o in orders:
        by_status[o["status"]] = by_status.get(o["status"], 0) + 1
    by_cat = {}
    for o in valid:
        for it in o["items"]:
            p = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
            cat = p["category"] if p else "Autre"
            by_cat[cat] = round(by_cat.get(cat, 0) + it["unit_price"] * it["qty"], 2)
    days = []
    for i in range(6, -1, -1):
        day = (now() - timedelta(days=i)).date().isoformat()
        total = sum(o["total"] for o in valid if o["created_at"][:10] == day)
        days.append({"date": day[5:], "revenue": round(total, 2)})
    low_stock = await db.products.find({"stock": {"$lt": 10}}, {"_id": 0}).to_list(50)
    recent = sorted(orders, key=lambda o: o["created_at"], reverse=True)[:6]
    return {
        "revenue": revenue, "orders_count": len(orders), "by_status": by_status,
        "products_count": await db.products.count_documents({}),
        "clients_count": await db.users.count_documents({"role": "client"}),
        "by_category": [{"category": k, "total": v} for k, v in by_cat.items()],
        "revenue_7d": days, "low_stock": low_stock, "recent_orders": recent,
    }


@api.post("/admin/products")
async def create_product(data: ProductIn, admin=Depends(get_admin)):
    p = data.model_dump()
    p["id"] = uid()
    p["created_at"] = now().isoformat()
    await db.products.insert_one(p)
    p.pop("_id", None)
    return p


@api.put("/admin/products/{product_id}")
async def update_product(product_id: str, data: ProductIn, admin=Depends(get_admin)):
    if not await db.products.find_one({"id": product_id}):
        raise HTTPException(404, "Produit introuvable")
    await db.products.update_one({"id": product_id}, {"$set": data.model_dump()})
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, admin=Depends(get_admin)):
    await db.products.delete_one({"id": product_id})
    return {"message": "Produit supprimé"}


@api.post("/admin/products/bulk")
async def bulk_products(data: BulkIn, admin=Depends(get_admin)):
    if data.action == "delete":
        await db.products.delete_many({"id": {"$in": data.ids}})
    elif data.action == "set_stock":
        await db.products.update_many({"id": {"$in": data.ids}}, {"$set": {"stock": int(data.value or 0)}})
    elif data.action == "apply_discount":
        pct = float(data.value or 0)
        async for p in db.products.find({"id": {"$in": data.ids}}):
            mp = round(p["price"] * (1 - pct / 100), 2)
            await db.products.update_one({"id": p["id"]}, {"$set": {"member_price": mp}})
    elif data.action == "set_featured":
        await db.products.update_many({"id": {"$in": data.ids}}, {"$set": {"featured": bool(data.value)}})
    else:
        raise HTTPException(400, "Action inconnue")
    return {"message": f"{len(data.ids)} produit(s) mis à jour"}


@api.get("/admin/orders")
async def admin_orders(admin=Depends(get_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, data: StatusIn, admin=Depends(get_admin)):
    if data.status not in ORDER_STATUSES:
        raise HTTPException(400, "Statut invalide")
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Commande introuvable")
    updates = {"status": data.status}
    if data.status == "livree" and not order.get("points_credited") and order.get("user_id"):
        await db.users.update_one({"id": order["user_id"]},
                                  {"$inc": {"points": order.get("points_earned", 0)}})
        updates["points_credited"] = True
    await db.orders.update_one({"id": order_id}, {"$set": updates})
    return await db.orders.find_one({"id": order_id}, {"_id": 0})


@api.get("/admin/users")
async def admin_users(admin=Depends(get_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)


@api.post("/admin/users/{user_id}/points")
async def set_points(user_id: str, data: PointsIn, admin=Depends(get_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"points": max(0, data.points)}})
    return {"message": "Points mis à jour"}


@api.put("/admin/loyalty/config")
async def update_loyalty(config: dict, admin=Depends(get_admin)):
    config["key"] = "loyalty"
    await db.loyalty_config.update_one({"key": "loyalty"}, {"$set": config}, upsert=True)
    return await db.loyalty_config.find_one({"key": "loyalty"}, {"_id": 0})


@api.get("/admin/chat/conversations")
async def admin_conversations(admin=Depends(get_admin)):
    convs = await db.chat_conversations.find({}, {"_id": 0}).sort("last_message_at", -1).to_list(200)
    for c in convs:
        last = await db.chat_messages.find({"conversation_id": c["id"]}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
        c["last_message"] = last[0]["content"] if last else ""
    return convs


@api.put("/admin/settings")
async def update_settings(data: dict, admin=Depends(get_admin)):
    data.pop("key", None)
    await db.settings.update_one({"key": "site"}, {"$set": data}, upsert=True)
    return await db.settings.find_one({"key": "site"}, {"_id": 0})


@api.get("/")
async def root():
    return {"message": "L'olivier API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Seed ----------

SEED_PRODUCTS = [
    {"name": "Sérum Anti-Âge à l'Extrait d'Olivier", "category": "Soins Visage", "price": 3490, "member_price": 2790,
     "image": "https://images.unsplash.com/photo-1782521193029-955f4c1c4225?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Sérum concentré à l'extrait de feuille d'olivier. Lisse, raffermit et illumine le teint.", "stock": 42, "featured": True},
    {"name": "Huile Botanique Réparatrice Bio", "category": "Dermatologie", "price": 2850, "member_price": 2280,
     "image": "https://images.unsplash.com/photo-1782687633966-1ceb2a3fdf0f?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Huile sèche bio réparatrice pour peaux fragilisées. Nourrit intensément sans fini gras.", "stock": 35, "featured": True},
    {"name": "Élixir Régénérant Rétinol & Olive", "category": "Soins Visage", "price": 4200, "member_price": 3360,
     "image": "https://images.unsplash.com/photo-1768254636839-9a2d2619c861?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Élixir nuit au rétinol encapsulé et polyphénols d'olive. Régénération cellulaire intensive.", "stock": 18, "featured": True},
    {"name": "Baume Botanique Apaisant Peaux Sensibles", "category": "Dermatologie", "price": 1990, "member_price": 1590,
     "image": "https://images.pexels.com/photos/7796377/pexels-photo-7796377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "description": "Baume SOS apaisant pour rougeurs et irritations. Formule minimaliste hypoallergénique.", "stock": 54, "featured": True},
    {"name": "Soin Purifiant Feuilles d'Olivier & Thé Vert", "category": "Hygiène & Corps", "price": 2400, "member_price": 1920,
     "image": "https://images.unsplash.com/photo-1781948237644-4bb872b37c79?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Gel nettoyant purifiant aux feuilles d'olivier et thé vert. Purifie sans dessécher.", "stock": 61, "featured": True},
    {"name": "Complexe Phytothérapie Vitalité & Immunité", "category": "Compléments", "price": 2250, "member_price": 1800,
     "image": "https://images.unsplash.com/photo-1679570982824-6a230e63025b?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Complexe de plantes et vitamines pour renforcer l'immunité et retrouver énergie.", "stock": 47, "featured": True},
    {"name": "Crème Hydratante Jour Aloe & Olive", "category": "Soins Visage", "price": 1890, "member_price": 1490,
     "image": "https://images.pexels.com/photos/8100779/pexels-photo-8100779.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "description": "Crème jour hydratation 48h à l'aloe vera et huile d'olive bio. Peaux normales à sèches.", "stock": 38, "featured": False},
    {"name": "Gel Lavant Doux Bébé", "category": "Bébés", "price": 1290, "member_price": 990,
     "image": "https://images.pexels.com/photos/7796377/pexels-photo-7796377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
     "description": "Gel lavant surgras pour la peau délicate de bébé. Sans savon, sans parfum allergène.", "stock": 72, "featured": False},
    {"name": "Lait Corps Nourrissant Karité", "category": "Hygiène & Corps", "price": 1590, "member_price": 1270,
     "image": "https://images.unsplash.com/photo-1781948237644-4bb872b37c79?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Lait corps au beurre de karité brut. Nutrition 24h pour peaux sèches.", "stock": 26, "featured": False},
    {"name": "Magnésium Marin + Vitamine B6", "category": "Compléments", "price": 1750, "member_price": 1400,
     "image": "https://images.unsplash.com/photo-1679570982824-6a230e63025b?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Magnésium marin hautement assimilable + B6. Anti-fatigue et équilibre nerveux.", "stock": 83, "featured": False},
    {"name": "Eau Thermale Apaisante Spray", "category": "Dermatologie", "price": 990, "member_price": 790,
     "image": "https://images.unsplash.com/photo-1782687633966-1ceb2a3fdf0f?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Eau thermale apaisante et anti-irritante. Visage et corps, toute la famille.", "stock": 8, "featured": False},
    {"name": "Shampooing Doux Bébé & Olive", "category": "Bébés", "price": 1150, "member_price": 920,
     "image": "https://images.unsplash.com/photo-1782521193029-955f4c1c4225?crop=entropy&cs=srgb&fm=jpg&q=85",
     "description": "Shampooing extra-doux à l'olive pour le cuir chevelu sensible de bébé.", "stock": 44, "featured": False},
]

DEFAULT_SETTINGS = {
    "key": "site",
    "site_name": "L'olivier",
    "theme": {
        "preset": "olive",
        "primary": "#3E4E30",
        "primary_hover": "#2E3B23",
        "primary_pale": "#EAF0E6",
        "accent": "#C86D51",
        "gold": "#D4A359",
    },
    "contact": {
        "phones": ["0770777685", "0560285199"],
        "maps_url": "https://maps.app.goo.gl/G778XwjzYi4cyX8ZA",
        "address_label": "Saïd Hamdine — Voir sur Google Maps",
        "instagram": "https://www.instagram.com/pharmacie_l.olivier_said_hamdi",
        "instagram_handle": "@pharmacie_l.olivier_said_hamdi",
        "hours": "7j/7 — 24h/24",
        "facebook": "", "tiktok": "", "whatsapp": "",
    },
}

DEFAULT_LOYALTY = {
    "key": "loyalty",
    "points_rule": "1 point = 100 DA d'achat (crédités à la livraison)",
    "tiers": [
        {"key": "bronze", "name": "Bronze", "min": 0, "color": "#A87040",
         "gifts": ["Échantillons botaniques offerts à chaque commande"],
         "offers": ["Prix membre sur tout le catalogue"]},
        {"key": "silver", "name": "Silver", "min": 500, "color": "#94A3B8",
         "gifts": ["Trousse découverte L'olivier offerte", "Livraison gratuite"],
         "offers": ["-5% supplémentaires sur les Soins Visage", "Accès aux ventes privées"]},
        {"key": "gold", "name": "Gold", "min": 1500, "color": "#D4A359",
         "gifts": ["Coffret Premium Olive & Rétinol offert", "Consultation conseil personnalisée"],
         "offers": ["-10% supplémentaires sur tout le catalogue", "Livraison express prioritaire", "Cadeau d'anniversaire"]},
    ],
}


DEFAULT_DELIVERY = {
    "notify_email": "",
    "free_enabled": True,
    "free_threshold": 10000,
    "wilayas": [
        {"code": "01", "name": "Adrar", "fee": 900},
        {"code": "02", "name": "Chlef", "fee": 600},
        {"code": "03", "name": "Laghouat", "fee": 800},
        {"code": "04", "name": "Oum El Bouaghi", "fee": 700},
        {"code": "05", "name": "Batna", "fee": 700},
        {"code": "06", "name": "Béjaïa", "fee": 600},
        {"code": "07", "name": "Biskra", "fee": 800},
        {"code": "08", "name": "Béchar", "fee": 900},
        {"code": "09", "name": "Blida", "fee": 500},
        {"code": "10", "name": "Bouira", "fee": 600},
        {"code": "11", "name": "Tamanrasset", "fee": 1200},
        {"code": "12", "name": "Tébessa", "fee": 800},
        {"code": "13", "name": "Tlemcen", "fee": 700},
        {"code": "14", "name": "Tiaret", "fee": 700},
        {"code": "15", "name": "Tizi Ouzou", "fee": 600},
        {"code": "16", "name": "Alger", "fee": 400},
        {"code": "17", "name": "Djelfa", "fee": 800},
        {"code": "18", "name": "Jijel", "fee": 600},
        {"code": "19", "name": "Sétif", "fee": 600},
        {"code": "20", "name": "Saïda", "fee": 700},
        {"code": "21", "name": "Skikda", "fee": 600},
        {"code": "22", "name": "Sidi Bel Abbès", "fee": 700},
        {"code": "23", "name": "Annaba", "fee": 600},
        {"code": "24", "name": "Guelma", "fee": 700},
        {"code": "25", "name": "Constantine", "fee": 600},
        {"code": "26", "name": "Médéa", "fee": 600},
        {"code": "27", "name": "Mostaganem", "fee": 600},
        {"code": "28", "name": "M'Sila", "fee": 700},
        {"code": "29", "name": "Mascara", "fee": 700},
        {"code": "30", "name": "Ouargla", "fee": 900},
        {"code": "31", "name": "Oran", "fee": 600},
        {"code": "32", "name": "El Bayadh", "fee": 900},
        {"code": "33", "name": "Illizi", "fee": 1200},
        {"code": "34", "name": "Bordj Bou Arréridj", "fee": 700},
        {"code": "35", "name": "Boumerdès", "fee": 500},
        {"code": "36", "name": "El Tarf", "fee": 700},
        {"code": "37", "name": "Tindouf", "fee": 1200},
        {"code": "38", "name": "Tissemsilt", "fee": 700},
        {"code": "39", "name": "El Oued", "fee": 900},
        {"code": "40", "name": "Khenchela", "fee": 800},
        {"code": "41", "name": "Souk Ahras", "fee": 700},
        {"code": "42", "name": "Tipaza", "fee": 500},
        {"code": "43", "name": "Mila", "fee": 700},
        {"code": "44", "name": "Aïn Defla", "fee": 600},
        {"code": "45", "name": "Naâma", "fee": 900},
        {"code": "46", "name": "Aïn Témouchent", "fee": 700},
        {"code": "47", "name": "Ghardaïa", "fee": 900},
        {"code": "48", "name": "Relizane", "fee": 700},
        {"code": "49", "name": "Timimoun", "fee": 1100},
        {"code": "50", "name": "Bordj Badji Mokhtar", "fee": 1200},
        {"code": "51", "name": "Ouled Djellal", "fee": 900},
        {"code": "52", "name": "Béni Abbès", "fee": 1100},
        {"code": "53", "name": "In Salah", "fee": 1100},
        {"code": "54", "name": "In Guezzam", "fee": 1200},
        {"code": "55", "name": "Touggourt", "fee": 900},
        {"code": "56", "name": "Djanet", "fee": 1200},
        {"code": "57", "name": "El M'Ghair", "fee": 900},
        {"code": "58", "name": "El Meniaa", "fee": 1000},
    ],
}


async def seed():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.login_attempts.create_index("identifier")

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@lolivier.dz").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": uid(), "name": "Admin L'olivier", "email": admin_email,
            "password_hash": hash_password(admin_password), "phone": "",
            "role": "admin", "points": 0, "created_at": now().isoformat()})
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password)}})

    if not await db.users.find_one({"email": "client@lolivier.dz"}):
        await db.users.insert_one({
            "id": uid(), "name": "Cliente Démo", "email": "client@lolivier.dz",
            "password_hash": hash_password("client123"), "phone": "0550000000",
            "role": "client", "points": 650, "created_at": now().isoformat()})

    if await db.products.count_documents({}) == 0:
        for p in SEED_PRODUCTS:
            doc = dict(p)
            doc["id"] = uid()
            doc["created_at"] = now().isoformat()
            await db.products.insert_one(doc)

    if not await db.settings.find_one({"key": "site"}):
        await db.settings.insert_one(DEFAULT_SETTINGS)
    await db.settings.update_one({"key": "site", "delivery": {"$exists": False}},
                                 {"$set": {"delivery": DEFAULT_DELIVERY}})

    subcats = {
        "Sérum Anti-Âge à l'Extrait d'Olivier": "Sérums",
        "Huile Botanique Réparatrice Bio": "Huiles & Baumes",
        "Élixir Régénérant Rétinol & Olive": "Sérums",
        "Baume Botanique Apaisant Peaux Sensibles": "Huiles & Baumes",
        "Soin Purifiant Feuilles d'Olivier & Thé Vert": "Gels & Nettoyants",
        "Complexe Phytothérapie Vitalité & Immunité": "Immunité",
        "Crème Hydratante Jour Aloe & Olive": "Crèmes",
        "Gel Lavant Doux Bébé": "Toilette bébé",
        "Lait Corps Nourrissant Karité": "Laits & Crèmes corps",
        "Magnésium Marin + Vitamine B6": "Anti-fatigue",
        "Eau Thermale Apaisante Spray": "Eaux & Sprays",
        "Shampooing Doux Bébé & Olive": "Toilette bébé",
    }
    async for p in db.products.find({"subcategory": {"$exists": False}}):
        if p["name"] in subcats:
            await db.products.update_one({"id": p["id"]}, {"$set": {"subcategory": subcats[p["name"]]}})

    s = await db.settings.find_one({"key": "site"})
    if s and s.get("delivery"):
        changed = False
        for w in s["delivery"].get("wilayas", []):
            for field, default in [("cities", []), ("relay_enabled", False), ("relay_fee", 0), ("relay_points", [])]:
                if field not in w:
                    w[field] = default
                    changed = True
            if w["name"] == "Alger" and not w.get("relay_points"):
                w["cities"] = ["Saïd Hamdine", "Bir Mourad Raïs", "Alger Centre", "Hydra", "El Biar", "Kouba", "Bab Ezzouar", "Draria"]
                w["relay_enabled"] = True
                w["relay_fee"] = 200
                w["relay_points"] = ["Pharmacie L'olivier — Saïd Hamdine (retrait boutique)",
                                     "Point relais Bab Ezzouar — Centre commercial",
                                     "Point relais Hydra — Rue des Frères"]
                changed = True
        if changed:
            await db.settings.update_one({"key": "site"}, {"$set": {"delivery": s["delivery"]}})

    if not await db.loyalty_config.find_one({"key": "loyalty"}):
        await db.loyalty_config.insert_one(DEFAULT_LOYALTY)
    logger.info("Seed terminé")


@app.on_event("startup")
async def startup():
    await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
