"""
Pharma360 backend tests.
Runs against REACT_APP_BACKEND_URL/api. Uses cookie jar for httpOnly auth cookie.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE:
    # fallback for local dev
    BASE = "http://localhost:8001"
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@pharma360-dz.com"
ADMIN_PW = "Pharma360Admin!"


# ---------------- fixtures ----------------
@pytest.fixture(scope="session")
def anon():
    s = requests.Session()
    return s


@pytest.fixture(scope="session")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    assert "access_token" in s.cookies
    return s


@pytest.fixture(scope="session")
def customer():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={
        "first_name": "Test", "last_name": "User",
        "email": email, "password": "Password123!"
    }, timeout=30)
    assert r.status_code == 200, r.text
    s.email = email
    s.password = "Password123!"
    return s


# ---------------- products / catalog ----------------
class TestProducts:
    def test_list_seeded(self, anon):
        r = anon.get(f"{API}/products", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 10  # 12 seeded
        p = data[0]
        assert "id" in p and "price" in p and "name" in p
        assert "_id" not in p

    def test_filter_category(self, anon):
        r = anon.get(f"{API}/products?category=visage")
        assert r.status_code == 200
        for p in r.json():
            assert p["category"] == "visage"

    def test_filter_on_promo(self, anon):
        r = anon.get(f"{API}/products?on_promo=true")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("old_price") and p["old_price"] > 0

    def test_filter_is_new(self, anon):
        r = anon.get(f"{API}/products?is_new=true")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("is_new") is True

    def test_filter_featured(self, anon):
        r = anon.get(f"{API}/products?featured=true")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("is_featured") is True

    def test_search_and_sort(self, anon):
        r = anon.get(f"{API}/products?search=cera&sort=price_asc")
        assert r.status_code == 200
        prices = [p["price"] for p in r.json()]
        assert prices == sorted(prices)

    def test_max_price(self, anon):
        r = anon.get(f"{API}/products?max_price=2500")
        assert r.status_code == 200
        for p in r.json():
            assert p["price"] <= 2500

    def test_get_product_by_id(self, anon):
        pid = anon.get(f"{API}/products").json()[0]["id"]
        r = anon.get(f"{API}/products/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_get_product_404(self, anon):
        r = anon.get(f"{API}/products/000000000000000000000000")
        assert r.status_code == 404


class TestCatalog:
    def test_categories(self, anon):
        r = anon.get(f"{API}/categories")
        assert r.status_code == 200
        labels = [c["label"] for c in r.json()]
        for l in ["Santé", "Visage", "Corps", "Cheveux", "Solaires", "Hygiène", "Maquillage", "K-Beauty"]:
            assert l in labels

    def test_brands_list(self, anon):
        r = anon.get(f"{API}/brands")
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_brand_by_id(self, anon):
        bid = anon.get(f"{API}/brands").json()[0]["id"]
        r = anon.get(f"{API}/brands/{bid}")
        assert r.status_code == 200
        assert r.json()["id"] == bid

    def test_blog_list(self, anon):
        r = anon.get(f"{API}/blog")
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_blog_by_id(self, anon):
        bid = anon.get(f"{API}/blog").json()[0]["id"]
        r = anon.get(f"{API}/blog/{bid}")
        assert r.status_code == 200

    def test_search_suggestions(self, anon):
        r = anon.get(f"{API}/search/suggestions?q=cer")
        assert r.status_code == 200
        d = r.json()
        assert "products" in d and "brands" in d
        assert len(d["products"]) >= 1


# ---------------- auth ----------------
class TestAuth:
    def test_register_email(self, anon):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@ex.com"
        r = s.post(f"{API}/auth/register", json={
            "first_name": "A", "last_name": "B", "email": email, "password": "pw12345"
        })
        assert r.status_code == 200
        assert r.json()["email"] == email
        assert "access_token" in s.cookies

    def test_register_phone(self):
        s = requests.Session()
        phone = f"+2135{uuid.uuid4().int % 100000000:08d}"
        r = s.post(f"{API}/auth/register", json={
            "first_name": "P", "last_name": "H", "phone": phone, "password": "pw12345"
        })
        assert r.status_code == 200
        assert r.json()["phone"] == phone
        # login via phone
        s2 = requests.Session()
        r2 = s2.post(f"{API}/auth/login", json={"identifier": phone, "password": "pw12345"})
        assert r2.status_code == 200

    def test_register_no_email_or_phone(self):
        r = requests.post(f"{API}/auth/register", json={
            "first_name": "X", "last_name": "Y", "password": "pw12345"
        })
        assert r.status_code == 400

    def test_duplicate_email(self):
        email = f"dup_{uuid.uuid4().hex[:6]}@ex.com"
        payload = {"first_name": "D", "last_name": "U", "email": email, "password": "pw12345"}
        assert requests.post(f"{API}/auth/register", json=payload).status_code == 200
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 400

    def test_login_email_and_me(self, customer):
        r = customer.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == customer.email

    def test_login_bad_creds(self):
        r = requests.post(f"{API}/auth/login", json={"identifier": "nope@nope.com", "password": "x"})
        assert r.status_code == 401

    def test_logout(self, customer):
        r = customer.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # re-login
        r2 = customer.post(f"{API}/auth/login", json={"identifier": customer.email, "password": customer.password})
        assert r2.status_code == 200

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------------- admin CRUD ----------------
class TestAdminCRUD:
    def test_admin_stats(self, admin):
        r = admin.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["products", "orders", "brands", "revenue", "pending_orders", "customers"]:
            assert k in d

    def test_admin_stats_denied_anon(self):
        r = requests.get(f"{API}/admin/stats")
        assert r.status_code == 401

    def test_admin_stats_denied_customer(self, customer):
        r = customer.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_product_crud(self, admin):
        payload = {"name": "TEST_prod", "brand": "TestBrand", "category": "visage",
                   "description": "test", "price": 999, "old_price": 1200, "stock": 5,
                   "images": [], "is_new": True}
        r = admin.post(f"{API}/products", json=payload)
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        # get
        g = admin.get(f"{API}/products/{pid}")
        assert g.json()["name"] == "TEST_prod"
        # update
        payload["price"] = 888
        u = admin.put(f"{API}/products/{pid}", json=payload)
        assert u.status_code == 200
        assert u.json()["price"] == 888
        # delete
        d = admin.delete(f"{API}/products/{pid}")
        assert d.status_code == 200
        assert admin.get(f"{API}/products/{pid}").status_code == 404

    def test_customer_cannot_create_product(self, customer):
        r = customer.post(f"{API}/products", json={"name": "x", "category": "visage", "price": 1})
        assert r.status_code == 403

    def test_brand_create(self, admin):
        r = admin.post(f"{API}/brands", json={"name": f"TEST_Brand_{uuid.uuid4().hex[:6]}", "description": "t"})
        assert r.status_code == 200
        bid = r.json()["id"]
        admin.delete(f"{API}/brands/{bid}")

    def test_blog_create(self, admin):
        r = admin.post(f"{API}/blog", json={"title": "TEST_post", "excerpt": "e", "content": "c"})
        assert r.status_code == 200
        pid = r.json()["id"]
        admin.delete(f"{API}/blog/{pid}")


# ---------------- orders ----------------
class TestOrders:
    def test_guest_order_cod(self, anon):
        products = requests.get(f"{API}/products").json()
        p = products[0]
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 2}],
            "full_name": "Guest User", "phone": "0555000000", "wilaya": "Alger",
            "commune": "Bab Ezzouar", "street": "Rue 1", "payment_method": "cod"
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["subtotal"] == p["price"] * 2
        assert d["delivery"] == 500
        assert d["total"] == p["price"] * 2 + 500
        assert d["payment_status"] == "pending"
        assert d["user_id"] is None

    def test_card_order_paid(self):
        products = requests.get(f"{API}/products").json()
        p = products[1]
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 1}],
            "full_name": "Card", "phone": "0555000001", "wilaya": "Oran",
            "commune": "", "street": "x", "payment_method": "card"
        })
        assert r.status_code == 200
        assert r.json()["payment_status"] == "paid"

    def test_empty_cart_rejected(self):
        r = requests.post(f"{API}/orders", json={
            "items": [], "full_name": "x", "phone": "0", "wilaya": "x", "street": "x",
            "payment_method": "cod"
        })
        assert r.status_code == 400

    def test_stock_decrement(self):
        products = requests.get(f"{API}/products").json()
        p = next(x for x in products if x.get("stock", 0) > 5)
        before = p["stock"]
        requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 1}],
            "full_name": "s", "phone": "0", "wilaya": "x", "street": "x", "payment_method": "cod"
        })
        after = requests.get(f"{API}/products/{p['id']}").json()["stock"]
        assert after == before - 1

    def test_user_order_visible_in_mine(self, customer):
        products = requests.get(f"{API}/products").json()
        p = products[0]
        r = customer.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"], "price": p["price"], "quantity": 1}],
            "full_name": "Me", "phone": "05", "wilaya": "Alger", "street": "s", "payment_method": "cod"
        })
        assert r.status_code == 200
        oid = r.json()["id"]
        mine = customer.get(f"{API}/orders/mine").json()
        assert any(o["id"] == oid for o in mine)

    def test_admin_sees_orders_and_update_status(self, admin):
        r = admin.get(f"{API}/orders")
        assert r.status_code == 200
        orders = r.json()
        if orders:
            oid = orders[0]["id"]
            u = admin.put(f"{API}/orders/{oid}/status", json={"status": "Confirmée"})
            assert u.status_code == 200
            assert u.json()["status"] == "Confirmée"

    def test_orders_forbidden_for_customer(self, customer):
        r = customer.get(f"{API}/orders")
        assert r.status_code == 403


# ---------------- misc ----------------
class TestMisc:
    def test_contact(self):
        r = requests.post(f"{API}/contact", json={
            "name": "TEST_contact", "email": "c@c.com", "subject": "s", "message": "hello"
        })
        assert r.status_code == 200

    def test_upload_requires_admin(self):
        files = {"file": ("t.txt", b"hi", "text/plain")}
        r = requests.post(f"{API}/upload", files=files)
        assert r.status_code == 401

    def test_account_addresses(self, customer):
        r = customer.post(f"{API}/account/addresses", json={
            "label": "TEST", "full_name": "Me", "phone": "05", "wilaya": "Alger", "street": "rue 1"
        })
        assert r.status_code == 200
        addrs = r.json()
        assert len(addrs) >= 1
        aid = addrs[-1]["id"]
        d = customer.delete(f"{API}/account/addresses/{aid}")
        assert d.status_code == 200
