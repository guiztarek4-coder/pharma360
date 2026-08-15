"""
Pharma360 additive-feature tests: /api/settings and /api/products/{id}/reviews.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "admin@pharma360-dz.com"
ADMIN_PW = "Pharma360Admin!"

SETTINGS_KEYS = {
    "brand_name", "tagline", "logo", "phone", "phone_link", "email", "address",
    "horaires", "facebook", "instagram", "tiktok",
    "delivery_zone", "delivery_fee", "payment_cod_enabled", "payment_card_enabled",
}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=30)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    email = f"rev_{uuid.uuid4().hex[:8]}@ex.com"
    r = s.post(f"{API}/auth/register", json={
        "first_name": "R", "last_name": "V", "email": email, "password": "Password123!"
    }, timeout=30)
    assert r.status_code == 200
    return s


# ---------------------- Settings ----------------------
class TestSettings:
    def test_get_settings_public(self):
        r = requests.get(f"{API}/settings", timeout=30)
        assert r.status_code == 200
        data = r.json()
        for k in SETTINGS_KEYS:
            assert k in data, f"missing key {k}"
        assert "_id" not in data
        assert isinstance(data["delivery_fee"], (int, float))
        assert isinstance(data["payment_cod_enabled"], bool)
        assert isinstance(data["payment_card_enabled"], bool)

    def test_put_settings_requires_auth(self):
        r = requests.put(f"{API}/settings", json={"brand_name": "Hack"})
        assert r.status_code == 401

    def test_put_settings_forbidden_customer(self, customer_session):
        r = customer_session.put(f"{API}/settings", json={"brand_name": "Hack"})
        assert r.status_code == 403

    def test_put_settings_admin_updates_and_persists(self, admin_session):
        # snapshot original
        original = requests.get(f"{API}/settings").json()
        new_brand = f"TEST_Brand_{uuid.uuid4().hex[:6]}"
        payload = {
            "brand_name": new_brand,
            "phone": "0555 111 222",
            "address": "Rue Test, Alger",
            "delivery_fee": 750,
            "payment_cod_enabled": False,
            "payment_card_enabled": True,
            "ignored_field": "should_not_persist",
        }
        r = admin_session.put(f"{API}/settings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["brand_name"] == new_brand
        assert data["phone"] == "0555 111 222"
        assert data["address"] == "Rue Test, Alger"
        assert data["delivery_fee"] == 750
        assert data["payment_cod_enabled"] is False
        assert data["payment_card_enabled"] is True
        assert "ignored_field" not in data

        # persistence via public GET
        g = requests.get(f"{API}/settings").json()
        assert g["brand_name"] == new_brand
        assert g["delivery_fee"] == 750
        assert g["payment_cod_enabled"] is False

        # restore per agent-to-agent instructions
        restore = {
            "brand_name": original["brand_name"],
            "phone": original["phone"],
            "address": original["address"],
            "delivery_fee": 500,
            "payment_cod_enabled": True,
            "payment_card_enabled": True,
        }
        rr = admin_session.put(f"{API}/settings", json=restore)
        assert rr.status_code == 200
        assert rr.json()["delivery_fee"] == 500
        assert rr.json()["payment_cod_enabled"] is True
        assert rr.json()["payment_card_enabled"] is True


# ---------------------- Reviews ----------------------
class TestReviews:
    @pytest.fixture(scope="class")
    def product_id(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        return r.json()[0]["id"]

    def test_get_reviews_shape(self, product_id):
        r = requests.get(f"{API}/products/{product_id}/reviews")
        assert r.status_code == 200
        d = r.json()
        assert set(d.keys()) >= {"reviews", "average", "count"}
        assert isinstance(d["reviews"], list)

    def test_post_review_public_and_recompute(self, product_id):
        before = requests.get(f"{API}/products/{product_id}/reviews").json()
        before_count = before["count"]

        # Anonymous POST (no auth)
        payload = {"name": "TEST_Alice", "rating": 5, "comment": "Excellent produit"}
        r = requests.post(f"{API}/products/{product_id}/reviews", json=payload)
        assert r.status_code == 200, r.text
        rev = r.json()
        assert rev["name"] == "TEST_Alice"
        assert rev["rating"] == 5
        assert rev["comment"] == "Excellent produit"
        assert "_id" not in rev
        assert "id" in rev

        # add a second one to verify average
        r2 = requests.post(f"{API}/products/{product_id}/reviews",
                           json={"name": "TEST_Bob", "rating": 3, "comment": "Correct"})
        assert r2.status_code == 200

        after = requests.get(f"{API}/products/{product_id}/reviews").json()
        assert after["count"] == before_count + 2
        # newest first
        assert after["reviews"][0]["name"] in ("TEST_Bob", "TEST_Alice")
        # average recomputed
        ratings = [r["rating"] for r in after["reviews"]]
        expected_avg = round(sum(ratings) / len(ratings), 1)
        assert after["average"] == expected_avg

    def test_post_review_invalid_rating(self, product_id):
        r = requests.post(f"{API}/products/{product_id}/reviews",
                          json={"name": "X", "rating": 9, "comment": "bad"})
        assert r.status_code == 422
        r2 = requests.post(f"{API}/products/{product_id}/reviews",
                           json={"name": "X", "rating": 0, "comment": "bad"})
        assert r2.status_code == 422
