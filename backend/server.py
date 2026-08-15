import os
import uuid
import jwt
import bcrypt
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
    category: str
    description: str = ""
    price: float
    old_price: Optional[float] = None
    stock: int = 0
    images: List[str] = []
    badge: Optional[str] = None
    is_featured: bool = False
    is_new: bool = False
    need: Optional[str] = None


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


class OrderInput(BaseModel):
    items: List[OrderItem]
    full_name: str
    phone: str
    wilaya: str
    commune: str = ""
    street: str
    payment_method: str  # "cod" | "card"
    notes: str = ""


class ContactInput(BaseModel):
    name: str
    email: str
    subject: str = ""
    message: str


WILAYA_DELIVERY = 500  # flat delivery fee in DA


# ----------------------------------------------------------------------------
# Auth routes
# ----------------------------------------------------------------------------
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
    doc = {
        "first_name": data.first_name.strip(),
        "last_name": data.last_name.strip(),
        "password_hash": hash_password(data.password),
        "role": "customer",
        "addresses": [],
        "created_at": now_utc().isoformat(),
    }
    if email:
        doc["email"] = email
    if phone:
        doc["phone"] = phone
    res = await db.users.insert_one(doc)
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
# Product routes
# ----------------------------------------------------------------------------
@api.get("/products")
async def list_products(
    category: Optional[str] = None,
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
        q["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
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
# Categories
# ----------------------------------------------------------------------------
CATEGORIES = [
    {"id": "sante", "label": "Santé", "icon": "HeartPulse"},
    {"id": "visage", "label": "Visage", "icon": "Sparkles"},
    {"id": "corps", "label": "Corps", "icon": "UserCheck"},
    {"id": "cheveux", "label": "Cheveux", "icon": "Scissors"},
    {"id": "hygiene", "label": "Hygiène", "icon": "ShieldCheck"},
    {"id": "bebe-maman", "label": "Bébé & Maman", "icon": "Baby"},
    {"id": "solaire", "label": "Solaire", "icon": "Sun"},
    {"id": "homme-sport", "label": "Homme & Sport", "icon": "Dumbbell"},
    {"id": "complements", "label": "Compléments alimentaires", "icon": "Pill"},
    {"id": "minceur", "label": "Minceur", "icon": "Activity"},
    {"id": "nature-bio", "label": "Nature & Bio", "icon": "Leaf"},
    {"id": "animaux", "label": "Animaux", "icon": "PawPrint"},
    {"id": "materiel-medical", "label": "Matériel Médical", "icon": "Stethoscope"},
]


@api.get("/categories")
async def get_categories():
    return CATEGORIES


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
def compute_totals(items):
    subtotal = sum(i.price * i.quantity for i in items)
    delivery = WILAYA_DELIVERY if subtotal > 0 else 0
    return subtotal, delivery, subtotal + delivery


@api.post("/orders")
async def create_order(data: OrderInput, request: Request):
    if not data.items:
        raise HTTPException(status_code=400, detail="Le panier est vide")
    subtotal, delivery, total = compute_totals(data.items)
    user = None
    try:
        user = await get_current_user(request)
    except HTTPException:
        pass
    order = {
        "items": [i.model_dump() for i in data.items],
        "subtotal": subtotal,
        "delivery": delivery,
        "total": total,
        "full_name": data.full_name,
        "phone": data.phone,
        "wilaya": data.wilaya,
        "commune": data.commune,
        "street": data.street,
        "payment_method": data.payment_method,
        "payment_status": "paid" if data.payment_method == "card" else "pending",
        "notes": data.notes,
        "status": "En attente",
        "user_id": str(user["_id"]) if user else None,
        "created_at": now_utc().isoformat(),
    }
    res = await db.orders.insert_one(order)
    # decrement stock
    for item in data.items:
        if ObjectId.is_valid(item.product_id):
            await db.products.update_one({"_id": ObjectId(item.product_id)},
                                         {"$inc": {"stock": -item.quantity}})
    order["_id"] = res.inserted_id
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
    await db.orders.update_one({"_id": ObjectId(order_id)},
                               {"$set": {"status": payload.get("status", "En attente")}})
    doc = await db.orders.find_one({"_id": ObjectId(order_id)})
    return clean(doc)


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
    agg = await db.orders.aggregate([{"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}]).to_list(1)
    revenue = agg[0]["total"] if agg else 0
    orders_count = agg[0]["count"] if agg else 0
    return {
        "products": await db.products.count_documents({}),
        "orders": orders_count,
        "brands": await db.brands.count_documents({}),
        "revenue": revenue,
        "pending_orders": await db.orders.count_documents({"status": "En attente"}),
        "customers": await db.users.count_documents({"role": "customer"}),
    }


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
    "address": "Adresse à définir, Alger, Algérie",
    "horaires": "7j/7 — 08h00 à 22h00",
    "facebook": "#",
    "instagram": "#",
    "tiktok": "#",
    "delivery_zone": "Alger uniquement",
    "delivery_fee": 500,
    "payment_cod_enabled": True,
    "payment_card_enabled": True,
}


async def ensure_settings():
    existing = await db.settings.find_one({"_id": "site"})
    if not existing:
        await db.settings.insert_one({"_id": "site", **DEFAULT_SETTINGS})
    else:
        merged = {k: existing.get(k, v) for k, v in DEFAULT_SETTINGS.items()}
        await db.settings.update_one({"_id": "site"}, {"$set": merged})


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


@app.on_event("shutdown")
async def shutdown():
    client.close()
