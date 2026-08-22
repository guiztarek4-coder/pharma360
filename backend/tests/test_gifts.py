"""Tests for gift ideas, gift packs, and gift card settings"""
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
BASE = BASE.rstrip("/")

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PW = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


def test_public_gift_ideas():
    r = requests.get(f"{BASE}/api/gift-ideas", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert "intro" in d and "featured" in d and "packs" in d
    assert isinstance(d["featured"], list)
    assert isinstance(d["packs"], list)


def test_admin_gift_packs_requires_auth():
    r = requests.get(f"{BASE}/api/admin/gift-packs", timeout=15)
    assert r.status_code in (401, 403)


def test_admin_gift_packs_list(admin_session):
    r = admin_session.get(f"{BASE}/api/admin/gift-packs", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def _get_product_ids(n=2):
    r = requests.get(f"{BASE}/api/products?limit=5", timeout=15)
    if r.status_code != 200:
        return []
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    return [p["id"] for p in items[:n]]


def test_gift_pack_crud_and_visibility(admin_session):
    pids = _get_product_ids(2)
    payload = {
        "name": "TEST_Coffret Bien-etre",
        "description": "TEST pack description",
        "image": None,
        "product_ids": pids,
        "price": 4500,
        "enabled": True,
    }
    # CREATE
    r = admin_session.post(f"{BASE}/api/admin/gift-packs", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    created = r.json()
    assert created["name"] == payload["name"]
    assert created["price"] == 4500
    assert "id" in created
    pid = created["id"]

    # LIST contains it
    r = admin_session.get(f"{BASE}/api/admin/gift-packs", timeout=15)
    assert any(p["id"] == pid for p in r.json())

    # Public gift-ideas contains it
    r = requests.get(f"{BASE}/api/gift-ideas", timeout=15)
    assert r.status_code == 200
    assert any(p["id"] == pid for p in r.json()["packs"])

    # UPDATE
    payload["price"] = 5000
    payload["name"] = "TEST_Coffret Bien-etre v2"
    r = admin_session.put(f"{BASE}/api/admin/gift-packs/{pid}", json=payload, timeout=15)
    assert r.status_code == 200
    assert r.json()["price"] == 5000
    assert r.json()["name"] == "TEST_Coffret Bien-etre v2"

    # DELETE
    r = admin_session.delete(f"{BASE}/api/admin/gift-packs/{pid}", timeout=15)
    assert r.status_code == 200

    # Not in list anymore
    r = admin_session.get(f"{BASE}/api/admin/gift-packs", timeout=15)
    assert not any(p["id"] == pid for p in r.json())


def test_settings_giftcard_and_gift_intro(admin_session):
    # Fetch current settings
    r = admin_session.get(f"{BASE}/api/settings", timeout=15)
    assert r.status_code == 200, r.text
    s = r.json()
    original_intro = s.get("gift_intro", "")
    original_amounts = s.get("giftcard_amounts", [1000, 2000, 3000, 5000])
    original_terms = s.get("giftcard_terms", "")
    original_enabled = s.get("giftcard_enabled", True)

    # Update
    new_intro = "TEST intro cadeaux 12345"
    new_amounts = [1500, 2500, 4000, 7500]
    new_terms = "TEST modalites carte cadeau"
    s["gift_intro"] = new_intro
    s["giftcard_amounts"] = new_amounts
    s["giftcard_terms"] = new_terms
    s["giftcard_enabled"] = True
    r = admin_session.put(f"{BASE}/api/settings", json=s, timeout=15)
    assert r.status_code == 200, r.text

    # Verify public reflect
    r = requests.get(f"{BASE}/api/gift-ideas", timeout=15)
    assert r.json()["intro"] == new_intro

    r = requests.get(f"{BASE}/api/settings", timeout=15)
    pub = r.json()
    assert pub.get("giftcard_amounts") == new_amounts
    assert pub.get("giftcard_terms") == new_terms

    # Restore
    s["gift_intro"] = original_intro
    s["giftcard_amounts"] = original_amounts
    s["giftcard_terms"] = original_terms
    s["giftcard_enabled"] = original_enabled
    admin_session.put(f"{BASE}/api/settings", json=s, timeout=15)
