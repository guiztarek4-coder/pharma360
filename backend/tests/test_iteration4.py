"""
Pharma360 iteration-4 backend tests:
- categories with subcategories, subcategories CRUD
- promo/validate + promo-codes CRUD
- delivery methods (pickup/domicile/relais), promo code applied on order
- notifications, customers, admin/account
- products subcategory field + multi-term search
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PW = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    assert r.json().get("role") == "admin"
    return s


# ---------------- Categories with subcategories ----------------
class TestCategoriesTree:
    def test_categories_have_subcategories_array(self):
        r = requests.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) >= 1
        for c in data:
            assert "id" in c and "slug" in c and "label" in c
            assert "subcategories" in c
            assert isinstance(c["subcategories"], list)

    def test_subcategory_crud_and_products_filter(self, admin):
        cats = requests.get(f"{API}/categories").json()
        assert cats
        cat_slug = cats[0]["slug"]
        label = f"TEST_sub_{uuid.uuid4().hex[:6]}"
        r = admin.post(f"{API}/subcategories",
                       json={"label": label, "category": cat_slug})
        assert r.status_code == 200, r.text
        sub = r.json()
        sub_id = sub["id"]
        assert sub["category"] == cat_slug
        assert sub.get("slug")

        # appears in listing
        lst = requests.get(f"{API}/subcategories?category={cat_slug}").json()
        assert any(s["id"] == sub_id for s in lst)

        # appears inside category tree
        tree = requests.get(f"{API}/categories").json()
        target = next(c for c in tree if c["slug"] == cat_slug)
        assert any(s["id"] == sub_id for s in target["subcategories"])

        # filter products by subcategory slug (should be 200 even if empty)
        pr = requests.get(f"{API}/products?subcategory={sub['slug']}")
        assert pr.status_code == 200

        # cleanup
        d = admin.delete(f"{API}/subcategories/{sub_id}")
        assert d.status_code == 200

    def test_subcategory_requires_admin(self):
        r = requests.post(f"{API}/subcategories",
                          json={"label": "X", "category": "visage"})
        assert r.status_code == 401


# ---------------- Promo ----------------
class TestPromo:
    def test_validate_seeded_bienvenue10(self):
        r = requests.post(f"{API}/promo/validate",
                          json={"code": "BIENVENUE10", "subtotal": 5000})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["discount"] == 500
        assert d["type"] == "percent"
        assert d["value"] == 10

    def test_validate_invalid(self):
        r = requests.post(f"{API}/promo/validate",
                          json={"code": "NOPE_XXX", "subtotal": 1000})
        assert r.status_code == 404

    def test_promo_crud(self, admin):
        code = f"TEST{uuid.uuid4().hex[:5].upper()}"
        r = admin.post(f"{API}/promo-codes",
                       json={"code": code, "type": "amount", "value": 200, "active": True})
        assert r.status_code == 200, r.text
        pid = r.json()["id"]
        assert r.json()["code"] == code.upper()

        lst = admin.get(f"{API}/promo-codes").json()
        assert any(p["id"] == pid for p in lst)

        u = admin.put(f"{API}/promo-codes/{pid}",
                      json={"code": code, "type": "amount", "value": 300, "active": True})
        assert u.status_code == 200
        assert u.json()["value"] == 300

        d = admin.delete(f"{API}/promo-codes/{pid}")
        assert d.status_code == 200

    def test_promo_endpoints_require_admin(self):
        r = requests.get(f"{API}/promo-codes")
        assert r.status_code == 401


# ---------------- Orders / delivery methods ----------------
def _first_product():
    return requests.get(f"{API}/products").json()[0]


class TestOrderDelivery:
    def test_pickup_free_delivery(self):
        p = _first_product()
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": 1}],
            "full_name": "TEST Pickup", "phone": "0555000010",
            "wilaya": "Alger", "commune": "", "street": "-",
            "payment_method": "cod", "delivery_method": "pickup",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["delivery"] == 0
        assert d["total"] == d["subtotal"]

    def test_domicile_uses_default_fee(self):
        p = _first_product()
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": 1}],
            "full_name": "TEST Dom", "phone": "0555000011",
            "wilaya": "Alger", "commune": "Bab Ezzouar", "street": "R1",
            "payment_method": "cod", "delivery_method": "domicile",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["delivery"] > 0
        assert d["total"] == d["subtotal"] + d["delivery"]

    def test_relais_fee(self):
        p = _first_product()
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": 1}],
            "full_name": "TEST Relais", "phone": "0555000012",
            "wilaya": "Oran", "commune": "", "street": "-",
            "payment_method": "cod", "delivery_method": "relais",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["delivery"] == 350  # default relais_fee

    def test_promo_applied_on_order(self):
        p = _first_product()
        qty = max(1, int(5000 / max(1, p["price"])))
        r = requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": qty}],
            "full_name": "TEST Promo", "phone": "0555000013",
            "wilaya": "Alger", "street": "R", "commune": "",
            "payment_method": "cod", "delivery_method": "pickup",
            "promo_code": "BIENVENUE10",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        expected_discount = round(d["subtotal"] * 0.10, 2)
        assert abs(d["discount"] - expected_discount) < 1
        assert d["total"] == max(0, d["subtotal"] + d["delivery"] - d["discount"])
        assert d["promo_code"] == "BIENVENUE10"

    def test_order_creates_notification(self, admin):
        # ensure at least one notification is present
        p = _first_product()
        requests.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": 1}],
            "full_name": "TEST Notif", "phone": "0555000014",
            "wilaya": "Alger", "street": "R", "commune": "",
            "payment_method": "cod", "delivery_method": "pickup",
        })
        n = admin.get(f"{API}/notifications")
        assert n.status_code == 200
        data = n.json()
        assert "notifications" in data and "unread" in data
        assert data["unread"] >= 1
        assert len(data["notifications"]) >= 1


# ---------------- Notifications ----------------
class TestNotifications:
    def test_notifications_require_admin(self):
        r = requests.get(f"{API}/notifications")
        assert r.status_code == 401

    def test_mark_read(self, admin):
        r = admin.post(f"{API}/notifications/read")
        assert r.status_code == 200
        n = admin.get(f"{API}/notifications").json()
        assert n["unread"] == 0


# ---------------- Customers ----------------
class TestCustomers:
    def test_list_customers(self, admin):
        r = admin.get(f"{API}/customers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if data:
            c = data[0]
            for k in ("id", "orders_count"):
                assert k in c

    def test_customer_orders(self, admin):
        customers = admin.get(f"{API}/customers").json()
        # register a customer + place an order to guarantee at least one
        email = f"cust_{uuid.uuid4().hex[:6]}@ex.com"
        s = requests.Session()
        assert s.post(f"{API}/auth/register", json={
            "first_name": "C", "last_name": "U",
            "email": email, "password": "pw12345"
        }).status_code == 200
        p = _first_product()
        assert s.post(f"{API}/orders", json={
            "items": [{"product_id": p["id"], "name": p["name"],
                       "price": p["price"], "quantity": 1}],
            "full_name": "C U", "phone": "0555000020",
            "wilaya": "Alger", "commune": "", "street": "-",
            "payment_method": "cod", "delivery_method": "pickup",
        }).status_code == 200
        me = s.get(f"{API}/auth/me").json()
        cid = me["id"]
        r = admin.get(f"{API}/customers/{cid}/orders")
        assert r.status_code == 200
        assert len(r.json()) >= 1


# ---------------- Admin account ----------------
class TestAdminAccount:
    def test_wrong_current_password(self, admin):
        r = admin.put(f"{API}/admin/account",
                      json={"current_password": "WRONG_PW",
                            "first_name": "Admin"})
        assert r.status_code == 400

    def test_update_first_name_ok(self, admin):
        r = admin.put(f"{API}/admin/account",
                      json={"current_password": ADMIN_PW,
                            "first_name": "Admin"})
        assert r.status_code == 200
        assert r.json().get("first_name") == "Admin"

    def test_requires_admin(self):
        r = requests.put(f"{API}/admin/account",
                         json={"current_password": ADMIN_PW})
        assert r.status_code == 401


# ---------------- Products multi-term search ----------------
class TestProductsSearch:
    def test_multi_term_search(self):
        # Should not 500; if the term matches nothing, list is empty
        r = requests.get(f"{API}/products?search=la roche")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_subcategory_filter_endpoint(self):
        r = requests.get(f"{API}/products?subcategory=nonexistent")
        assert r.status_code == 200
        assert r.json() == []
