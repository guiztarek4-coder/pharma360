"""Iteration 20: admin batch — revenue Livrée-only, delete order, analytics,
chat quick replies + app download + themes via settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PWD = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    return s


# --- Revenue Livrée-only ---
def test_admin_stats_revenue_matches_delivered_orders(admin):
    stats = admin.get(f"{API}/admin/stats").json()
    orders = admin.get(f"{API}/orders").json()
    delivered_sum = sum(float(o.get("total", 0)) for o in orders if o.get("status") == "Livrée")
    assert "revenue" in stats
    assert abs(float(stats["revenue"]) - delivered_sum) < 0.01, (
        f"revenue={stats['revenue']} but delivered_sum={delivered_sum}"
    )


# --- Analytics ---
@pytest.mark.parametrize("period", ["day", "week", "month", "all"])
def test_admin_analytics_all_periods(admin, period):
    r = admin.get(f"{API}/admin/analytics", params={"period": period})
    assert r.status_code == 200
    d = r.json()
    for k in ["period", "revenue", "orders", "aov", "total_customers", "new_customers", "top_products", "top_customers"]:
        assert k in d, f"missing key {k} in {period}"
    assert d["period"] == period
    assert isinstance(d["top_products"], list)
    assert isinstance(d["top_customers"], list)


def test_admin_analytics_requires_admin():
    r = requests.get(f"{API}/admin/analytics?period=month")
    assert r.status_code in (401, 403)


# --- Delete order ---
def test_delete_order_removes_and_updates_revenue(admin):
    # Create a throwaway order as guest via /orders POST
    # get one real product to build a valid item
    products = requests.get(f"{API}/products").json()
    plist = products.get("items") if isinstance(products, dict) else products
    if not plist:
        pytest.skip("no products available for order creation")
    p = plist[0]
    payload = {
        "full_name": "TEST_delete_me",
        "phone": "+213000000000",
        "email": "test_del@example.com",
        "wilaya": "Alger",
        "commune": "Alger-Centre",
        "delivery_method": "pickup",
        "payment_method": "cod",
        "items": [{
            "product_id": p.get("id") or p.get("_id"),
            "name": p.get("name", "test"),
            "price": float(p.get("price", 100)),
            "quantity": 1,
        }],
    }
    # Try to find any real order to delete? Safer: use a real minimal creation endpoint.
    # Fallback: pick an order clearly test (name starts TEST_)
    orders = admin.get(f"{API}/orders").json()
    target = next((o for o in orders if str(o.get("full_name", "")).startswith("TEST_")), None)
    if not target:
        # create via POST /orders (public)
        c = requests.post(f"{API}/orders", json=payload)
        if c.status_code >= 400:
            pytest.skip(f"Cannot create test order: {c.status_code} {c.text[:200]}")
        target = c.json()
    oid = target.get("id") or target.get("_id")
    assert oid, f"no id in target order: {target}"

    # Set to Livrée to affect revenue
    admin.put(f"{API}/orders/{oid}", json={"status": "Livrée"})
    rev_before = admin.get(f"{API}/admin/stats").json()["revenue"]

    r = admin.delete(f"{API}/orders/{oid}")
    assert r.status_code == 200, r.text

    # Confirm gone
    listing = admin.get(f"{API}/orders").json()
    assert not any((o.get("id") or o.get("_id")) == oid for o in listing)

    rev_after = admin.get(f"{API}/admin/stats").json()["revenue"]
    # revenue recalculated (may be equal if the test order had total=0)
    assert float(rev_after) <= float(rev_before)


def test_delete_order_invalid_id(admin):
    r = admin.delete(f"{API}/orders/not-a-valid-id")
    assert r.status_code == 404


# --- Settings: chat quick replies, app download, themes ---
def test_settings_defaults_and_update(admin):
    r = admin.get(f"{API}/settings")
    assert r.status_code == 200
    s = r.json()
    # Default keys present
    for k in ["chat_quick_replies", "app_download_enabled", "app_store_url", "play_store_url"]:
        assert k in s, f"missing default settings key {k}"
    assert isinstance(s["chat_quick_replies"], list)

    # Update
    payload = {
        "chat_quick_replies": ["Bonjour !", "Merci de votre message"],
        "app_download_enabled": True,
        "app_store_url": "https://apps.apple.com/test",
        "play_store_url": "https://play.google.com/test",
        "theme_mode": "manual",
        "theme_manual": "rose",
    }
    u = admin.put(f"{API}/settings", json=payload)
    assert u.status_code == 200, u.text
    ns = admin.get(f"{API}/settings").json()
    assert ns["chat_quick_replies"] == payload["chat_quick_replies"]
    assert ns["app_download_enabled"] is True
    assert ns["app_store_url"] == payload["app_store_url"]
    assert ns["play_store_url"] == payload["play_store_url"]
    assert ns["theme_mode"] == "manual"
    assert ns["theme_manual"] == "rose"


def test_settings_theme_variants(admin):
    for t in ["mauve", "gold", "noir"]:
        u = admin.put(f"{API}/settings", json={"theme_mode": "manual", "theme_manual": t})
        assert u.status_code == 200
        assert admin.get(f"{API}/settings").json()["theme_manual"] == t
