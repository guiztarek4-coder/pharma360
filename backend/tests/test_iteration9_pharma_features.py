"""
Iteration 9 backend tests: new settings keys, complementary products, BaridiMob orders.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-pharma-dz.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "pharmacie360benak@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Aminetarek1992*")


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


# ---------- Settings ----------
class TestSettings:
    def test_settings_has_new_keys(self):
        r = requests.get(f"{BASE_URL}/api/settings", timeout=15)
        assert r.status_code == 200
        s = r.json()
        for k in ["whatsapp_number", "maps_link", "privacy_content", "cgv_content",
                  "payment_baridimob_enabled", "payment_cod_enabled", "payment_card_enabled"]:
            assert k in s, f"missing key {k}"
        assert s["payment_card_enabled"] is False, "card must be disabled after migration"
        assert s["payment_cod_enabled"] is True
        assert s["payment_baridimob_enabled"] is True

    def test_settings_put_persists(self, admin_session):
        # snapshot
        original = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()
        try:
            payload = {
                "whatsapp_number": "+213700111222",
                "maps_link": "https://maps.google.com/?q=TEST_LOC",
                "privacy_content": "TEST_PRIVACY_CONTENT_XYZ",
                "cgv_content": "TEST_CGV_CONTENT_XYZ",
                "payment_baridimob_enabled": True,
                "payment_cod_enabled": True,
                "payment_card_enabled": False,
            }
            r = admin_session.put(f"{BASE_URL}/api/settings", json=payload, timeout=15)
            assert r.status_code == 200, r.text
            got = requests.get(f"{BASE_URL}/api/settings", timeout=15).json()
            for k, v in payload.items():
                assert got[k] == v, f"{k} not persisted: {got.get(k)} != {v}"
        finally:
            # revert
            revert = {k: original.get(k) for k in [
                "whatsapp_number", "maps_link", "privacy_content", "cgv_content",
                "payment_baridimob_enabled", "payment_cod_enabled", "payment_card_enabled"]}
            admin_session.put(f"{BASE_URL}/api/settings", json=revert, timeout=15)


# ---------- Complementary products ----------
class TestComplementary:
    def test_complementary_flow(self, admin_session):
        # get some products
        r = requests.get(f"{BASE_URL}/api/products?limit=5", timeout=15)
        assert r.status_code == 200
        data = r.json()
        items = data.get("items") if isinstance(data, dict) else data
        assert isinstance(items, list) and len(items) >= 3
        main_id = items[0]["id"]
        idB = items[1]["id"]
        idC = items[2]["id"]

        # snapshot original complementary_ids
        orig = requests.get(f"{BASE_URL}/api/products/{main_id}", timeout=15).json()
        orig_ids = orig.get("complementary_ids") or []

        def _body(comp_ids):
            return {
                "name": orig.get("name", "P"),
                "brand": orig.get("brand", "") or "",
                "category": orig.get("category", "") or "",
                "category_id": orig.get("category_id"),
                "subcategory": orig.get("subcategory"),
                "description": orig.get("description", "") or "",
                "price": orig.get("price", 0),
                "old_price": orig.get("old_price"),
                "stock": orig.get("stock", 0),
                "images": orig.get("images", []) or [],
                "badge": orig.get("badge"),
                "is_featured": bool(orig.get("is_featured")),
                "is_new": bool(orig.get("is_new")),
                "need": orig.get("need"),
                "complementary_ids": comp_ids,
            }

        try:
            # set complementary
            r = admin_session.put(f"{BASE_URL}/api/products/{main_id}", json=_body([idB, idC]), timeout=15)
            assert r.status_code == 200, r.text

            # GET /complementary
            r = requests.get(f"{BASE_URL}/api/products/{main_id}/complementary", timeout=15)
            assert r.status_code == 200
            comp = r.json()
            assert isinstance(comp, list)
            assert len(comp) == 2
            assert [c["id"] for c in comp] == [idB, idC], "order preserved"

            # clear
            r = admin_session.put(f"{BASE_URL}/api/products/{main_id}", json=_body([]), timeout=15)
            assert r.status_code == 200
            r = requests.get(f"{BASE_URL}/api/products/{main_id}/complementary", timeout=15)
            assert r.status_code == 200
            assert r.json() == []
        finally:
            admin_session.put(f"{BASE_URL}/api/products/{main_id}", json=_body(orig_ids), timeout=15)


# ---------- Orders ----------
class TestOrders:
    def _make_payload(self, payment_method):
        items = requests.get(f"{BASE_URL}/api/products?limit=1", timeout=15).json()
        items = items.get("items") if isinstance(items, dict) else items
        p = items[0]
        return {
            "items": [{
                "product_id": p["id"],
                "name": p["name"],
                "price": p["price"],
                "quantity": 1,
                "image": (p.get("images") or [None])[0],
            }],
            "full_name": "TEST User",
            "phone": "+213700000000",
            "email": "test_iter9@example.com",
            "wilaya": "Alger",
            "commune": "Alger Centre",
            "street": "Rue TEST",
            "payment_method": payment_method,
            "delivery_method": "domicile",
        }

    def test_order_baridimob_status(self):
        r = requests.post(f"{BASE_URL}/api/orders", json=self._make_payload("baridimob"), timeout=20)
        assert r.status_code in (200, 201), r.text
        o = r.json()
        assert o.get("payment_method") == "baridimob"
        assert o.get("status") == "En attente de paiement BaridiMob"
        assert o.get("payment_status") == "pending"

    def test_order_cod_status(self):
        r = requests.post(f"{BASE_URL}/api/orders", json=self._make_payload("cod"), timeout=20)
        assert r.status_code in (200, 201), r.text
        o = r.json()
        assert o.get("payment_method") == "cod"
        assert o.get("status") == "En attente"
