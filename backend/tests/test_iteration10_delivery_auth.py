"""Iteration 10 - Pharma360 delivery (wilayas/communes/agencies), forgot/reset password,
virtual_tour_url settings, admin wilaya CRUD.

Runs against public REACT_APP_BACKEND_URL. Reads reset tokens directly from MongoDB
because emails are not actually delivered in the test env.
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

from dotenv import dotenv_values
_fe = dotenv_values("/app/frontend/.env")
_be = dotenv_values("/app/backend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _fe.get("REACT_APP_BACKEND_URL")).rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL") or _be.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME") or _be.get("DB_NAME")

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PWD = "Aminetarek1992*"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    token = r.json().get("access_token") or r.json().get("token")
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers["Authorization"] = f"Bearer {token}"
    # copy cookies
    for c in api.cookies:
        s.cookies.set(c.name, c.value)
    return s


@pytest.fixture(scope="module")
def mongo():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


# ---------------- Wilayas + delivery ----------------
def test_list_wilayas_58(api):
    r = api.get(f"{BASE_URL}/api/delivery/wilayas")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 58, f"expected 58 wilayas, got {len(data)}"
    # keys
    for w in data[:3]:
        assert {"id", "name", "code", "base_fee", "cities", "agencies"}.issubset(w.keys())
    alger = next((w for w in data if w["name"] == "Alger"), None)
    assert alger is not None
    names = {c["name"] for c in alger["cities"]}
    assert {"Alger-Centre", "Bab El Oued", "El Harrach", "Draria", "Rouiba"}.issubset(names)
    assert len(alger["agencies"]) >= 1


def test_order_delivery_pricing(api, admin, mongo):
    # Ensure Alger commune Alger-Centre has fee > 0 for math test — bump temporarily
    wilayas = api.get(f"{BASE_URL}/api/delivery/wilayas").json()
    alger = next(w for w in wilayas if w["name"] == "Alger")
    original_cities = alger["cities"]
    original_agencies = alger["agencies"]
    original_base = alger["base_fee"]

    # Set Alger-Centre commune fee = 150; keep first agency fee as-is
    new_cities = [dict(c) for c in original_cities]
    for c in new_cities:
        if c["name"] == "Alger-Centre":
            c["fee"] = 150
    body = {"name": alger["name"], "code": alger["code"], "base_fee": original_base,
            "cities": new_cities, "agencies": original_agencies, "order": alger.get("order", 100)}
    r = admin.put(f"{BASE_URL}/api/admin/wilayas/{alger['id']}", json=body)
    assert r.status_code == 200, r.text

    try:
        # Pick a product to order
        prods = api.get(f"{BASE_URL}/api/products?limit=1").json()
        items = prods.get("items") if isinstance(prods, dict) else prods
        p = items[0]
        item = {"product_id": p["id"], "name": p["name"], "price": p.get("promo_price") or p["price"], "quantity": 1}

        customer = {"full_name": "TEST Delivery", "first_name": "TEST", "last_name": "Delivery", "email": f"test_del_{uuid.uuid4().hex[:6]}@example.com",
                    "phone": "0555000000", "wilaya": "Alger"}

        # 1) domicile => base + commune
        payload = {**customer, "items": [item], "commune": "Alger-Centre", "street": "rue X",
                   "delivery_method": "domicile", "payment_method": "cod",
                   "accept_terms": True, "accept_privacy": True}
        r = api.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code in (200, 201), r.text
        o = r.json()
        expected = float(original_base) + 150
        assert float(o["delivery"]) == expected, f"domicile: expected {expected}, got {o['delivery']}"
        oid1 = o["id"]

        # 2) relais => agency fee only
        agency = original_agencies[0]
        payload = {**customer, "items": [item], "agency": agency["name"], "street": "n/a",
                   "delivery_method": "relais", "payment_method": "cod",
                   "accept_terms": True, "accept_privacy": True}
        r = api.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code in (200, 201), r.text
        o2 = r.json()
        assert float(o2["delivery"]) == float(agency["fee"]), f"relais: expected {agency['fee']}, got {o2['delivery']}"
        oid2 = o2["id"]

        # 3) pickup => 0
        payload = {**customer, "items": [item], "street": "n/a",
                   "delivery_method": "pickup", "payment_method": "cod",
                   "accept_terms": True, "accept_privacy": True}
        r = api.post(f"{BASE_URL}/api/orders", json=payload)
        assert r.status_code in (200, 201), r.text
        o3 = r.json()
        assert float(o3["delivery"]) == 0, f"pickup: expected 0, got {o3['delivery']}"
        oid3 = o3["id"]

        # Cleanup test orders
        for oid in (oid1, oid2, oid3):
            try:
                mongo.orders.delete_one({"_id": __import__("bson").ObjectId(oid)})
                mongo.notifications.delete_many({"order_id": oid})
            except Exception:
                pass
        # Restore stock
        mongo.products.update_one({"_id": __import__("bson").ObjectId(p["id"])}, {"$inc": {"stock": 3}})
    finally:
        # Revert Alger commune fees
        body = {"name": alger["name"], "code": alger["code"], "base_fee": original_base,
                "cities": original_cities, "agencies": original_agencies, "order": alger.get("order", 100)}
        admin.put(f"{BASE_URL}/api/admin/wilayas/{alger['id']}", json=body)


def test_admin_wilaya_crud(api, admin):
    name = f"TEST_W_{uuid.uuid4().hex[:6]}"
    body = {"name": name, "code": "99", "base_fee": 700,
            "cities": [{"name": "TCity", "fee": 50}],
            "agencies": [{"name": "TAgency", "fee": 400}], "order": 999}
    r = admin.post(f"{BASE_URL}/api/admin/wilayas", json=body)
    assert r.status_code == 200, r.text
    wid = r.json()["id"]
    try:
        data = api.get(f"{BASE_URL}/api/delivery/wilayas").json()
        assert any(w["id"] == wid for w in data)

        body2 = {**body, "base_fee": 800, "cities": [{"name": "TCity", "fee": 75}]}
        r = admin.put(f"{BASE_URL}/api/admin/wilayas/{wid}", json=body2)
        assert r.status_code == 200
        assert r.json()["base_fee"] == 800
        assert r.json()["cities"][0]["fee"] == 75
    finally:
        r = admin.delete(f"{BASE_URL}/api/admin/wilayas/{wid}")
        assert r.status_code == 200
        data = api.get(f"{BASE_URL}/api/delivery/wilayas").json()
        assert not any(w["id"] == wid for w in data)


# ---------------- Forgot / reset password ----------------
def test_forgot_reset_password_flow(api, mongo):
    email = f"test_reset_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "OldPass123!"
    # Register
    r = api.post(f"{BASE_URL}/api/auth/register", json={
        "first_name": "T", "last_name": "R", "email": email, "password": pwd
    })
    assert r.status_code in (200, 201), r.text

    try:
        # forgot on unknown email => ok
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": f"noone_{uuid.uuid4().hex}@x.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # forgot on real email
        r = api.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": email})
        assert r.status_code == 200

        # Read token from DB
        time.sleep(0.3)
        tok_doc = mongo.password_reset_tokens.find_one({}, sort=[("created_at", -1)])
        # Filter by user email
        user = mongo.users.find_one({"email": email})
        assert user is not None
        tok_doc = mongo.password_reset_tokens.find_one({"user_id": str(user["_id"]), "used": False})
        assert tok_doc is not None, "reset token not found in DB"
        token = tok_doc["token"]

        # Invalid token
        r = api.post(f"{BASE_URL}/api/auth/reset-password", json={"token": "bogus_xxx", "password": "NewPass123!"})
        assert r.status_code == 400

        # Reset
        new_pwd = "NewPass123!"
        r = api.post(f"{BASE_URL}/api/auth/reset-password", json={"token": token, "password": new_pwd})
        assert r.status_code == 200

        # Reuse token => 400
        r = api.post(f"{BASE_URL}/api/auth/reset-password", json={"token": token, "password": "AnotherPass1!"})
        assert r.status_code == 400

        # Old password fails
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": email, "password": pwd})
        assert r.status_code in (400, 401)

        # New password works
        r = api.post(f"{BASE_URL}/api/auth/login", json={"identifier": email, "password": new_pwd})
        assert r.status_code == 200
    finally:
        u = mongo.users.find_one({"email": email})
        if u:
            mongo.password_reset_tokens.delete_many({"user_id": str(u["_id"])})
            mongo.users.delete_one({"_id": u["_id"]})


# ---------------- Settings virtual_tour_url ----------------
def test_settings_virtual_tour_url(api, admin):
    r = api.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    s = r.json()
    assert "virtual_tour_url" in s
    original = s.get("virtual_tour_url", "")
    try:
        new_val = "https://example.com/tour-test"
        payload = {**s, "virtual_tour_url": new_val}
        # strip non-editable
        payload.pop("_id", None)
        r = admin.put(f"{BASE_URL}/api/settings", json=payload)
        assert r.status_code == 200, r.text
        r = api.get(f"{BASE_URL}/api/settings")
        assert r.json()["virtual_tour_url"] == new_val
    finally:
        s = api.get(f"{BASE_URL}/api/settings").json()
        s["virtual_tour_url"] = original
        s.pop("_id", None)
        admin.put(f"{BASE_URL}/api/settings", json=s)
