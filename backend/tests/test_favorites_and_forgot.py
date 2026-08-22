"""Backend tests: forgot-password (with reset_link) + favorites CRUD."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-pharma-dz.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PW = "Aminetarek1992*"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def auth(s):
    r = s.post(f"{BASE_URL}/api/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()


# --- forgot-password ---
class TestForgotPassword:
    def test_known_email_returns_reset_link(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r.status_code == 200
        d = r.json()
        assert d.get("found") is True
        assert d.get("reset_link") and "/reset-password?token=" in d["reset_link"]

    def test_unknown_email_no_reset_link(self):
        r = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={"email": "inconnu@test.com"})
        assert r.status_code == 200
        d = r.json()
        assert d.get("found") is False
        assert d.get("reset_link") in (None, "")


# --- favorites ---
class TestFavorites:
    def test_favorites_require_auth(self):
        r = requests.get(f"{BASE_URL}/api/favorites")
        assert r.status_code == 401

    def test_add_get_remove_favorite(self, s, auth):
        # pick a product
        prods = requests.get(f"{BASE_URL}/api/products?limit=1").json()
        assert prods, "no products in DB"
        pid = prods[0]["id"]

        # add
        r = s.post(f"{BASE_URL}/api/favorites/{pid}")
        assert r.status_code == 200
        assert pid in r.json().get("favorites", [])

        # get list
        r = s.get(f"{BASE_URL}/api/favorites")
        assert r.status_code == 200
        favs = r.json()
        assert any(p["id"] == pid for p in favs)

        # remove
        r = s.delete(f"{BASE_URL}/api/favorites/{pid}")
        assert r.status_code == 200
        assert pid not in r.json().get("favorites", [])

    def test_add_invalid_product(self, s, auth):
        r = s.post(f"{BASE_URL}/api/favorites/notanid")
        assert r.status_code == 404
