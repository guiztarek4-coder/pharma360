import os
import uuid
import secrets
import jwt
import bcrypt
import asyncio
import logging
import requests
from pathlib import Path
from typing import List, Optional, Annotated
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Query, Header
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from bson import ObjectId

# ----------------------------------------------------------------------------
# Setup
# ----------------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
APP_NAME = "pharma360"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("pharma360")

app = FastAPI(title="Pharma360 API")
api = APIRouter(prefix="/api")

# ----------------------------------------------------------------------------
# Mongo helpers
# ----------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def now_utc():
    return datetime.now(timezone.utc)


def clean(doc):
    """Convert a mongo doc into a JSON-safe dict (str id, no raw ObjectId)."""
    if not doc:
        return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


# ----------------------------------------------------------------------------
# Auth utilities
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


async def get_admin_user(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès administrateur requis")
    return user


# ----------------------------------------------------------------------------
# Object storage
# ----------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key = None


def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                            headers={"X-Storage-Key": key, "Content-Type": content_type},
                            data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ----------------------------------------------------------------------------
# Models
# ----------------------------------------------------------------------------
class RegisterInput(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    referral_code: Optional[str] = None


class LoginInput(BaseModel):
    identifier: str
    password: str


class Address(BaseModel):
    label: str = "Domicile"
    full_name: str
    phone: str
    wilaya: str
    commune: str = ""
    street: str


class ProductInput(BaseModel):
    name: str
    brand: str = ""
    category: str = ""
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    description: str = ""
    price: float
    old_price: Optional[float] = None
    stock: int = 0
    images: List[str] = []
    badge: Optional[str] = None
    is_featured: bool = False
    is_new: bool = False
    need: Optional[str] = None
    complementary_ids: List[str] = []


class BrandInput(BaseModel):
    name: str
    logo: Optional[str] = None
    description: str = ""


class BlogInput(BaseModel):
    title: str
    excerpt: str = ""
    content: str = ""
    image: Optional[str] = None
    author: str = "Équipe Pharma360"


class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image: Optional[str] = None
    ecard: Optional[dict] = None  # {delivery, recipient_email, message, scheduled_date}


class OrderInput(BaseModel):
    items: List[OrderItem]
    full_name: str
    phone: str
    email: Optional[str] = None
    wilaya: str
    commune: str = ""
    agency: str = ""
    street: str = ""
    payment_method: str  # "cod" | "baridimob" | "card"
    delivery_method: str = "domicile"  # "pickup" | "domicile" | "relais"
    promo_code: str = ""
    giftcard_code: str = ""
    gift_code: str = ""
    notes: str = ""


class WilayaFee(BaseModel):
    name: str
    fee: float = 0


class WilayaInput(BaseModel):
    name: str
    code: str = ""
    base_fee: float = 0
    cities: List[WilayaFee] = []
    agencies: List[WilayaFee] = []
    order: int = 100


class ForgotPasswordInput(BaseModel):
    email: str


class ResetPasswordInput(BaseModel):
    token: str
    password: str


class ProductInputExtra(BaseModel):
    subcategory: Optional[str] = None


class CategoryInput(BaseModel):
    label: str
    icon: str = "Tag"
    image: Optional[str] = None
    parent_id: Optional[str] = None
    order: int = 100
    banner_image: Optional[str] = None
    banner_title: Optional[str] = None
    banner_subtitle: Optional[str] = None
    banner_cta_label: Optional[str] = None
    banner_cta_link: Optional[str] = None


class ReorderInput(BaseModel):
    ids: List[str]


class PromoInput(BaseModel):
    code: str
    type: str = "percent"  # "percent" | "fixed"
    value: float = 0
    active: bool = True


class ContactInput(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str


WILAYAS = [
    "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
    "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
    "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla",
    "Oran","El Bayadh","Illizi","Bordj Bou Arréridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela",
    "Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane",
]
WILAYA_DELIVERY = 500  # default flat delivery fee in DA


def slugify(text: str) -> str:
    import re, unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or uuid.uuid4().hex[:8]


def send_order_email(order: dict, sender: str = None, to: str = None):
    """Send order notification email to shop owner (non-fatal)."""
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        return
    try:
        import resend
        resend.api_key = api_key
        sender = sender or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        to = to or os.environ.get("ORDER_EMAIL_TO") or os.environ.get("ADMIN_EMAIL", "pharma360benak@gmail.com")
        rows = "".join(
            f"<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'>{i['quantity']}× {i['name']}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>{int(i['price']*i['quantity'])} DA</td></tr>"
            for i in order["items"]
        )
        html = f"""
        <div style='font-family:Arial,sans-serif;max-width:560px;margin:auto'>
          <h2 style='color:#059669'>🛒 Nouvelle commande Pharma360</h2>
          <p><b>Client :</b> {order['full_name']} — {order['phone']}</p>
          <p><b>Livraison :</b> {order.get('delivery_method')} · {order['wilaya']} {order.get('commune','')} {order.get('street','')}</p>
          <p><b>Paiement :</b> {order['payment_method']}</p>
          <table style='width:100%;border-collapse:collapse;margin:12px 0'>{rows}</table>
          <p style='text-align:right'>Sous-total : {int(order['subtotal'])} DA<br/>
          Livraison : {int(order['delivery'])} DA<br/>
          Remise : {int(order.get('discount',0))} DA<br/>
          <b style='font-size:18px;color:#059669'>Total : {int(order['total'])} DA</b></p>
        </div>"""
        resend.Emails.send({"from": sender, "to": [to], "subject": "Nouvelle commande Pharma360", "html": html})
    except Exception as e:
        logger.error(f"Email send failed: {e}")


def send_customer_email(order: dict, sender: str = None):
    """Send order confirmation email to the customer (non-fatal, needs verified domain)."""
    api_key = os.environ.get("RESEND_API_KEY")
    to = order.get("email")
    if not api_key or not to:
        return
    try:
        import resend
        resend.api_key = api_key
        sender = sender or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        ref = str(order.get("_id", ""))[-8:].upper()
        rows = "".join(
            f"<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'>{i['quantity']}× {i['name']}</td>"
            f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right'>{int(i['price']*i['quantity'])} DA</td></tr>"
            for i in order["items"]
        )
        html = f"""
        <div style='font-family:Arial,sans-serif;max-width:560px;margin:auto'>
          <h2 style='color:#059669'>Merci pour votre commande Pharma360 !</h2>
          <p>Bonjour {order['full_name']}, votre commande <b>#{ref}</b> a bien été enregistrée.</p>
          <table style='width:100%;border-collapse:collapse;margin:12px 0'>{rows}</table>
          <p style='text-align:right'>Livraison : {int(order['delivery'])} DA<br/>
          <b style='font-size:18px;color:#059669'>Total : {int(order['total'])} DA</b></p>
          <p>Nous vous contacterons bientôt pour la livraison. Merci de votre confiance !</p>
        </div>"""
        resend.Emails.send({"from": sender, "to": [to], "subject": f"Confirmation de votre commande #{ref} - Pharma360", "html": html})
    except Exception as e:
        logger.error(f"Customer email failed: {e}")


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
async def _gen_referral_code() -> str:
    import string
    alphabet = string.ascii_uppercase + string.digits
    for _ in range(10):
        code = "P360-" + "".join(secrets.choice(alphabet) for _ in range(6))
        if not await db.users.find_one({"referral_code": code}):
            return code
    return "P360-" + secrets.token_hex(4).upper()


@api.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Un email ou un numéro de téléphone est requis")
    email = data.email.lower().strip() if data.email else None
    phone = data.phone.strip() if data.phone else None
    if email and await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    if phone and await db.users.find_one({"phone": phone}):
        raise HTTPException(status_code=400, detail="Ce numéro est déjà utilisé")
    # referral handling
    s = await db.settings.find_one({"_id": "site"}) or {}
    referrer = None
    referee_bonus = 0
    if data.referral_code and s.get("referral_enabled", True):
        code = data.referral_code.strip().upper()
        referrer = await db.users.find_one({"referral_code": code})
        if referrer:
            referee_bonus = int(s.get("referral_referee_points", 100))
    doc = {
        "first_name": data.first_name.strip(),
        "last_name": data.last_name.strip(),
        "password_hash": hash_password(data.password),
        "role": "customer",
        "addresses": [],
        "loyalty_points": referee_bonus,
        "loyalty_lifetime": referee_bonus,
        "referral_code": await _gen_referral_code(),
        "referred_by": str(referrer["_id"]) if referrer else None,
        "created_at": now_utc().isoformat(),
    }
    if email:
        doc["email"] = email
    if phone:
        doc["phone"] = phone
    res = await db.users.insert_one(doc)
    # credit the referrer
    if referrer:
        bonus = int(s.get("referral_referrer_points", 200))
        await db.users.update_one({"_id": referrer["_id"]},
                                  {"$inc": {"loyalty_points": bonus, "loyalty_lifetime": bonus}})
        await db.notifications.insert_one({
            "type": "referral",
            "message": f"Parrainage : {doc['first_name']} s'est inscrit avec le code de {referrer.get('first_name','')} (+{bonus} pts)",
            "read": False, "created_at": now_utc().isoformat(),
        })
    token = create_access_token(str(res.inserted_id))
    set_auth_cookie(response, token)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.post("/auth/login")
async def login(data: LoginInput, response: Response):
    ident = data.identifier.lower().strip()
    user = await db.users.find_one({"$or": [{"email": ident}, {"phone": data.identifier.strip()}]})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    token = create_access_token(str(user["_id"]))
    set_auth_cookie(response, token)
    return clean(user)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean(user)


def send_reset_email(to: str, link: str, sender: str = None):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY missing; reset link: %s", link)
        return
    try:
        import resend
        resend.api_key = api_key
        sender = sender or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
          <h2 style="color:#059669">Réinitialisation de votre mot de passe</h2>
          <p>Vous avez demandé à réinitialiser votre mot de passe Pharma360. Cliquez sur le bouton ci-dessous (lien valable 1 heure) :</p>
          <p style="text-align:center;margin:28px 0">
            <a href="{link}" style="background:#059669;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:bold">Créer un nouveau mot de passe</a>
          </p>
          <p style="font-size:12px;color:#64748b">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>"""
        resend.Emails.send({"from": sender, "to": [to], "subject": "Réinitialisation de votre mot de passe - Pharma360", "html": html})
    except Exception as e:
        logger.error("send_reset_email failed: %s", e)


def send_chat_email(to: str, name: str, text: str, sender: str = None):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key or not to:
        logger.warning("Chat email skipped (no key or recipient)")
        return
    try:
        import resend
        resend.api_key = api_key
        sender = sender or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
          <h2 style="color:#059669">Nouveau message sur le chat Pharma360</h2>
          <p><b>{name}</b> vient de démarrer une discussion :</p>
          <blockquote style="border-left:3px solid #059669;padding:8px 14px;color:#334155;background:#f0fdf4">{text}</blockquote>
          <p style="font-size:13px;color:#64748b">Connectez-vous à votre espace admin (onglet « Chat ») pour répondre.</p>
        </div>"""
        resend.Emails.send({"from": sender, "to": [to], "subject": f"Nouveau message chat de {name} - Pharma360", "html": html})
    except Exception as e:
        logger.error("send_chat_email failed: %s", e)


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordInput, request: Request):
    email = data.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token, "user_id": str(user["_id"]),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False, "created_at": now_utc().isoformat(),
        })
        origin = request.headers.get("origin") or os.environ.get("PUBLIC_URL", "")
        link = f"{origin}/reset-password?token={token}"
        s = await db.settings.find_one({"_id": "site"}) or {}
        sender = s.get("sender_email") or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        send_reset_email(email, link, sender)
    # Never reveal whether the email exists
    return {"ok": True, "message": "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé par email."}


@api.post("/auth/reset-password")
async def reset_password(data: ResetPasswordInput):
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    doc = await db.password_reset_tokens.find_one({"token": data.token})
    if not doc or doc.get("used"):
        raise HTTPException(status_code=400, detail="Lien invalide ou déjà utilisé")
    expires = doc.get("expires_at")
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires and expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Ce lien a expiré, veuillez refaire une demande")
    await db.users.update_one({"_id": ObjectId(doc["user_id"])}, {"$set": {"password_hash": hash_password(data.password)}})
    await db.password_reset_tokens.update_one({"_id": doc["_id"]}, {"$set": {"used": True}})
    return {"ok": True, "message": "Mot de passe réinitialisé avec succès"}


# ----------------------------------------------------------------------------
# Address routes
# ----------------------------------------------------------------------------
@api.get("/account/addresses")
async def get_addresses(user: dict = Depends(get_current_user)):
    return user.get("addresses", [])


@api.post("/account/addresses")
async def add_address(addr: Address, user: dict = Depends(get_current_user)):
    addresses = user.get("addresses", [])
    entry = addr.model_dump()
    entry["id"] = str(uuid.uuid4())
    addresses.append(entry)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"addresses": addresses}})
    return addresses


@api.delete("/account/addresses/{addr_id}")
async def delete_address(addr_id: str, user: dict = Depends(get_current_user)):
    addresses = [a for a in user.get("addresses", []) if a.get("id") != addr_id]
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"addresses": addresses}})
    return addresses


# ----------------------------------------------------------------------------
# Favorites routes
# ----------------------------------------------------------------------------
@api.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    ids = [i for i in (user.get("favorites") or []) if ObjectId.is_valid(i)]
    if not ids:
        return []
    docs = await db.products.find({"_id": {"$in": [ObjectId(i) for i in ids]}}).to_list(200)
    order = {i: k for k, i in enumerate(ids)}
    docs.sort(key=lambda d: order.get(str(d["_id"]), 99))
    return [clean(d) for d in docs]


@api.post("/favorites/{product_id}")
async def add_favorite(product_id: str, user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Produit introuvable")
    await db.users.update_one({"_id": user["_id"]}, {"$addToSet": {"favorites": product_id}})
    u = await db.users.find_one({"_id": user["_id"]})
    return {"favorites": u.get("favorites", [])}


@api.delete("/favorites/{product_id}")
async def remove_favorite(product_id: str, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": user["_id"]}, {"$pull": {"favorites": product_id}})
    u = await db.users.find_one({"_id": user["_id"]})
    return {"favorites": u.get("favorites", [])}


# ----------------------------------------------------------------------------
# Product routes
# ----------------------------------------------------------------------------
async def _descendant_ids(cat_id: str):
    """Return the category id plus all descendant ids (as strings)."""
    ids = [cat_id]
    frontier = [cat_id]
    while frontier:
        children = await db.categories.find({"parent_id": {"$in": frontier}}).to_list(2000)
        cids = [str(c["_id"]) for c in children]
        ids.extend(cids)
        frontier = cids
    return ids



@api.get("/products")
async def list_products(
    category: Optional[str] = None,
    category_id: Optional[str] = None,
    subcategory: Optional[str] = None,
    brand: Optional[str] = None,
    search: Optional[str] = None,
    need: Optional[str] = None,
    featured: Optional[bool] = None,
    is_new: Optional[bool] = None,
    on_promo: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "recent",
    limit: int = 100,
):
    q = {}
    if category:
        q["category"] = category
    if category_id:
        ids = await _descendant_ids(category_id)
        q["category_id"] = {"$in": ids} if len(ids) > 1 else category_id
    if subcategory:
        q["subcategory"] = subcategory
    if brand:
        q["brand"] = brand
    if need:
        q["need"] = need
    if featured is not None:
        q["is_featured"] = featured
    if is_new is not None:
        q["is_new"] = is_new
    if on_promo:
        q["old_price"] = {"$ne": None, "$gt": 0}
    if search:
        terms = [t for t in search.split() if t]
        q["$and"] = [{"$or": [
            {"name": {"$regex": t, "$options": "i"}},
            {"brand": {"$regex": t, "$options": "i"}},
            {"category": {"$regex": t, "$options": "i"}},
            {"description": {"$regex": t, "$options": "i"}},
        ]} for t in terms] or [{}]
    price_q = {}
    if min_price is not None:
        price_q["$gte"] = min_price
    if max_price is not None:
        price_q["$lte"] = max_price
    if price_q:
        q["price"] = price_q

    sort_map = {
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "name": [("name", 1)],
        "recent": [("created_at", -1)],
    }
    cursor = db.products.find(q).sort(sort_map.get(sort, [("created_at", -1)])).limit(limit)
    return [clean(d) for d in await cursor.to_list(limit)]


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=404, detail="Produit introuvable")
    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return clean(doc)


@api.get("/products/{product_id}/complementary")
async def product_complementary(product_id: str):
    if not ObjectId.is_valid(product_id):
        return []
    p = await db.products.find_one({"_id": ObjectId(product_id)})
    if not p:
        return []
    ids = [i for i in (p.get("complementary_ids") or []) if ObjectId.is_valid(i)]
    if not ids:
        return []
    docs = await db.products.find({"_id": {"$in": [ObjectId(i) for i in ids]}}).to_list(20)
    order = {i: k for k, i in enumerate(ids)}
    docs.sort(key=lambda d: order.get(str(d["_id"]), 99))
    return [clean(d) for d in docs]


@api.get("/search/suggestions")
async def search_suggestions(q: str = Query(...)):
    if len(q) < 2:
        return {"products": [], "brands": []}
    cursor = db.products.find(
        {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"brand": {"$regex": q, "$options": "i"}}]}
    ).limit(6)
    products = [clean(d) for d in await cursor.to_list(6)]
    brands = await db.brands.distinct("name", {"name": {"$regex": q, "$options": "i"}})
    return {"products": products, "brands": brands[:5]}


@api.post("/products")
async def create_product(data: ProductInput, admin: dict = Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = now_utc().isoformat()
    res = await db.products.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductInput, admin: dict = Depends(get_admin_user)):
    await db.products.update_one({"_id": ObjectId(product_id)}, {"$set": data.model_dump()})
    doc = await db.products.find_one({"_id": ObjectId(product_id)})
    return clean(doc)


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    await db.products.delete_one({"_id": ObjectId(product_id)})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Categories (3-level tree)
# ----------------------------------------------------------------------------
MAX_LEVEL = 2  # 3 levels: 0 (main) -> 1 (sub) -> 2 (sub-sub)


def _cat_public(doc):
    return {
        "id": str(doc["_id"]),
        "slug": doc.get("slug"),
        "label": doc["label"],
        "image": doc.get("image"),
        "icon": doc.get("icon", "Tag"),
        "order": doc.get("order", 100),
        "level": doc.get("level", 0),
        "parent_id": doc.get("parent_id"),
        "banner_image": doc.get("banner_image"),
        "banner_title": doc.get("banner_title"),
        "banner_subtitle": doc.get("banner_subtitle"),
        "banner_cta_label": doc.get("banner_cta_label"),
        "banner_cta_link": doc.get("banner_cta_link"),
    }


def _build_tree(docs, parent_id=None):
    nodes = [d for d in docs if d.get("parent_id") == parent_id]
    nodes.sort(key=lambda d: (d.get("order", 100), d.get("label", "")))
    result = []
    for d in nodes:
        node = _cat_public(d)
        node["children"] = _build_tree(docs, str(d["_id"]))
        result.append(node)
    return result


@api.get("/categories")
async def get_categories():
    docs = await db.categories.find().to_list(2000)
    return _build_tree(docs, None)


@api.get("/categories/{cat_id}")
async def get_category(cat_id: str):
    if not ObjectId.is_valid(cat_id):
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    doc = await db.categories.find_one({"_id": ObjectId(cat_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Catégorie introuvable")
    ancestors = []
    p = doc.get("parent_id")
    while p and ObjectId.is_valid(p):
        pa = await db.categories.find_one({"_id": ObjectId(p)})
        if not pa:
            break
        ancestors.insert(0, _cat_public(pa))
        p = pa.get("parent_id")
    all_docs = await db.categories.find().to_list(2000)
    children = _build_tree(all_docs, str(doc["_id"]))
    return {"category": _cat_public(doc), "ancestors": ancestors, "children": children}


@api.post("/categories")
async def create_category(data: CategoryInput, admin: dict = Depends(get_admin_user)):
    level = 0
    if data.parent_id:
        if not ObjectId.is_valid(data.parent_id):
            raise HTTPException(status_code=400, detail="Parent invalide")
        parent = await db.categories.find_one({"_id": ObjectId(data.parent_id)})
        if not parent:
            raise HTTPException(status_code=404, detail="Catégorie parente introuvable")
        level = parent.get("level", 0) + 1
        if level > MAX_LEVEL:
            raise HTTPException(status_code=400, detail="Profondeur maximale de 3 niveaux atteinte")
    slug = slugify(data.label)
    if await db.categories.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    doc = {"slug": slug, "label": data.label, "icon": data.icon, "image": data.image,
           "parent_id": data.parent_id, "level": level, "order": data.order,
           "banner_image": data.banner_image, "banner_title": data.banner_title,
           "banner_subtitle": data.banner_subtitle, "banner_cta_label": data.banner_cta_label,
           "banner_cta_link": data.banner_cta_link,
           "created_at": now_utc().isoformat()}
    res = await db.categories.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _cat_public(doc)


@api.put("/categories/reorder")
async def reorder_categories(data: ReorderInput, admin: dict = Depends(get_admin_user)):
    for idx, cid in enumerate(data.ids):
        if ObjectId.is_valid(cid):
            await db.categories.update_one({"_id": ObjectId(cid)}, {"$set": {"order": idx}})
    return {"ok": True}


@api.put("/categories/{cat_id}")
async def update_category(cat_id: str, data: CategoryInput, admin: dict = Depends(get_admin_user)):
    await db.categories.update_one(
        {"_id": ObjectId(cat_id)},
        {"$set": {"label": data.label, "icon": data.icon, "image": data.image, "order": data.order,
                  "banner_image": data.banner_image, "banner_title": data.banner_title,
                  "banner_subtitle": data.banner_subtitle, "banner_cta_label": data.banner_cta_label,
                  "banner_cta_link": data.banner_cta_link}})
    doc = await db.categories.find_one({"_id": ObjectId(cat_id)})
    return _cat_public(doc)


@api.delete("/categories/{cat_id}")
async def delete_category(cat_id: str, admin: dict = Depends(get_admin_user)):
    to_delete = [cat_id]
    frontier = [cat_id]
    while frontier:
        children = await db.categories.find({"parent_id": {"$in": frontier}}).to_list(2000)
        ids = [str(c["_id"]) for c in children]
        to_delete.extend(ids)
        frontier = ids
    obj_ids = [ObjectId(i) for i in to_delete if ObjectId.is_valid(i)]
    await db.categories.delete_many({"_id": {"$in": obj_ids}})
    await db.products.update_many({"category_id": {"$in": to_delete}}, {"$set": {"category_id": None}})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Bulk import (CSV / Excel) — categories & products
# ----------------------------------------------------------------------------
def _pick(row, *names):
    for n in names:
        for k in row:
            if str(k).strip().lower() == n.lower():
                v = row[k]
                return "" if v is None else str(v).strip()
    return ""


def _truthy(v):
    return str(v).strip().lower() in ("oui", "yes", "true", "1", "x", "vrai")


async def _read_rows(file: UploadFile):
    import io
    import pandas as pd
    content = await file.read()
    name = (file.filename or "").lower()
    if name.endswith(".xlsx") or name.endswith(".xls"):
        df = pd.read_excel(io.BytesIO(content), dtype=str)
    else:
        df = pd.read_csv(io.BytesIO(content), dtype=str)
        if len(df.columns) <= 1:  # likely semicolon-separated
            df = pd.read_csv(io.BytesIO(content), dtype=str, sep=";")
    df = df.fillna("")
    df.columns = [str(c).strip() for c in df.columns]
    return df.to_dict("records")


async def _upsert_cat(label, parent_id, level, image=None):
    label = (label or "").strip()
    if not label:
        return None, False
    doc = await db.categories.find_one({"label": label, "parent_id": parent_id})
    if doc:
        if image and not doc.get("image"):
            await db.categories.update_one({"_id": doc["_id"]}, {"$set": {"image": image}})
        return str(doc["_id"]), False
    slug = slugify(label)
    if await db.categories.find_one({"slug": slug}):
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
    order = await db.categories.count_documents({"parent_id": parent_id})
    doc = {"slug": slug, "label": label, "icon": "Tag", "image": image or None,
           "parent_id": parent_id, "level": level, "order": order,
           "created_at": now_utc().isoformat()}
    res = await db.categories.insert_one(doc)
    return str(res.inserted_id), True


@api.post("/admin/import/categories")
async def import_categories(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    try:
        rows = await _read_rows(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fichier illisible: {e}")
    created = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            main = _pick(row, "Catégorie", "Categorie", "Category", "Niveau 1", "main")
            sub = _pick(row, "Sous-catégorie", "Sous-categorie", "Subcategory", "Niveau 2", "sub")
            subsub = _pick(row, "Sous-sous-catégorie", "Sous-sous-categorie", "Niveau 3", "subsub")
            img1 = _pick(row, "Image catégorie", "Image categorie", "Image 1")
            img2 = _pick(row, "Image sous-catégorie", "Image sous-categorie", "Image 2")
            img3 = _pick(row, "Image sous-sous-catégorie", "Image sous-sous-categorie", "Image 3")
            if not main:
                continue
            mid, c1 = await _upsert_cat(main, None, 0, img1)
            created += 1 if c1 else 0
            if sub:
                sid, c2 = await _upsert_cat(sub, mid, 1, img2)
                created += 1 if c2 else 0
                if subsub:
                    _, c3 = await _upsert_cat(subsub, sid, 2, img3)
                    created += 1 if c3 else 0
        except Exception as e:
            errors.append({"row": i + 2, "message": str(e)})
    return {"created": created, "errors": errors}


async def _resolve_path(path_str):
    import re
    labels = [p.strip() for p in re.split(r"[>/›|]", path_str or "") if p.strip()]
    if not labels:
        return None, "chemin de catégorie vide"
    parent = None
    node = None
    for lab in labels:
        node = await db.categories.find_one({"label": lab, "parent_id": parent})
        if not node:
            return None, f"catégorie introuvable dans le chemin: « {lab} »"
        parent = str(node["_id"])
    if await db.categories.count_documents({"parent_id": str(node["_id"])}) > 0:
        return None, "le chemin doit pointer vers la catégorie la plus profonde (sans sous-catégorie)"
    return node, None


@api.post("/admin/import/products")
async def import_products(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    try:
        rows = await _read_rows(file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fichier illisible: {e}")
    created = 0
    errors = []
    for i, row in enumerate(rows):
        try:
            name = _pick(row, "Nom", "Name", "Produit")
            if not name:
                continue
            path = _pick(row, "Chemin catégorie", "Chemin categorie", "Catégorie", "Categorie", "Category path", "category_path")
            node, err = await _resolve_path(path)
            if err:
                errors.append({"row": i + 2, "message": f"« {name} » — {err}"})
                continue
            price_raw = _pick(row, "Prix", "Price").replace(" ", "").replace(",", ".")
            old_raw = _pick(row, "Ancien prix", "Old price", "old_price").replace(" ", "").replace(",", ".")
            stock_raw = _pick(row, "Stock", "Quantité", "Quantite")
            doc = {
                "name": name,
                "brand": _pick(row, "Marque", "Brand"),
                "category": node["slug"], "category_id": str(node["_id"]), "subcategory": None,
                "description": _pick(row, "Description"),
                "price": float(price_raw) if price_raw else 0.0,
                "old_price": float(old_raw) if old_raw else None,
                "stock": int(float(stock_raw)) if stock_raw else 0,
                "images": [x for x in [_pick(row, "Image", "Image URL", "Photo")] if x],
                "badge": _pick(row, "Badge") or None,
                "is_featured": _truthy(_pick(row, "Coup de coeur", "Coup de cœur", "featured")),
                "is_new": _truthy(_pick(row, "Nouveau", "Nouveauté", "new")),
                "need": None,
                "created_at": now_utc().isoformat(),
            }
            await db.products.insert_one(doc)
            created += 1
        except Exception as e:
            errors.append({"row": i + 2, "message": str(e)})
    return {"created": created, "errors": errors}


def _make_file(columns, sample_rows, fmt):
    import io
    import pandas as pd
    df = pd.DataFrame(sample_rows, columns=columns)
    buf = io.BytesIO()
    if fmt == "xlsx":
        df.to_excel(buf, index=False, engine="openpyxl")
        ct = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    else:
        buf.write("\ufeff".encode("utf-8"))  # BOM for Excel accents
        buf.write(df.to_csv(index=False).encode("utf-8"))
        ct = "text/csv; charset=utf-8"
        ext = "csv"
    buf.seek(0)
    return buf.read(), ct, ext


@api.get("/admin/import/template/categories")
async def template_categories(format: str = "csv", admin: dict = Depends(get_admin_user)):
    cols = ["Catégorie", "Sous-catégorie", "Sous-sous-catégorie",
            "Image catégorie", "Image sous-catégorie", "Image sous-sous-catégorie"]
    sample = [
        ["Visage", "Soins Hydratants", "Crèmes de jour", "https://…/visage.jpg", "https://…/hydratant.jpg", "https://…/creme.jpg"],
        ["Visage", "Soins Hydratants", "Sérums hydratants", "", "", ""],
        ["Cheveux", "Shampooings", "Anti-chute", "", "", ""],
    ]
    data, ct, ext = _make_file(cols, sample, "xlsx" if format == "xlsx" else "csv")
    return FastResponse(content=data, media_type=ct,
                        headers={"Content-Disposition": f"attachment; filename=modele_categories.{ext}"})


@api.get("/admin/import/template/products")
async def template_products(format: str = "csv", admin: dict = Depends(get_admin_user)):
    cols = ["Nom", "Marque", "Chemin catégorie", "Prix", "Ancien prix", "Stock",
            "Description", "Image", "Badge", "Coup de coeur", "Nouveau"]
    sample = [
        ["CeraVe Crème Hydratante", "CeraVe", "Visage > Soins Hydratants > Crèmes de jour",
         "2450", "2900", "40", "Crème hydratante visage", "https://…/produit.jpg", "PROMO", "oui", "non"],
        ["Vichy Shampooing", "Vichy", "Cheveux > Shampooings > Anti-chute",
         "2750", "", "30", "Shampooing anti-chute", "", "", "non", "oui"],
    ]
    data, ct, ext = _make_file(cols, sample, "xlsx" if format == "xlsx" else "csv")
    return FastResponse(content=data, media_type=ct,
                        headers={"Content-Disposition": f"attachment; filename=modele_produits.{ext}"})



# Promo codes
@api.get("/promo-codes")
async def list_promo(admin: dict = Depends(get_admin_user)):
    return [clean(d) for d in await db.promo_codes.find().sort("created_at", -1).to_list(200)]


@api.post("/promo-codes")
async def create_promo(data: PromoInput, admin: dict = Depends(get_admin_user)):
    doc = {"code": data.code.strip().upper(), "type": data.type, "value": data.value,
           "active": data.active, "created_at": now_utc().isoformat()}
    res = await db.promo_codes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/promo-codes/{promo_id}")
async def update_promo(promo_id: str, data: PromoInput, admin: dict = Depends(get_admin_user)):
    await db.promo_codes.update_one({"_id": ObjectId(promo_id)},
                                    {"$set": {"code": data.code.strip().upper(), "type": data.type, "value": data.value, "active": data.active}})
    doc = await db.promo_codes.find_one({"_id": ObjectId(promo_id)})
    return clean(doc)


@api.delete("/promo-codes/{promo_id}")
async def delete_promo(promo_id: str, admin: dict = Depends(get_admin_user)):
    await db.promo_codes.delete_one({"_id": ObjectId(promo_id)})
    return {"ok": True}


# Notifications
@api.get("/notifications")
async def list_notifications(admin: dict = Depends(get_admin_user)):
    notifs = [clean(d) for d in await db.notifications.find().sort("created_at", -1).to_list(100)]
    unread = await db.notifications.count_documents({"read": False})
    return {"notifications": notifs, "unread": unread}


@api.post("/notifications/read")
async def mark_notifications_read(admin: dict = Depends(get_admin_user)):
    await db.notifications.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


# Customers
@api.get("/customers")
async def list_customers(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({"role": "customer"}).sort("created_at", -1).to_list(2000)
    s = await db.settings.find_one({"_id": "site"}) or {}
    tiers = s.get("loyalty_tiers", [])
    name_map = {str(u["_id"]): f"{u.get('first_name','')} {u.get('last_name','')}".strip() for u in users}
    ref_counts = {}
    for u in users:
        rb = u.get("referred_by")
        if rb:
            ref_counts[rb] = ref_counts.get(rb, 0) + 1
    result = []
    for u in users:
        uid = str(u["_id"])
        count = await db.orders.count_documents({"user_id": uid})
        points = int(u.get("loyalty_points", 0))
        override = u.get("loyalty_tier_override")
        tier, _ = _loyalty_tier(points, tiers)
        result.append({
            "id": uid,
            "first_name": u.get("first_name"), "last_name": u.get("last_name"),
            "email": u.get("email"), "phone": u.get("phone"),
            "created_at": u.get("created_at"), "orders_count": count,
            "loyalty_points": points,
            "loyalty_lifetime": int(u.get("loyalty_lifetime", 0)),
            "tier": override or (tier.get("name") if tier else None),
            "tier_override": override or None,
            "referral_code": u.get("referral_code"),
            "referred_by_id": u.get("referred_by"),
            "referred_by_name": name_map.get(u.get("referred_by")) if u.get("referred_by") else None,
            "referral_count": ref_counts.get(uid, 0),
        })
    return result


@api.put("/customers/{customer_id}/loyalty")
async def admin_update_customer_loyalty(customer_id: str, payload: dict, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(customer_id):
        raise HTTPException(status_code=404, detail="Client introuvable")
    user = await db.users.find_one({"_id": ObjectId(customer_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Client introuvable")
    sets, incs = {}, {}
    if "set_points" in payload and payload["set_points"] is not None:
        sets["loyalty_points"] = max(0, int(payload["set_points"]))
    elif "points_delta" in payload and payload["points_delta"]:
        delta = int(payload["points_delta"])
        new_balance = max(0, int(user.get("loyalty_points", 0)) + delta)
        sets["loyalty_points"] = new_balance
        if delta > 0:
            incs["loyalty_lifetime"] = delta
    if "tier_override" in payload:
        ov = payload["tier_override"]
        sets["loyalty_tier_override"] = ov if ov and ov not in ("auto", "") else None
    update = {}
    if sets:
        update["$set"] = sets
    if incs:
        update["$inc"] = incs
    if update:
        await db.users.update_one({"_id": ObjectId(customer_id)}, update)
    u = await db.users.find_one({"_id": ObjectId(customer_id)})
    s = await db.settings.find_one({"_id": "site"}) or {}
    tier, _ = _loyalty_tier(int(u.get("loyalty_points", 0)), s.get("loyalty_tiers", []))
    return {"id": customer_id, "loyalty_points": int(u.get("loyalty_points", 0)),
            "tier": u.get("loyalty_tier_override") or (tier.get("name") if tier else None),
            "tier_override": u.get("loyalty_tier_override") or None}


@api.get("/customers/{customer_id}/orders")
async def customer_orders(customer_id: str, admin: dict = Depends(get_admin_user)):
    return [clean(d) for d in await db.orders.find({"user_id": customer_id}).sort("created_at", -1).to_list(200)]


# Admin account (change own email / password)
@api.put("/admin/account")
async def update_admin_account(payload: dict, admin: dict = Depends(get_admin_user)):
    current = payload.get("current_password") or ""
    if not verify_password(current, admin["password_hash"]):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    updates = {}
    new_email = (payload.get("email") or "").strip().lower()
    if new_email and new_email != admin.get("email"):
        if await db.users.find_one({"email": new_email, "_id": {"$ne": admin["_id"]}}):
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
        updates["email"] = new_email
    if payload.get("first_name"):
        updates["first_name"] = payload["first_name"].strip()
    new_pw = payload.get("new_password") or ""
    if new_pw:
        if len(new_pw) < 6:
            raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
        updates["password_hash"] = hash_password(new_pw)
    if updates:
        await db.users.update_one({"_id": admin["_id"]}, {"$set": updates})
    doc = await db.users.find_one({"_id": admin["_id"]})
    return clean(doc)


# ----------------------------------------------------------------------------
# Brands
# ----------------------------------------------------------------------------
@api.get("/brands")
async def list_brands():
    return [clean(d) for d in await db.brands.find().sort("name", 1).to_list(200)]


@api.get("/brands/{brand_id}")
async def get_brand(brand_id: str):
    doc = await db.brands.find_one({"_id": ObjectId(brand_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Marque introuvable")
    return clean(doc)


@api.post("/brands")
async def create_brand(data: BrandInput, admin: dict = Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = now_utc().isoformat()
    res = await db.brands.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/brands/{brand_id}")
async def update_brand(brand_id: str, data: BrandInput, admin: dict = Depends(get_admin_user)):
    await db.brands.update_one({"_id": ObjectId(brand_id)}, {"$set": data.model_dump()})
    doc = await db.brands.find_one({"_id": ObjectId(brand_id)})
    return clean(doc)


@api.delete("/brands/{brand_id}")
async def delete_brand(brand_id: str, admin: dict = Depends(get_admin_user)):
    await db.brands.delete_one({"_id": ObjectId(brand_id)})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Blog
# ----------------------------------------------------------------------------
@api.get("/blog")
async def list_blog():
    return [clean(d) for d in await db.blog.find().sort("created_at", -1).to_list(100)]


@api.get("/blog/{post_id}")
async def get_blog(post_id: str):
    doc = await db.blog.find_one({"_id": ObjectId(post_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Article introuvable")
    return clean(doc)


@api.post("/blog")
async def create_blog(data: BlogInput, admin: dict = Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = now_utc().isoformat()
    res = await db.blog.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/blog/{post_id}")
async def update_blog(post_id: str, data: BlogInput, admin: dict = Depends(get_admin_user)):
    await db.blog.update_one({"_id": ObjectId(post_id)}, {"$set": data.model_dump()})
    doc = await db.blog.find_one({"_id": ObjectId(post_id)})
    return clean(doc)


@api.delete("/blog/{post_id}")
async def delete_blog(post_id: str, admin: dict = Depends(get_admin_user)):
    await db.blog.delete_one({"_id": ObjectId(post_id)})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------------
def compute_subtotal(items):
    return sum(i.price * i.quantity for i in items)


async def compute_delivery(method: str, wilaya: str, commune: str, agency: str, subtotal: float) -> float:
    if subtotal <= 0 or method == "pickup":
        return 0
    s = await db.settings.find_one({"_id": "site"}) or {}
    w = await db.wilayas.find_one({"name": wilaya})
    if method == "relais":
        if w:
            match = next((a for a in (w.get("agencies") or []) if a.get("name") == agency), None)
            if match:
                return float(match.get("fee", 0))
        return float(s.get("relais_fee", 350))
    # domicile = wilaya base fee + city fee
    if w:
        base = float(w.get("base_fee", s.get("delivery_fee", WILAYA_DELIVERY)))
        city = next((c for c in (w.get("cities") or []) if c.get("name") == commune), None)
        return base + (float(city.get("fee", 0)) if city else 0)
    fees = s.get("delivery_fees") or {}
    return float(fees.get(wilaya, s.get("delivery_fee", WILAYA_DELIVERY)))


# ----------------------------------------------------------------------------
# Delivery zones (wilayas -> cities / relay agencies) — admin managed
# ----------------------------------------------------------------------------
def _wilaya_public(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "code": doc.get("code", ""),
        "base_fee": doc.get("base_fee", 0),
        "cities": doc.get("cities", []),
        "agencies": doc.get("agencies", []),
        "order": doc.get("order", 100),
    }


@api.get("/delivery/wilayas")
async def list_wilayas():
    docs = await db.wilayas.find().sort([("order", 1), ("name", 1)]).to_list(200)
    return [_wilaya_public(d) for d in docs]


@api.post("/admin/wilayas")
async def create_wilaya(data: WilayaInput, admin: dict = Depends(get_admin_user)):
    doc = {"name": data.name, "code": data.code, "base_fee": data.base_fee,
           "cities": [c.model_dump() for c in data.cities],
           "agencies": [a.model_dump() for a in data.agencies],
           "order": data.order, "created_at": now_utc().isoformat()}
    res = await db.wilayas.insert_one(doc)
    doc["_id"] = res.inserted_id
    return _wilaya_public(doc)


@api.put("/admin/wilayas/{wid}")
async def update_wilaya(wid: str, data: WilayaInput, admin: dict = Depends(get_admin_user)):
    await db.wilayas.update_one({"_id": ObjectId(wid)}, {"$set": {
        "name": data.name, "code": data.code, "base_fee": data.base_fee,
        "cities": [c.model_dump() for c in data.cities],
        "agencies": [a.model_dump() for a in data.agencies], "order": data.order}})
    doc = await db.wilayas.find_one({"_id": ObjectId(wid)})
    return _wilaya_public(doc)


@api.delete("/admin/wilayas/{wid}")
async def delete_wilaya(wid: str, admin: dict = Depends(get_admin_user)):
    await db.wilayas.delete_one({"_id": ObjectId(wid)})
    return {"ok": True}



async def apply_promo(code: str, subtotal: float) -> float:
    if not code:
        return 0
    promo = await db.promo_codes.find_one({"code": code.strip().upper(), "active": True})
    if not promo:
        return 0
    if promo["type"] == "percent":
        return round(subtotal * promo["value"] / 100, 2)
    return min(float(promo["value"]), subtotal)


@api.post("/promo/validate")
async def validate_promo(payload: dict):
    code = (payload.get("code") or "").strip().upper()
    subtotal = float(payload.get("subtotal") or 0)
    promo = await db.promo_codes.find_one({"code": code, "active": True})
    if not promo:
        raise HTTPException(status_code=404, detail="Code promo invalide ou expiré")
    discount = await apply_promo(code, subtotal)
    return {"code": code, "discount": discount, "type": promo["type"], "value": promo["value"]}


@api.post("/orders")
async def create_order(data: OrderInput, request: Request):
    if not data.items:
        raise HTTPException(status_code=400, detail="Le panier est vide")
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass
    s = await db.settings.find_one({"_id": "site"}) or {}

    # Member-exclusive offer pricing: reduce price of covered products for the buyer's tier
    member_offers = {}
    if user and s.get("loyalty_enabled", True):
        cur, _ = _loyalty_tier(int(user.get("loyalty_points", 0)), s.get("loyalty_tiers", []))
        tier_name = user.get("loyalty_tier_override") or (cur.get("name") if cur else None)
        if tier_name:
            for o in s.get("loyalty_offers", []):
                if o.get("enabled", True) and tier_name in (o.get("tiers") or []):
                    for pid in (o.get("product_ids") or []):
                        member_offers[pid] = (o.get("discount_type", "percent"), o.get("discount_value", 0))

    order_items = []
    for i in data.items:
        it = i.model_dump()
        if i.product_id in member_offers and not i.ecard:
            dt, dv = member_offers[i.product_id]
            it["original_price"] = it["price"]
            it["price"] = _offer_price(float(it["price"]), dt, dv)
            it["member_offer"] = True
        order_items.append(it)

    # Free loyalty gift attached via a personal single-use gift code
    gift_code_used = ""
    if data.gift_code and user:
        gcode = data.gift_code.strip().upper()
        gcp = await db.promo_codes.find_one({"code": gcode, "type": "gift", "active": True, "user_id": str(user["_id"])})
        if not gcp:
            raise HTTPException(status_code=400, detail="Code cadeau invalide, déjà utilisé ou non associé à votre compte")
        g = gcp.get("gift") or {}
        order_items.append({
            "product_id": g.get("product_id") or "", "name": "🎁 " + (g.get("name") or "Cadeau fidélité"),
            "price": 0, "quantity": 1, "image": g.get("image"), "is_gift": True, "gift_code": gcode,
        })
        gift_code_used = gcode

    subtotal = round(sum(float(it["price"]) * int(it["quantity"]) for it in order_items), 2)
    delivery = await compute_delivery(data.delivery_method, data.wilaya, data.commune, data.agency, subtotal)
    discount = await apply_promo(data.promo_code, subtotal)
    total = max(0, subtotal + delivery - discount)
    # Apply e-gift card balance (partial payment)
    giftcard_applied = 0
    gc = None
    if data.giftcard_code:
        gc = await db.gift_cards.find_one({"code": data.giftcard_code.strip().upper(), "status": "active"})
        if gc and float(gc.get("balance", 0)) > 0:
            giftcard_applied = min(float(gc["balance"]), total)
            total = max(0, total - giftcard_applied)
    order = {
        "items": order_items,
        "subtotal": subtotal,
        "delivery": delivery,
        "discount": discount,
        "promo_code": data.promo_code.strip().upper() if data.promo_code else "",
        "giftcard_code": data.giftcard_code.strip().upper() if data.giftcard_code else "",
        "giftcard_applied": giftcard_applied,
        "gift_code": gift_code_used,
        "total": total,
        "full_name": data.full_name,
        "phone": data.phone,
        "email": (data.email or "").strip().lower() or None,
        "wilaya": data.wilaya,
        "commune": data.commune,
        "agency": data.agency,
        "street": data.street,
        "payment_method": data.payment_method,
        "delivery_method": data.delivery_method,
        "payment_status": "paid" if data.payment_method == "card" else "pending",
        "notes": data.notes,
        "status": "En attente de paiement BaridiMob" if data.payment_method == "baridimob" else "En attente",
        "user_id": str(user["_id"]) if user else None,
        "created_at": now_utc().isoformat(),
    }
    res = await db.orders.insert_one(order)
    order["_id"] = res.inserted_id
    # deduct used e-gift card balance
    if gc and giftcard_applied > 0:
        new_balance = round(float(gc["balance"]) - giftcard_applied, 2)
        await db.gift_cards.update_one({"_id": gc["_id"]},
            {"$set": {"balance": new_balance, "status": "depleted" if new_balance <= 0 else "active"}})
    # create purchased e-cards (pending until the order is confirmed by admin)
    for i in data.items:
        if i.ecard:
            ec = i.ecard
            await db.gift_cards.insert_one({
                "code": _gc_code(), "type": "ecard",
                "amount": float(i.price), "balance": float(i.price),
                "status": "pending", "delivery": ec.get("delivery", "print"),
                "recipient_email": (ec.get("recipient_email") or "").strip().lower() or None,
                "message": ec.get("message", ""), "scheduled_date": ec.get("scheduled_date") or None,
                "buyer_user_id": str(user["_id"]) if user else None,
                "order_id": str(res.inserted_id), "created_at": now_utc().isoformat(),
            })
    # single-use promo (loyalty reward): deactivate after use
    if data.promo_code:
        await db.promo_codes.update_one(
            {"code": data.promo_code.strip().upper(), "single_use": True},
            {"$set": {"active": False}})
    # single-use loyalty gift code: consume after use
    if gift_code_used:
        await db.promo_codes.update_one(
            {"code": gift_code_used, "type": "gift"},
            {"$set": {"active": False, "used_at": now_utc().isoformat()}})
    for item in data.items:
        if ObjectId.is_valid(item.product_id):
            await db.products.update_one({"_id": ObjectId(item.product_id)},
                                         {"$inc": {"stock": -item.quantity}})
    # admin notification (in-app)
    await db.notifications.insert_one({
        "type": "order",
        "order_id": str(res.inserted_id),
        "message": f"Nouvelle commande de {data.full_name} — {int(total)} DA",
        "read": False,
        "created_at": now_utc().isoformat(),
    })
    # email notification (non-blocking)
    s = await db.settings.find_one({"_id": "site"}) or {}
    sender = s.get("sender_email") or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    asyncio.create_task(asyncio.to_thread(send_order_email, order, sender))
    asyncio.create_task(asyncio.to_thread(send_customer_email, order, sender))
    return clean(order)


@api.get("/orders/mine")
async def my_orders(user: dict = Depends(get_current_user)):
    cursor = db.orders.find({"user_id": str(user["_id"])}).sort("created_at", -1)
    return [clean(d) for d in await cursor.to_list(200)]


@api.get("/orders")
async def all_orders(admin: dict = Depends(get_admin_user)):
    cursor = db.orders.find().sort("created_at", -1)
    return [clean(d) for d in await cursor.to_list(500)]


@api.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, payload: dict, admin: dict = Depends(get_admin_user)):
    status = payload.get("status", "En attente")
    order = await db.orders.find_one({"_id": ObjectId(order_id)})
    await db.orders.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": status}})
    # Loyalty: credit points once the order is delivered
    if order and status == "Livrée" and not order.get("loyalty_credited") and order.get("user_id"):
        s = await db.settings.find_one({"_id": "site"}) or {}
        if s.get("loyalty_enabled", True):
            rate = s.get("loyalty_points_per_100da", 1)
            pts = int(order.get("subtotal", 0) // 100) * rate
            if pts > 0 and ObjectId.is_valid(order["user_id"]):
                await db.users.update_one({"_id": ObjectId(order["user_id"])},
                                          {"$inc": {"loyalty_points": pts, "loyalty_lifetime": pts}})
            await db.orders.update_one({"_id": ObjectId(order_id)},
                                       {"$set": {"loyalty_credited": True, "loyalty_points_earned": pts}})
    # E-cards: activate/schedule linked e-cards once the order is confirmed
    confirmed = status not in ("En attente", "En attente de paiement BaridiMob", "Annulée")
    if order and confirmed:
        today = now_utc().date().isoformat()
        pending = await db.gift_cards.find({"order_id": order_id, "status": "pending"}).to_list(50)
        for card in pending:
            if card.get("scheduled_date") and card["scheduled_date"] > today:
                await db.gift_cards.update_one({"_id": card["_id"]}, {"$set": {"status": "scheduled"}})
            else:
                await _issue_ecard(card)
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    return clean(doc)


# ----------------------------------------------------------------------------
# Loyalty program
# ----------------------------------------------------------------------------
def _loyalty_tier(points: int, tiers: list):
    """Return (current_tier, next_tier) based on the CURRENT points balance.
    If points are below the lowest tier's minimum, current is None (no status yet)."""
    tiers = sorted(tiers or [], key=lambda t: t.get("min", 0))
    if not tiers:
        return None, None
    current = None
    nxt = tiers[0]
    for i, t in enumerate(tiers):
        if points >= t.get("min", 0):
            current = t
            nxt = tiers[i + 1] if i + 1 < len(tiers) else None
    return current, nxt


async def _resolve_gift(g: dict):
    """Resolve a tier gift item for display. Product gifts pull name/image/price from catalog."""
    out = {"id": g.get("id"), "type": g.get("type", "custom"), "name": g.get("name", ""),
           "image": g.get("image"), "product_id": g.get("product_id")}
    if g.get("type") == "product" and g.get("product_id") and ObjectId.is_valid(g["product_id"]):
        p = await db.products.find_one({"_id": ObjectId(g["product_id"])})
        if p:
            out["name"] = p.get("name", out["name"])
            out["image"] = (p.get("images") or [None])[0] or out["image"]
            out["value"] = float(p.get("price", 0))
    return out


def _offer_price(price: float, otype: str, value: float):
    if otype == "percent":
        return round(max(0, price - price * float(value) / 100), 2)
    return round(max(0, price - float(value)), 2)


async def _offers_for_tier(tier_name, settings):
    """Return active loyalty offers visible to a given tier, with resolved products + discounted price."""
    out = []
    for o in settings.get("loyalty_offers", []):
        if not o.get("enabled", True):
            continue
        if tier_name not in (o.get("tiers") or []):
            continue
        prods = await _resolve_products(o.get("product_ids", []))
        items = []
        for p in prods:
            items.append({**p, "original_price": p.get("price"),
                          "offer_price": _offer_price(float(p.get("price", 0)), o.get("discount_type", "percent"), o.get("discount_value", 0))})
        out.append({
            "id": o.get("id"), "title": o.get("title", ""),
            "discount_type": o.get("discount_type", "percent"), "discount_value": o.get("discount_value", 0),
            "products": items,
        })
    return out


@api.get("/loyalty/config")
async def loyalty_config():
    s = await db.settings.find_one({"_id": "site"}) or {}
    return {
        "enabled": s.get("loyalty_enabled", True),
        "points_per_100da": s.get("loyalty_points_per_100da", 1),
        "tiers": s.get("loyalty_tiers", []),
        "rewards": [r for r in s.get("loyalty_rewards", []) if r.get("enabled", True)],
    }


@api.get("/loyalty/me")
async def loyalty_me(user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"_id": "site"}) or {}
    tiers = s.get("loyalty_tiers", [])
    lifetime = int(user.get("loyalty_lifetime", 0))
    points = int(user.get("loyalty_points", 0))
    # Status is based on the CURRENT points balance (spending can lower it)
    current, nxt = _loyalty_tier(points, tiers)
    override = user.get("loyalty_tier_override")
    if override:
        forced = next((t for t in tiers if t.get("name") == override), None)
        if forced:
            current = forced
            idx = tiers.index(forced)
            nxt = tiers[idx + 1] if idx + 1 < len(tiers) else None
    # ensure the user has a referral code (older accounts)
    ref_code = user.get("referral_code")
    if not ref_code:
        ref_code = await _gen_referral_code()
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"referral_code": ref_code}})
    referral_count = await db.users.count_documents({"referred_by": str(user["_id"])})
    # personal reward codes still active
    codes = await db.promo_codes.find({"source": "loyalty", "user_id": str(user["_id"])}).sort("created_at", -1).to_list(50)
    # gift claims + gift chooser for every tier the user currently qualifies for
    claims = user.get("gift_claims", []) or []
    claimed_tiers = {c.get("tier"): c for c in claims}
    gift_tiers = []
    for t in sorted(tiers, key=lambda x: x.get("min", 0)):
        if points < t.get("min", 0):
            continue
        resolved = [await _resolve_gift(g) for g in (t.get("gifts") or [])]
        cl = claimed_tiers.get(t.get("name"))
        gift_tiers.append({
            "tier": t.get("name"),
            "min": t.get("min", 0),
            "gifts": resolved,
            "claimed": bool(cl),
            "claimed_gift_name": cl.get("gift_name") if cl else None,
            "claimed_code": cl.get("code") if cl else None,
        })
    gift_codes = await db.promo_codes.find({"source": "loyalty_gift", "user_id": str(user["_id"])}).sort("created_at", -1).to_list(50)
    # exclusive product offers reserved to the user's current tier
    offers = await _offers_for_tier(current.get("name"), s) if current else []
    return {
        "enabled": s.get("loyalty_enabled", True),
        "points": points,
        "lifetime": lifetime,
        "points_per_100da": s.get("loyalty_points_per_100da", 1),
        "tier": current,
        "tier_override": override or None,
        "next_tier": nxt,
        "tiers": tiers,
        "rewards": [r for r in s.get("loyalty_rewards", []) if r.get("enabled", True)],
        "my_codes": [clean(c) for c in codes],
        "gift_tiers": gift_tiers,
        "my_gift_codes": [clean(c) for c in gift_codes],
        "offers": offers,
        "referral": {
            "enabled": s.get("referral_enabled", True),
            "code": ref_code,
            "referrer_points": s.get("referral_referrer_points", 200),
            "referee_points": s.get("referral_referee_points", 100),
            "count": referral_count,
        },
    }


@api.post("/loyalty/claim-gift")
async def loyalty_claim_gift(payload: dict, user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"_id": "site"}) or {}
    if not s.get("loyalty_enabled", True):
        raise HTTPException(status_code=400, detail="Programme de fidélité désactivé")
    tier_name = payload.get("tier")
    gift_id = payload.get("gift_id")
    tiers = s.get("loyalty_tiers", [])
    tier = next((t for t in tiers if t.get("name") == tier_name), None)
    if not tier:
        raise HTTPException(status_code=404, detail="Statut introuvable")
    points = int(user.get("loyalty_points", 0))
    if points < int(tier.get("min", 0)):
        raise HTTPException(status_code=400, detail="Vous n'avez pas encore atteint ce statut")
    gift = next((g for g in (tier.get("gifts") or []) if g.get("id") == gift_id), None)
    if not gift:
        raise HTTPException(status_code=404, detail="Cadeau introuvable")
    claims = user.get("gift_claims", []) or []
    if any(c.get("tier") == tier_name for c in claims):
        raise HTTPException(status_code=400, detail="Vous avez déjà réclamé le cadeau de ce statut")
    resolved = await _resolve_gift(gift)
    code = "CADEAU-" + secrets.token_hex(3).upper()
    await db.promo_codes.insert_one({
        "code": code, "type": "gift", "value": 0, "active": True, "single_use": True,
        "source": "loyalty_gift", "user_id": str(user["_id"]),
        "reward_label": resolved["name"], "gift": resolved, "tier": tier_name,
        "created_at": now_utc().isoformat(),
    })
    claim = {"tier": tier_name, "gift_id": gift_id, "gift_name": resolved["name"], "code": code, "created_at": now_utc().isoformat()}
    await db.users.update_one({"_id": user["_id"]}, {"$push": {"gift_claims": claim}})
    return {"ok": True, "code": code, "gift": resolved}


@api.post("/loyalty/redeem")
async def loyalty_redeem(payload: dict, user: dict = Depends(get_current_user)):
    s = await db.settings.find_one({"_id": "site"}) or {}
    if not s.get("loyalty_enabled", True):
        raise HTTPException(status_code=400, detail="Programme de fidélité désactivé")
    reward_id = payload.get("reward_id")
    reward = next((r for r in s.get("loyalty_rewards", []) if r.get("id") == reward_id and r.get("enabled", True)), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Récompense introuvable")
    balance = int(user.get("loyalty_points", 0))
    cost = int(reward.get("points", 0))
    if balance < cost:
        raise HTTPException(status_code=400, detail="Points insuffisants")
    code = "FID-" + secrets.token_hex(3).upper()
    await db.promo_codes.insert_one({
        "code": code, "type": reward.get("type", "fixed"), "value": reward.get("value", 0),
        "active": True, "single_use": True, "source": "loyalty", "user_id": str(user["_id"]),
        "reward_label": reward.get("label", ""), "created_at": now_utc().isoformat(),
    })
    await db.users.update_one({"_id": user["_id"]}, {"$inc": {"loyalty_points": -cost}})
    return {"ok": True, "code": code, "reward": reward, "remaining_points": balance - cost}


# ----------------------------------------------------------------------------
# Gift ideas & gift packs
# ----------------------------------------------------------------------------
class GiftPackInput(BaseModel):
    name: str
    description: str = ""
    image: Optional[str] = None
    product_ids: List[str] = []
    price: float = 0
    enabled: bool = True


async def _resolve_products(ids):
    oids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
    if not oids:
        return []
    docs = await db.products.find({"_id": {"$in": oids}}).to_list(200)
    order = {i: k for k, i in enumerate(ids)}
    docs.sort(key=lambda d: order.get(str(d["_id"]), 99))
    return [clean(d) for d in docs]


@api.get("/gift-ideas")
async def gift_ideas():
    s = await db.settings.find_one({"_id": "site"}) or {}
    featured = await _resolve_products(s.get("gift_featured_ids", []))
    packs = await db.gift_packs.find({"enabled": {"$ne": False}}).sort("created_at", -1).to_list(100)
    out_packs = []
    for p in packs:
        p = clean(p)
        p["products"] = await _resolve_products(p.get("product_ids", []))
        out_packs.append(p)
    return {"intro": s.get("gift_intro", ""), "featured": featured, "packs": out_packs}


@api.get("/admin/gift-packs")
async def admin_gift_packs(admin: dict = Depends(get_admin_user)):
    packs = await db.gift_packs.find({}).sort("created_at", -1).to_list(200)
    return [clean(p) for p in packs]


@api.post("/admin/gift-packs")
async def admin_create_pack(data: GiftPackInput, admin: dict = Depends(get_admin_user)):
    doc = data.model_dump()
    doc["created_at"] = now_utc().isoformat()
    res = await db.gift_packs.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/admin/gift-packs/{pack_id}")
async def admin_update_pack(pack_id: str, data: GiftPackInput, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(pack_id):
        raise HTTPException(status_code=404, detail="Pack introuvable")
    await db.gift_packs.update_one({"_id": ObjectId(pack_id)}, {"$set": data.model_dump()})
    doc = await db.gift_packs.find_one({"_id": ObjectId(pack_id)})
    return clean(doc)


@api.delete("/admin/gift-packs/{pack_id}")
async def admin_delete_pack(pack_id: str, admin: dict = Depends(get_admin_user)):
    if ObjectId.is_valid(pack_id):
        await db.gift_packs.delete_one({"_id": ObjectId(pack_id)})
    return {"ok": True}


# ----------------------------------------------------------------------------
# E-gift cards (multi-use balance, email or print, scheduled send)
# ----------------------------------------------------------------------------
def _gc_code():
    import string
    return "EC-" + "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


def send_ecard_email(to: str, code: str, amount: float, message: str, sender: str = None):
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key or not to:
        logger.warning("E-card email skipped (no key or recipient)")
        return
    try:
        import resend
        resend.api_key = api_key
        sender = sender or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        msg_html = f'<p style="font-style:italic;color:#334155;background:#f0fdf4;padding:12px 16px;border-left:3px solid #059669;border-radius:6px">{message}</p>' if message else ""
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#0f172a">
          <h2 style="color:#059669">Vous avez reçu une E-carte cadeau Pharma360 !</h2>
          {msg_html}
          <div style="background:linear-gradient(135deg,#059669,#065F46);color:#fff;border-radius:16px;padding:24px;text-align:center;margin:16px 0">
            <div style="font-size:13px;opacity:.85">Montant</div>
            <div style="font-size:32px;font-weight:800">{int(amount)} DA</div>
            <div style="font-size:13px;opacity:.85;margin-top:12px">Code de la carte</div>
            <div style="font-size:22px;font-weight:800;letter-spacing:2px">{code}</div>
          </div>
          <p style="font-size:13px;color:#64748b">Utilisez ce code lors du paiement sur pharma360. Utilisable en plusieurs fois jusqu'à épuisement du montant.</p>
        </div>"""
        resend.Emails.send({"from": sender, "to": [to], "subject": "Votre E-carte cadeau Pharma360", "html": html})
    except Exception as e:
        logger.error("send_ecard_email failed: %s", e)


async def _issue_ecard(card: dict):
    """Activate an e-card and send it by email if requested."""
    updates = {"status": "active", "issued_at": now_utc().isoformat()}
    await db.gift_cards.update_one({"_id": card["_id"]}, {"$set": updates})
    if card.get("delivery") == "email" and card.get("recipient_email"):
        s = await db.settings.find_one({"_id": "site"}) or {}
        sender = s.get("sender_email") or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        await asyncio.to_thread(send_ecard_email, card["recipient_email"], card["code"],
                                card["amount"], card.get("message", ""), sender)


async def ecard_scheduler():
    """Background loop: issue scheduled e-cards whose date has arrived."""
    while True:
        try:
            today = now_utc().date().isoformat()
            cards = await db.gift_cards.find({"status": "scheduled"}).to_list(200)
            for c in cards:
                if (c.get("scheduled_date") or "0000") <= today:
                    await _issue_ecard(c)
        except Exception as e:
            logger.error("ecard_scheduler error: %s", e)
        await asyncio.sleep(120)


@api.post("/giftcard/validate")
async def validate_giftcard(payload: dict):
    code = (payload.get("code") or "").strip().upper()
    card = await db.gift_cards.find_one({"code": code, "status": "active"})
    if not card or float(card.get("balance", 0)) <= 0:
        raise HTTPException(status_code=404, detail="E-carte invalide, inactive ou épuisée")
    return {"code": code, "balance": float(card.get("balance", 0)), "amount": float(card.get("amount", 0))}


@api.get("/account/giftcards")
async def my_giftcards(user: dict = Depends(get_current_user)):
    cards = await db.gift_cards.find({"buyer_user_id": str(user["_id"])}).sort("created_at", -1).to_list(100)
    return [clean(c) for c in cards]


@api.get("/admin/giftcards")
async def admin_giftcards(admin: dict = Depends(get_admin_user)):
    cards = await db.gift_cards.find({}).sort("created_at", -1).to_list(500)
    return [clean(c) for c in cards]


# ----------------------------------------------------------------------------
# Live chat (internal)
# ----------------------------------------------------------------------------
async def _get_optional_user(request: Request):
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


@api.post("/chat/start")
async def chat_start(payload: dict, request: Request):
    user = await _get_optional_user(request)
    name = (payload.get("name") or (user and f"{user.get('first_name','')} {user.get('last_name','')}".strip()) or "Visiteur").strip()
    email = (payload.get("email") or (user and user.get("email")) or "").strip().lower() or None
    now = now_utc().isoformat()
    conv = {
        "name": name, "email": email,
        "user_id": str(user["_id"]) if user else None,
        "status": "open", "unread_admin": 0, "unread_user": 0,
        "created_at": now, "last_message_at": now,
    }
    res = await db.chat_conversations.insert_one(conv)
    conv["_id"] = res.inserted_id
    return clean(conv)


@api.get("/chat/{conv_id}/messages")
async def chat_messages(conv_id: str, request: Request):
    if not ObjectId.is_valid(conv_id):
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    msgs = await db.chat_messages.find({"conversation_id": conv_id}).sort("created_at", 1).to_list(500)
    # mark admin messages as read by the user
    await db.chat_messages.update_many({"conversation_id": conv_id, "sender": "admin", "read": False}, {"$set": {"read": True}})
    await db.chat_conversations.update_one({"_id": ObjectId(conv_id)}, {"$set": {"unread_user": 0}})
    return [clean(m) for m in msgs]


@api.post("/chat/{conv_id}/message")
async def chat_post_message(conv_id: str, payload: dict):
    if not ObjectId.is_valid(conv_id):
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    conv = await db.chat_conversations.find_one({"_id": ObjectId(conv_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message vide")
    now = now_utc().isoformat()
    await db.chat_messages.insert_one({
        "conversation_id": conv_id, "sender": "user", "text": text, "read": False, "created_at": now,
    })
    await db.chat_conversations.update_one({"_id": ObjectId(conv_id)},
        {"$set": {"last_message_at": now, "status": "open"}, "$inc": {"unread_admin": 1}})
    await db.notifications.insert_one({
        "type": "chat", "conversation_id": conv_id,
        "message": f"Nouveau message chat de {conv.get('name','Visiteur')}",
        "read": False, "created_at": now,
    })
    # Email the admin ONLY on the first user message of the conversation
    user_msg_count = await db.chat_messages.count_documents({"conversation_id": conv_id, "sender": "user"})
    if user_msg_count == 1:
        s = await db.settings.find_one({"_id": "site"}) or {}
        sender = s.get("sender_email") or os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
        admin_user = await db.users.find_one({"role": "admin"})
        admin_email = (admin_user or {}).get("email")
        if admin_email:
            asyncio.create_task(asyncio.to_thread(send_chat_email, admin_email, conv.get("name", "Visiteur"), text, sender))
    return {"ok": True}


@api.get("/admin/chat/conversations")
async def admin_chat_conversations(admin: dict = Depends(get_admin_user)):
    convs = await db.chat_conversations.find({}).sort("last_message_at", -1).to_list(300)
    return [clean(c) for c in convs]


@api.get("/admin/chat/{conv_id}/messages")
async def admin_chat_messages(conv_id: str, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(conv_id):
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    msgs = await db.chat_messages.find({"conversation_id": conv_id}).sort("created_at", 1).to_list(500)
    await db.chat_messages.update_many({"conversation_id": conv_id, "sender": "user", "read": False}, {"$set": {"read": True}})
    await db.chat_conversations.update_one({"_id": ObjectId(conv_id)}, {"$set": {"unread_admin": 0}})
    return [clean(m) for m in msgs]


@api.post("/admin/chat/{conv_id}/reply")
async def admin_chat_reply(conv_id: str, payload: dict, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(conv_id):
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message vide")
    now = now_utc().isoformat()
    await db.chat_messages.insert_one({
        "conversation_id": conv_id, "sender": "admin", "text": text, "read": False, "created_at": now,
    })
    await db.chat_conversations.update_one({"_id": ObjectId(conv_id)},
        {"$set": {"last_message_at": now}, "$inc": {"unread_user": 1}})
    return {"ok": True}


@api.get("/admin/chat/unread-count")
async def admin_chat_unread(admin: dict = Depends(get_admin_user)):
    convs = await db.chat_conversations.find({"unread_admin": {"$gt": 0}}).to_list(500)
    return {"count": sum(c.get("unread_admin", 0) for c in convs), "conversations": len(convs)}


# ----------------------------------------------------------------------------
# Contact
# ----------------------------------------------------------------------------
@api.post("/contact")
async def contact(data: ContactInput):
    doc = data.model_dump()
    doc["created_at"] = now_utc().isoformat()
    await db.messages.insert_one(doc)
    return {"ok": True}


@api.get("/messages")
async def list_messages(admin: dict = Depends(get_admin_user)):
    return [clean(d) for d in await db.messages.find().sort("created_at", -1).to_list(200)]


# ----------------------------------------------------------------------------
# Admin stats
# ----------------------------------------------------------------------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin_user)):
    # Revenue counts ONLY delivered ("Livrée") orders — real money collected
    rev_agg = await db.orders.aggregate([
        {"$match": {"status": "Livrée"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}},
    ]).to_list(1)
    revenue = rev_agg[0]["total"] if rev_agg else 0
    orders_count = await db.orders.count_documents({})
    settings = await db.settings.find_one({"_id": "site"}) or {}
    threshold = settings.get("low_stock_threshold", 5)
    return {
        "products": await db.products.count_documents({}),
        "orders": orders_count,
        "brands": await db.brands.count_documents({}),
        "revenue": revenue,
        "pending_orders": await db.orders.count_documents({"status": "En attente"}),
        "customers": await db.users.count_documents({"role": "customer"}),
        "low_stock": await db.products.count_documents({"stock": {"$lte": threshold}}),
        "low_stock_threshold": threshold,
    }


@api.delete("/orders/{order_id}")
async def delete_order(order_id: str, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(order_id):
        raise HTTPException(status_code=404, detail="Commande introuvable")
    await db.gift_cards.delete_many({"order_id": order_id})
    res = await db.orders.delete_one({"_id": ObjectId(order_id)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    return {"ok": True}


@api.get("/admin/analytics")
async def admin_analytics(period: str = "month", admin: dict = Depends(get_admin_user)):
    now = now_utc()
    cutoff_iso = None
    if period == "day":
        cutoff_iso = (now - timedelta(days=1)).isoformat()
    elif period == "week":
        cutoff_iso = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        cutoff_iso = (now - timedelta(days=30)).isoformat()

    order_q = {"status": "Livrée"}
    if cutoff_iso:
        order_q["created_at"] = {"$gte": cutoff_iso}
    orders = await db.orders.find(order_q).to_list(5000)

    revenue = sum(float(o.get("total", 0)) for o in orders)
    orders_count = len(orders)
    aov = round(revenue / orders_count, 2) if orders_count else 0

    prod = {}
    for o in orders:
        for it in o.get("items", []):
            pid = it.get("product_id") or it.get("name")
            e = prod.setdefault(pid, {"product_id": it.get("product_id"), "name": it.get("name"), "qty": 0, "revenue": 0.0})
            e["qty"] += int(it.get("quantity", 0))
            e["revenue"] += float(it.get("price", 0)) * int(it.get("quantity", 0))
    top_products = sorted(prod.values(), key=lambda x: x["qty"], reverse=True)[:20]

    cust = {}
    for o in orders:
        uid = o.get("user_id") or o.get("phone") or o.get("full_name")
        e = cust.setdefault(uid, {"name": o.get("full_name"), "phone": o.get("phone"), "orders": 0, "spent": 0.0})
        e["orders"] += 1
        e["spent"] += float(o.get("total", 0))
    top_customers = sorted(cust.values(), key=lambda x: x["spent"], reverse=True)[:20]

    total_customers = await db.users.count_documents({"role": "customer"})
    if cutoff_iso:
        new_customers = await db.users.count_documents({"role": "customer", "created_at": {"$gte": cutoff_iso}})
    else:
        new_customers = total_customers

    return {
        "period": period,
        "revenue": revenue,
        "orders": orders_count,
        "aov": aov,
        "total_customers": total_customers,
        "new_customers": new_customers,
        "top_products": top_products,
        "top_customers": top_customers,
    }


@api.get("/admin/low-stock")
async def admin_low_stock(admin: dict = Depends(get_admin_user)):
    settings = await db.settings.find_one({"_id": "site"}) or {}
    threshold = settings.get("low_stock_threshold", 5)
    cursor = db.products.find({"stock": {"$lte": threshold}}).sort("stock", 1)
    return {"threshold": threshold, "products": [clean(d) for d in await cursor.to_list(500)]}


# ----------------------------------------------------------------------------
# Uploads
# ----------------------------------------------------------------------------
@api.post("/upload")
async def upload(file: UploadFile = File(...), admin: dict = Depends(get_admin_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    path = f"{APP_NAME}/uploads/{uuid.uuid4()}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    await db.files.insert_one({
        "storage_path": result["path"],
        "content_type": file.content_type,
        "created_at": now_utc().isoformat(),
    })
    backend = os.environ.get("REACT_APP_BACKEND_URL", "")
    return {"url": f"/api/files/{result['path']}"}


@api.get("/files/{path:path}")
async def download(path: str):
    record = await db.files.find_one({"storage_path": path})
    data, content_type = get_object(path)
    return FastResponse(content=data, media_type=(record or {}).get("content_type") or content_type)


# ----------------------------------------------------------------------------
# Seeding
# ----------------------------------------------------------------------------
async def seed():
    # indexes
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)

    # admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "first_name": "Admin", "last_name": "Pharma360", "email": admin_email,
            "password_hash": hash_password(admin_pw), "role": "admin",
            "addresses": [], "created_at": now_utc().isoformat(),
        })
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    if await db.products.count_documents({}) > 0:
        return

    if await db.promo_codes.count_documents({}) == 0:
        await db.promo_codes.insert_one({"code": "BIENVENUE10", "type": "percent", "value": 10,
                                         "active": True, "created_at": now_utc().isoformat()})

    brands = [
        {"name": "La Roche-Posay", "logo": "https://images.unsplash.com/photo-1631730486784-9e5b8e5c5c1e?w=200"},
        {"name": "CeraVe", "logo": None},
        {"name": "Avène", "logo": None},
        {"name": "Vichy", "logo": None},
        {"name": "Bioderma", "logo": None},
        {"name": "The Ordinary", "logo": None},
        {"name": "SVR", "logo": None},
        {"name": "Nuxe", "logo": None},
        {"name": "Eucerin", "logo": None},
        {"name": "Isdin", "logo": None},
    ]
    for b in brands:
        b["description"] = f"Découvrez toute la gamme {b['name']} disponible chez Pharma360."
        b["created_at"] = now_utc().isoformat()
    await db.brands.insert_many(brands)

    img = lambda u: [u]
    products = [
        {"name": "CeraVe Crème Lavante Hydratante 236ml", "brand": "CeraVe", "category": "visage",
         "price": 2450, "old_price": 2900, "stock": 40, "badge": "PROMO", "is_featured": True, "need": "hydratation",
         "images": img("https://images.unsplash.com/photo-1613803745799-ba6c10aace85?w=600"),
         "description": "Nettoyant doux hydratant pour peaux normales à sèches, enrichi en céramides et acide hyaluronique."},
        {"name": "La Roche-Posay Anthelios UVMune 400 SPF50+", "brand": "La Roche-Posay", "category": "solaire",
         "price": 3100, "old_price": 3600, "stock": 25, "badge": "COUP DE COEUR", "is_featured": True, "need": "protection",
         "images": img("https://images.unsplash.com/photo-1680536977794-7954fc45afa1?w=600"),
         "description": "Fluide solaire très haute protection SPF50+, invisible et résistant à l'eau."},
        {"name": "The Ordinary Sérum Vitamine C 23%", "brand": "The Ordinary", "category": "visage",
         "price": 2800, "old_price": None, "stock": 60, "is_new": True, "need": "eclat",
         "images": img("https://images.unsplash.com/photo-1585652757141-8837d676fac8?w=600"),
         "description": "Sérum antioxydant illuminateur à la vitamine C pure pour un teint éclatant."},
        {"name": "Avène Eau Thermale Spray Apaisant 300ml", "brand": "Avène", "category": "sante",
         "price": 1950, "old_price": 2300, "stock": 80, "badge": "PROMO", "need": "apaisant",
         "images": img("https://images.unsplash.com/photo-1689414748960-0498d6675f20?w=600"),
         "description": "Eau thermale apaisante et anti-irritante pour peaux sensibles et réactives."},
        {"name": "Nuxe Huile Prodigieuse Multi-Fonctions", "brand": "Nuxe", "category": "corps",
         "price": 3400, "old_price": None, "stock": 35, "is_featured": True, "need": "nutrition",
         "images": img("https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600"),
         "description": "Huile sèche nourrissante visage, corps et cheveux au parfum emblématique."},
        {"name": "Vichy Minéral 89 Sérum Hydratant", "brand": "Vichy", "category": "visage",
         "price": 4200, "old_price": 4800, "stock": 20, "badge": "PROMO", "is_new": True, "need": "hydratation",
         "images": img("https://images.unsplash.com/photo-1680537530357-f158c9d6f2ae?w=600"),
         "description": "Booster quotidien fortifiant à l'acide hyaluronique et eau volcanique de Vichy."},
        {"name": "Bioderma Sensibio H2O Eau Micellaire 500ml", "brand": "Bioderma", "category": "hygiene",
         "price": 2200, "old_price": 2600, "stock": 90, "badge": "PROMO", "need": "nettoyage",
         "images": img("https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"),
         "description": "Eau micellaire démaquillante et nettoyante pour peaux sensibles."},
        {"name": "Eucerin Anti-Pigment Soin de Jour SPF30", "brand": "Eucerin", "category": "visage",
         "price": 3050, "old_price": 6100, "stock": 15, "badge": "PROMO", "need": "taches",
         "images": img("https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600"),
         "description": "Soin correcteur des taches pigmentaires avec protection solaire SPF30."},
        {"name": "Isdin Fotoprotector Fusion Water SPF50", "brand": "Isdin", "category": "solaire",
         "price": 3800, "old_price": None, "stock": 30, "is_new": True, "need": "protection",
         "images": img("https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600"),
         "description": "Protection solaire ultra-légère à absorption immédiate, fini invisible."},
        {"name": "SVR Sebiaclear Gel Moussant 400ml", "brand": "SVR", "category": "cheveux",
         "price": 2600, "old_price": None, "stock": 45, "need": "purifiant",
         "images": img("https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=600"),
         "description": "Gel moussant purifiant pour peaux grasses à imperfections."},
        {"name": "Nuxe Rouge à Lèvres Nourrissant", "brand": "Nuxe", "category": "corps",
         "price": 2900, "old_price": 3300, "stock": 50, "badge": "PROMO", "need": "soin-levres",
         "images": img("https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600"),
         "description": "Rouge à lèvres teinté aux huiles végétales pour des lèvres nourries."},
        {"name": "Vichy Dercos Shampooing Anti-Chute", "brand": "Vichy", "category": "cheveux",
         "price": 2750, "old_price": None, "stock": 40, "is_featured": True, "need": "anti-chute",
         "images": img("https://images.unsplash.com/photo-1626784215021-2e39ccf971cd?w=600"),
         "description": "Shampooing énergisant qui stimule et renforce les cheveux affaiblis."},
    ]
    for p in products:
        p["created_at"] = now_utc().isoformat()
        p.setdefault("badge", None)
        p.setdefault("is_featured", False)
        p.setdefault("is_new", False)
        p.setdefault("old_price", None)
    await db.products.insert_many(products)

    blog = [
        {"title": "SOS Cheveux d'Été : réparer sa chevelure après le soleil",
         "excerpt": "Nos conseils pour restaurer l'hydratation et la vitalité de vos cheveux après l'exposition solaire.",
         "content": "Le soleil, le sel et le chlore fragilisent la fibre capillaire. Découvrez notre routine réparatrice en 4 étapes : masque nourrissant, huile protectrice, shampooing doux et soin sans rinçage.",
         "image": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=800", "author": "Équipe Pharma360"},
        {"title": "Le guide Pharma360 pour un teint lumineux et protégé",
         "excerpt": "Comment obtenir un glow naturel tout en protégeant votre peau au quotidien.",
         "content": "Une belle peau passe par 3 piliers : hydratation, protection solaire quotidienne et actifs éclat comme la vitamine C. On vous explique comment les combiner.",
         "image": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800", "author": "Équipe Pharma360"},
        {"title": "Peau grasse : glow vs. brillance, comment faire la différence ?",
         "excerpt": "Comprendre votre type de peau pour choisir les bons soins purifiants.",
         "content": "La peau grasse n'est pas synonyme de mauvaise hygiène. Découvrez comment réguler le sébum sans agresser votre barrière cutanée.",
         "image": "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800", "author": "Équipe Pharma360"},
    ]
    for b in blog:
        b["created_at"] = now_utc().isoformat()
    await db.blog.insert_many(blog)
    logger.info("Seed data inserted")


# ----------------------------------------------------------------------------
# Site settings (editable by admin)
# ----------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "brand_name": "Pharma360",
    "tagline": "Votre Parapharmacie en Ligne en Algérie",
    "logo": None,
    "phone": "0500 00 00 00",
    "phone_link": "+213500000000",
    "email": "contact@pharma360-dz.com",
    "sender_email": "onboarding@resend.dev",
    "address": "Adresse à définir, Alger, Algérie",
    "horaires": "7j/7 — 08h00 à 22h00",
    "facebook": "#",
    "instagram": "#",
    "tiktok": "#",
    "delivery_zone": "Toutes les wilayas d'Algérie",
    "delivery_fee": 500,
    "low_stock_threshold": 5,
    "relais_fee": 350,
    "delivery_fees": {},
    "pickup_enabled": True,
    "payment_cod_enabled": True,
    "payment_card_enabled": True,
    "payment_baridimob_enabled": True,
    "whatsapp_number": "+213500000000",
    "maps_link": "",
    "virtual_tour_url": "",
    "privacy_content": "Chez Pharma360, la protection de vos données personnelles est une priorité. Cette politique explique comment nous collectons et utilisons vos informations.\n\nDonnées collectées\nNous collectons les informations que vous nous fournissez lors de la création de compte et de vos commandes : nom, prénom, email, téléphone et adresse de livraison.\n\nUtilisation\nVos données servent uniquement à traiter vos commandes, assurer la livraison et améliorer votre expérience. Elles ne sont jamais revendues à des tiers.\n\nVos droits\nVous pouvez à tout moment demander la modification ou la suppression de vos données en nous contactant.",
    "cgv_content": "Les présentes Conditions Générales de Vente régissent les ventes réalisées sur Pharma360.\n\nProduits\nTous nos produits sont 100% originaux et proviennent de laboratoires certifiés. Les photos sont non contractuelles.\n\nPrix & Paiement\nLes prix sont affichés en Dinar Algérien (DA), toutes taxes comprises. Le paiement s'effectue à la livraison (espèces) ou via BaridiMob.\n\nLivraison\nLa livraison est assurée dans les 58 wilayas d'Algérie sous 24 à 48h. Des frais de livraison s'appliquent selon la wilaya.\n\nRetours\nLes produits peuvent être retournés sous 7 jours s'ils sont non ouverts et dans leur emballage d'origine.",
    "hero_image": None,
    "hero_title": "Prenez soin de votre peau & santé au meilleur prix",
    "hero_subtitle": "Cosmétiques et soins 100% originaux, livrés partout en Algérie. Payez à la livraison, en toute confiance.",
    "footer_about": "Pharma360 est votre parapharmacie en ligne de confiance en Algérie. Nous proposons des produits 100% originaux : soins, cosmétiques, compléments et bien-être, livrés partout en Algérie avec paiement à la livraison.",
    "whatsapp_url": "",
    "footer_news_links": [
        {"id": "n1", "label": "Idées cadeaux", "target": "/idees-cadeaux", "enabled": True},
        {"id": "n2", "label": "Carte cadeau", "target": "/carte-cadeau", "enabled": True},
        {"id": "n3", "label": "Soldes", "target": "/catalogue?on_promo=1", "enabled": True},
        {"id": "n4", "label": "Programme de fidélité", "target": "/fidelite", "enabled": True},
    ],
    "footer_help_links": [
        {"id": "h1", "label": "FAQ", "target": "/page/faq", "enabled": True},
        {"id": "h2", "label": "Modes de paiement acceptés", "target": "/page/modes-paiement", "enabled": True},
        {"id": "h3", "label": "Retourner un produit", "target": "/page/retour-produit", "enabled": True},
        {"id": "h4", "label": "Conditions de livraison", "target": "/page/conditions-livraison", "enabled": True},
        {"id": "h5", "label": "Conditions de nos offres exclusives / promos", "target": "/page/conditions-promos", "enabled": True},
        {"id": "h6", "label": "Rappel produit", "target": "/page/rappel-produit", "enabled": True},
        {"id": "h7", "label": "Confidentialité", "target": "/confidentialite", "enabled": True},
        {"id": "h8", "label": "CGV", "target": "/cgv", "enabled": True},
    ],
    "loyalty_enabled": True,
    "loyalty_points_per_100da": 1,
    "loyalty_tiers": [
        {"name": "BRONZE", "min": 0, "perks": [
            "Un cadeau Bronze à choisir pour tout achat",
        ]},
        {"name": "Silver", "min": 500, "perks": [
            "Un cadeau Silver à choisir pour tout achat",
            "Des offres exclusives réservées aux membres Silver",
        ]},
        {"name": "Gold", "min": 1500, "perks": [
            "Un cadeau Gold à choisir",
            "Carte cadeau de 10 000 DA",
            "Des offres exclusives réservées aux membres Gold",
            "Des journées Gold et invitations aux événements exclusifs",
            "Une ou plusieurs livraisons standard offertes sans minimum d'achat",
        ]},
    ],
    "loyalty_rewards": [
        {"id": "r1", "label": "Bon de 500 DA", "points": 500, "type": "fixed", "value": 500, "enabled": True},
        {"id": "r2", "label": "10% de réduction", "points": 800, "type": "percent", "value": 10, "enabled": True},
        {"id": "r3", "label": "Bon de 1500 DA", "points": 1200, "type": "fixed", "value": 1500, "enabled": True},
    ],
    "theme_mode": "auto",
    "theme_manual": "spring",
    "referral_enabled": True,
    "referral_referrer_points": 200,
    "referral_referee_points": 100,
    "gift_intro": "Faites plaisir à vos proches avec notre sélection d'idées cadeaux et nos coffrets bien-être Pharma360.",
    "gift_featured_ids": [],
    "giftcard_enabled": True,
    "giftcard_amounts": [1000, 2000, 3000, 5000],
    "giftcard_design": None,
    "giftcard_terms": "La carte cadeau physique Pharma360 est valable en ligne et en boutique. Choisissez un montant, commandez-la et faites plaisir à vos proches. Détails et modalités à préciser.",
    "top_bar_messages": [
        "Livraison rapide dans toutes les wilayas d'Algérie",
        "Produits 100% Originaux & Authentiques",
        "Expédition Express sous 24h–48h",
    ],
    "chat_quick_replies": [
        "Bonjour 👋 Comment puis-je vous aider ?",
        "Pour le suivi de votre commande, merci de m'indiquer votre numéro de commande.",
        "Ce produit est bien disponible en stock ✅",
        "La livraison se fait sous 24 à 48h dans toutes les wilayas.",
        "Merci pour votre message, notre équipe revient vers vous rapidement.",
    ],
    "app_download_enabled": False,
    "app_store_url": "",
    "play_store_url": "",
    "loyalty_offers": [],
    "theme_presets": [
        {"id": "rose_ivoire", "name": "Rose poudré & Blanc ivoire", "accent": "#E8B4B8", "bg": "#FDF8F5"},
        {"id": "mauve_casse", "name": "Mauve / Lilas & Blanc cassé", "accent": "#C9A0DC", "bg": "#FAF7FB"},
        {"id": "corail_beige", "name": "Corail doux & Beige rosé", "accent": "#F2A9A0", "bg": "#F7ECE8"},
        {"id": "dusty_sauge", "name": "Rose vieux & Vert sauge clair", "accent": "#D6A2A2", "bg": "#E8EDE3"},
        {"id": "lilas_dore", "name": "Lilas & Doré doux", "accent": "#B8A9D9", "bg": "#EAD9A0"},
        {"id": "bleu_creme", "name": "Bleu poudré & Blanc crème", "accent": "#A8C3D4", "bg": "#FAF6EF"},
        {"id": "terracotta_sauge", "name": "Terracotta doux & Vert sauge", "accent": "#D4977A", "bg": "#B7C4A8"},
        {"id": "aubergine_beige", "name": "Violet aubergine & Beige rosé clair", "accent": "#8B6F9E", "bg": "#F0E4DD"},
    ],
}


CATEGORY_IMAGES_SEED = {
    "sante": "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600",
    "visage": "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600",
    "corps": "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600",
    "cheveux": "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600",
    "hygiene": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600",
    "bebe-maman": "https://images.unsplash.com/photo-1778276551433-75420636007d?w=600",
    "solaire": "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600",
    "homme-sport": "https://images.unsplash.com/photo-1669322779651-5ca89652492e?w=600",
    "complements": "https://images.unsplash.com/photo-1664956618021-73c47736845e?w=600",
    "minceur": "https://images.unsplash.com/photo-1523901839036-a3030662f220?w=600",
    "nature-bio": "https://images.unsplash.com/photo-1760108249194-f9cafd970762?w=600",
    "animaux": "https://images.unsplash.com/photo-1571873735645-1ae72b963024?w=600",
    "materiel-medical": "https://images.unsplash.com/photo-1700832082200-af7deeb63d9b?w=600",
}


# Pool of images cycled for sub / sub-sub categories and demo products
CAT_IMG_POOL = [
    "https://images.unsplash.com/photo-1613803745799-ba6c10aace85?w=600",
    "https://images.unsplash.com/photo-1680536977794-7954fc45afa1?w=600",
    "https://images.unsplash.com/photo-1585652757141-8837d676fac8?w=600",
    "https://images.unsplash.com/photo-1689414748960-0498d6675f20?w=600",
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600",
    "https://images.unsplash.com/photo-1680537530357-f158c9d6f2ae?w=600",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600",
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600",
    "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600",
    "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=600",
    "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600",
    "https://images.unsplash.com/photo-1626784215021-2e39ccf971cd?w=600",
]


# Example 3-level catalog tree: main -> (sub -> [sub-sub leaves])
CATEGORY_TREE_SEED = [
    ("Santé", CATEGORY_IMAGES_SEED["sante"], [
        ("Douleur & Fièvre", ["Antalgiques", "Patchs chauffants"]),
        ("Digestion", ["Anti-acides", "Probiotiques"]),
    ]),
    ("Visage", CATEGORY_IMAGES_SEED["visage"], [
        ("Soins Hydratants", ["Crèmes de jour", "Sérums hydratants"]),
        ("Anti-Âge", ["Crèmes anti-rides", "Contours des yeux"]),
    ]),
    ("Corps", CATEGORY_IMAGES_SEED["corps"], [
        ("Hydratation Corps", ["Laits corporels", "Beurres nourrissants"]),
        ("Mains & Pieds", ["Crèmes mains", "Soins des pieds"]),
    ]),
    ("Cheveux", CATEGORY_IMAGES_SEED["cheveux"], [
        ("Shampooings", ["Anti-chute", "Antipelliculaire"]),
        ("Soins Capillaires", ["Masques capillaires", "Huiles capillaires"]),
    ]),
    ("Hygiène", CATEGORY_IMAGES_SEED["hygiene"], [
        ("Hygiène Corporelle", ["Gels douche", "Savons doux"]),
        ("Bucco-dentaire", ["Dentifrices", "Bains de bouche"]),
    ]),
    ("Bébé & Maman", CATEGORY_IMAGES_SEED["bebe-maman"], [
        ("Soins Bébé", ["Change & érythème", "Nettoyants doux"]),
        ("Maternité", ["Anti-vergetures", "Allaitement"]),
    ]),
    ("Solaire", CATEGORY_IMAGES_SEED["solaire"], [
        ("Protection Solaire", ["Visage SPF50+", "Corps SPF30"]),
        ("Après-Soleil", ["Laits apaisants", "Autobronzants"]),
    ]),
    ("Homme & Sport", CATEGORY_IMAGES_SEED["homme-sport"], [
        ("Soin Homme", ["Rasage", "Soins visage homme"]),
        ("Nutrition Sport", ["Protéines", "Récupération"]),
    ]),
    ("Compléments alimentaires", CATEGORY_IMAGES_SEED["complements"], [
        ("Vitamines", ["Vitamine C", "Vitamine D"]),
        ("Minéraux", ["Magnésium", "Fer"]),
    ]),
    ("Minceur", CATEGORY_IMAGES_SEED["minceur"], [
        ("Brûleurs & Détox", ["Brûle-graisses", "Draineurs"]),
        ("Coupe-faim", ["Fibres", "Substituts de repas"]),
    ]),
    ("Nature & Bio", CATEGORY_IMAGES_SEED["nature-bio"], [
        ("Cosmétique Bio", ["Huiles végétales", "Soins certifiés bio"]),
        ("Phytothérapie", ["Tisanes", "Huiles essentielles"]),
    ]),
    ("Animaux", CATEGORY_IMAGES_SEED["animaux"], [
        ("Chien", ["Antiparasitaires chien", "Hygiène chien"]),
        ("Chat", ["Antiparasitaires chat", "Hygiène chat"]),
    ]),
    ("Matériel Médical", CATEGORY_IMAGES_SEED["materiel-medical"], [
        ("Mesure & Diagnostic", ["Tensiomètres", "Thermomètres"]),
        ("Orthopédie", ["Attelles", "Bandages"]),
    ]),
]


async def ensure_category_tree():
    """One-time migration to the 3-level category tree + demo products."""
    if await db.meta.find_one({"_id": "cat_tree_v1"}):
        return
    await db.categories.delete_many({})
    await db.subcategories.delete_many({})
    await db.products.delete_many({})

    brand_names = await db.brands.distinct("name") or ["Pharma360"]
    counter = {"img": 0, "prod": 0}

    async def insert_node(label, image, parent_id, level, order):
        slug = slugify(label)
        if await db.categories.find_one({"slug": slug}):
            slug = f"{slug}-{uuid.uuid4().hex[:4]}"
        res = await db.categories.insert_one({
            "slug": slug, "label": label, "image": image, "icon": "Tag",
            "parent_id": parent_id, "level": level, "order": order,
            "created_at": now_utc().isoformat(),
        })
        return str(res.inserted_id), slug

    async def seed_leaf_products(leaf_id, leaf_slug, leaf_label):
        variants = ["Essentiel", "Advanced"]
        for k in range(2):
            i = counter["prod"]
            brand = brand_names[i % len(brand_names)]
            image = CAT_IMG_POOL[i % len(CAT_IMG_POOL)]
            base = 1500 + (i % 8) * 350
            promo = i % 3 == 0
            await db.products.insert_one({
                "name": f"{brand} {leaf_label} {variants[k]}",
                "brand": brand, "category": leaf_slug, "category_id": leaf_id, "subcategory": None,
                "description": f"{leaf_label} — {brand}. Produit de parapharmacie 100% original, disponible chez Pharma360.",
                "price": base, "old_price": base + 500 if promo else None,
                "stock": 30, "images": [image],
                "badge": "PROMO" if promo else None,
                "is_featured": i % 5 == 0, "is_new": i % 4 == 0, "need": None,
                "created_at": now_utc().isoformat(),
            })
            counter["prod"] += 1

    for mi, (main_label, main_img, subs) in enumerate(CATEGORY_TREE_SEED):
        main_id, _ = await insert_node(main_label, main_img, None, 0, mi)
        for si, (sub_label, leaves) in enumerate(subs):
            sub_img = CAT_IMG_POOL[counter["img"] % len(CAT_IMG_POOL)]; counter["img"] += 1
            sub_id, _ = await insert_node(sub_label, sub_img, main_id, 1, si)
            for li, leaf_label in enumerate(leaves):
                leaf_img = CAT_IMG_POOL[counter["img"] % len(CAT_IMG_POOL)]; counter["img"] += 1
                leaf_id, leaf_slug = await insert_node(leaf_label, leaf_img, sub_id, 2, li)
                await seed_leaf_products(leaf_id, leaf_slug, leaf_label)

    await db.meta.insert_one({"_id": "cat_tree_v1", "created_at": now_utc().isoformat()})
    logger.info("Category tree + demo products seeded")


async def ensure_wilayas():
    if await db.meta.find_one({"_id": "wilayas_v1"}):
        return
    from wilayas_data import WILAYAS_SEED
    await db.wilayas.delete_many({})
    for i, (code, name, communes) in enumerate(WILAYAS_SEED):
        await db.wilayas.insert_one({
            "name": name,
            "code": code,
            "base_fee": 400,
            "cities": [{"name": c, "fee": 0} for c in communes],
            "agencies": [
                {"name": f"Yalidine {name}", "fee": 350},
                {"name": f"ZR Express {name}", "fee": 300},
            ],
            "order": i,
            "created_at": now_utc().isoformat(),
        })
    await db.meta.insert_one({"_id": "wilayas_v1", "created_at": now_utc().isoformat()})
    logger.info("Wilayas delivery zones seeded")


async def ensure_settings():
    existing = await db.settings.find_one({"_id": "site"})
    if not existing:
        await db.settings.insert_one({"_id": "site", **DEFAULT_SETTINGS})
    else:
        merged = {k: existing.get(k, v) for k, v in DEFAULT_SETTINGS.items()}
        await db.settings.update_one({"_id": "site"}, {"$set": merged})
    # one-time: enforce COD + BaridiMob as the two payment options
    if not await db.meta.find_one({"_id": "payment_v2"}):
        await db.settings.update_one({"_id": "site"},
                                     {"$set": {"payment_card_enabled": False, "payment_baridimob_enabled": True}}, upsert=True)
        await db.meta.insert_one({"_id": "payment_v2", "created_at": now_utc().isoformat()})
    # one-time: point the "Programme de fidélité" footer link to the /fidelite page
    if not await db.meta.find_one({"_id": "loyalty_v1"}):
        doc = await db.settings.find_one({"_id": "site"}) or {}
        news = doc.get("footer_news_links") or []
        for l in news:
            if l.get("id") == "n4":
                l["target"] = "/fidelite"
        await db.settings.update_one({"_id": "site"}, {"$set": {"footer_news_links": news}})
        await db.meta.insert_one({"_id": "loyalty_v1", "created_at": now_utc().isoformat()})
    # one-time: point the gift footer links to their dedicated pages
    if not await db.meta.find_one({"_id": "gifts_v1"}):
        doc = await db.settings.find_one({"_id": "site"}) or {}
        news = doc.get("footer_news_links") or []
        for l in news:
            if l.get("id") == "n1":
                l["target"] = "/idees-cadeaux"
            if l.get("id") == "n2":
                l["target"] = "/carte-cadeau"
        await db.settings.update_one({"_id": "site"}, {"$set": {"footer_news_links": news}})
        await db.meta.insert_one({"_id": "gifts_v1", "created_at": now_utc().isoformat()})
    # one-time: rename loyalty tiers to English + attach default perks
    if not await db.meta.find_one({"_id": "loyalty_v2"}):
        rename = {"Bronze": "BRONZE", "Argent": "Silver", "Or": "Gold"}
        default_perks = {
            "BRONZE": ["Un cadeau Bronze à choisir pour tout achat"],
            "Silver": ["Un cadeau Silver à choisir pour tout achat", "Des offres exclusives réservées aux membres Silver"],
            "Gold": ["Un cadeau Gold à choisir", "Carte cadeau de 10 000 DA", "Des offres exclusives réservées aux membres Gold", "Des journées Gold et invitations aux événements exclusifs", "Une ou plusieurs livraisons standard offertes sans minimum d'achat"],
        }
        doc = await db.settings.find_one({"_id": "site"}) or {}
        tiers = doc.get("loyalty_tiers") or []
        for t in tiers:
            t["name"] = rename.get(t.get("name"), t.get("name"))
            if not t.get("perks"):
                t["perks"] = default_perks.get(t["name"], [])
        await db.settings.update_one({"_id": "site"}, {"$set": {"loyalty_tiers": tiers}})
        await db.meta.insert_one({"_id": "loyalty_v2", "created_at": now_utc().isoformat()})


@api.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"_id": "site"})
    if not doc:
        return DEFAULT_SETTINGS
    doc.pop("_id", None)
    return doc


@api.put("/settings")
async def update_settings(payload: dict, admin: dict = Depends(get_admin_user)):
    allowed = {k: payload[k] for k in DEFAULT_SETTINGS if k in payload}
    await db.settings.update_one({"_id": "site"}, {"$set": allowed}, upsert=True)
    doc = await db.settings.find_one({"_id": "site"})
    doc.pop("_id", None)
    return doc


# ----------------------------------------------------------------------------
# CMS pages (editable footer/content pages)
# ----------------------------------------------------------------------------
def _slugify(text: str) -> str:
    import re, unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "page"


class PageInput(BaseModel):
    title: str
    slug: Optional[str] = None
    content: str = ""
    enabled: bool = True


CMS_PAGES_SEED = [
    ("idees-cadeaux", "Idées cadeaux", "Offrez le bien-être avec nos idées cadeaux Pharma360 : coffrets soins, cosmétiques et produits de bien-être sélectionnés par nos pharmaciens. Contactez-nous pour des conseils personnalisés."),
    ("carte-cadeau", "Carte cadeau", "La carte cadeau Pharma360 est le cadeau idéal ! Faites plaisir à vos proches en leur offrant une carte cadeau utilisable sur l'ensemble de notre boutique. Contactez notre service client pour en savoir plus."),
    ("programme-fidelite", "Programme de fidélité", "Cumulez des points à chaque achat et bénéficiez d'avantages exclusifs. Plus vous commandez, plus vous gagnez ! Découvrez bientôt tous les détails de notre programme de fidélité."),
    ("faq", "FAQ — Questions fréquentes", "Retrouvez ici les réponses aux questions les plus fréquentes sur nos produits, la livraison, le paiement et les retours. Une question ? Notre service client est disponible 7j/7."),
    ("modes-paiement", "Modes de paiement acceptés", "Nous acceptons le paiement à la livraison (espèces) ainsi que le paiement via BaridiMob. Payez en toute sécurité et en toute confiance."),
    ("retour-produit", "Retourner un produit", "Vous pouvez retourner un produit sous 7 jours s'il est non ouvert et dans son emballage d'origine. Contactez notre service client pour organiser le retour."),
    ("conditions-livraison", "Conditions de livraison", "La livraison est assurée dans les 58 wilayas d'Algérie sous 24 à 48h. Les frais de livraison varient selon la wilaya et le mode choisi (à domicile ou en point relais)."),
    ("conditions-promos", "Conditions de nos offres exclusives / promos", "Nos offres promotionnelles sont valables dans la limite des stocks disponibles et pour une durée déterminée. Elles ne sont pas cumulables sauf mention contraire."),
    ("rappel-produit", "Rappel produit", "La sécurité de nos clients est notre priorité. Retrouvez ici les éventuels rappels de produits. Aucun rappel en cours actuellement."),
]


async def ensure_cms_pages():
    if await db.meta.find_one({"_id": "cms_v1"}):
        return
    for slug, title, content in CMS_PAGES_SEED:
        if not await db.cms_pages.find_one({"slug": slug}):
            await db.cms_pages.insert_one({
                "slug": slug, "title": title, "content": content,
                "enabled": True, "updated_at": now_utc().isoformat(),
            })
    await db.meta.insert_one({"_id": "cms_v1", "created_at": now_utc().isoformat()})


@api.get("/pages/{slug}")
async def get_page(slug: str):
    doc = await db.cms_pages.find_one({"slug": slug})
    if not doc or not doc.get("enabled", True):
        raise HTTPException(status_code=404, detail="Page introuvable")
    return clean(doc)


@api.get("/admin/pages")
async def admin_list_pages(admin: dict = Depends(get_admin_user)):
    cursor = db.cms_pages.find({}).sort("title", 1)
    return [clean(d) for d in await cursor.to_list(500)]


@api.post("/admin/pages")
async def admin_create_page(data: PageInput, admin: dict = Depends(get_admin_user)):
    slug = _slugify(data.slug or data.title)
    if await db.cms_pages.find_one({"slug": slug}):
        slug = f"{slug}-{secrets.token_hex(3)}"
    doc = {"slug": slug, "title": data.title, "content": data.content,
           "enabled": data.enabled, "updated_at": now_utc().isoformat()}
    res = await db.cms_pages.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.put("/admin/pages/{page_id}")
async def admin_update_page(page_id: str, data: PageInput, admin: dict = Depends(get_admin_user)):
    if not ObjectId.is_valid(page_id):
        raise HTTPException(status_code=404, detail="Page introuvable")
    update = {"title": data.title, "content": data.content, "enabled": data.enabled,
              "updated_at": now_utc().isoformat()}
    if data.slug:
        update["slug"] = _slugify(data.slug)
    await db.cms_pages.update_one({"_id": ObjectId(page_id)}, {"$set": update})
    doc = await db.cms_pages.find_one({"_id": ObjectId(page_id)})
    return clean(doc)


@api.delete("/admin/pages/{page_id}")
async def admin_delete_page(page_id: str, admin: dict = Depends(get_admin_user)):
    if ObjectId.is_valid(page_id):
        await db.cms_pages.delete_one({"_id": ObjectId(page_id)})
    return {"ok": True}


# ----------------------------------------------------------------------------
# Product reviews
# ----------------------------------------------------------------------------
class ReviewInput(BaseModel):
    name: str
    rating: int = Field(ge=1, le=5)
    comment: str = ""


@api.get("/products/{product_id}/reviews")
async def get_reviews(product_id: str):
    cursor = db.reviews.find({"product_id": product_id}).sort("created_at", -1)
    reviews = [clean(d) for d in await cursor.to_list(200)]
    avg = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    return {"reviews": reviews, "average": avg, "count": len(reviews)}


@api.post("/products/{product_id}/reviews")
async def add_review(product_id: str, data: ReviewInput, request: Request):
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass
    doc = {
        "product_id": product_id,
        "name": data.name.strip() or "Client",
        "rating": data.rating,
        "comment": data.comment.strip(),
        "user_id": str(user["_id"]) if user else None,
        "created_at": now_utc().isoformat(),
    }
    res = await db.reviews.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api.get("/")
async def root():
    return {"message": "Pharma360 API"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    await seed()
    await ensure_settings()
    await ensure_cms_pages()
    await ensure_category_tree()
    asyncio.create_task(ecard_scheduler())
    await ensure_wilayas()
    try:
        await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.password_reset_tokens.create_index("token")
    except Exception as e:
        logger.error(f"reset token index failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()
