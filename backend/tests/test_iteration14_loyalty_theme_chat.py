"""Backend regression tests for iteration 14: loyalty, chat, theme settings."""
import os, uuid, requests, pytest
from pathlib import Path

def _load_env():
    p = Path("/app/frontend/.env")
    for line in p.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("REACT_APP_BACKEND_URL missing")

BASE = _load_env().rstrip("/") + "/api"
ADMIN = {"identifier": "pharmacie360benak@gmail.com", "password": "Aminetarek1992*"}


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/auth/login", json=ADMIN)
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def user_session():
    s = requests.Session()
    email = f"TEST_iter14_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{BASE}/auth/register", json={
        "first_name": "Loy", "last_name": "Test", "email": email, "password": "Test1234!"
    })
    assert r.status_code in (200, 201), r.text
    return s, email


# --- Loyalty ---

def test_loyalty_config_public():
    r = requests.get(f"{BASE}/loyalty/config")
    assert r.status_code == 200
    d = r.json()
    assert d.get("enabled") is True
    assert isinstance(d.get("rewards"), list) and len(d["rewards"]) >= 1
    assert isinstance(d.get("tiers"), list) and len(d["tiers"]) >= 1


def test_loyalty_me_new_user(user_session):
    s, _ = user_session
    r = s.get(f"{BASE}/loyalty/me")
    assert r.status_code == 200
    d = r.json()
    assert d["points"] == 0
    assert d["lifetime"] == 0
    assert d["tier"]["name"] in ("Bronze", "Argent", "Or")


def test_loyalty_redeem_insufficient(user_session):
    s, _ = user_session
    cfg = requests.get(f"{BASE}/loyalty/config").json()
    rid = cfg["rewards"][0]["id"]
    r = s.post(f"{BASE}/loyalty/redeem", json={"reward_id": rid})
    assert r.status_code in (400, 402, 403)


# --- Chat ---

def test_chat_flow_and_admin_reply(admin_session):
    # Public start
    r = requests.post(f"{BASE}/chat/start", json={"name": "TEST_visitor", "email": ""})
    assert r.status_code == 200
    conv_id = r.json()["id"]
    # Post message
    r2 = requests.post(f"{BASE}/chat/{conv_id}/message", json={"text": "Bonjour test"})
    assert r2.status_code == 200
    # Get messages
    r3 = requests.get(f"{BASE}/chat/{conv_id}/messages")
    assert r3.status_code == 200
    assert len(r3.json()) >= 1
    # Admin list
    r4 = admin_session.get(f"{BASE}/admin/chat/conversations")
    assert r4.status_code == 200
    assert any(c["id"] == conv_id for c in r4.json())
    # Admin reply
    r5 = admin_session.post(f"{BASE}/admin/chat/{conv_id}/reply", json={"text": "Bonjour, comment puis-je aider ?"})
    assert r5.status_code == 200
    # User sees reply
    r6 = requests.get(f"{BASE}/chat/{conv_id}/messages")
    assert any(m["sender"] == "admin" for m in r6.json())


# --- Theme settings ---

def test_theme_settings_roundtrip(admin_session):
    r = admin_session.get(f"{BASE}/settings")
    assert r.status_code == 200
    orig = r.json()
    orig_mode = orig.get("theme_mode", "auto")
    orig_manual = orig.get("theme_manual", "summer")
    try:
        # Set manual autumn
        up = admin_session.put(f"{BASE}/settings", json={"theme_mode": "manual", "theme_manual": "autumn"})
        assert up.status_code == 200
        r2 = requests.get(f"{BASE}/settings").json()
        assert r2.get("theme_mode") == "manual"
        assert r2.get("theme_manual") == "autumn"
    finally:
        admin_session.put(f"{BASE}/settings", json={"theme_mode": orig_mode, "theme_manual": orig_manual})
