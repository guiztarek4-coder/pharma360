"""
Iteration 8: category-scoped search + low-stock alerts.
Tests:
- GET /api/products?category_id={id} returns subtree products (main -> all descendants)
- GET /api/products?category_id={id}&search=... scopes search to subtree
- GET /api/admin/stats returns low_stock + low_stock_threshold
- GET /api/admin/low-stock returns {threshold, products:[]} sorted asc
- PUT /api/settings low_stock_threshold persists and affects stats

Baseline is preserved: any modified product stock is reset to 30 at teardown.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PWD = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def categories():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    return r.json()


# ---- Category subtree scoping ----------------------------------------------

def test_subtree_main_category_returns_all_descendants(categories):
    # Pick a main with at least one product in subtree
    mains = categories  # top-level list
    assert len(mains) == 13, f"expected 13 mains, got {len(mains)}"

    # Iterate mains to find one with >0 products in subtree
    picked = None
    for m in mains:
        r = requests.get(f"{API}/products", params={"category_id": m["id"], "limit": 500})
        assert r.status_code == 200
        prods = r.json()
        if len(prods) > 0:
            picked = (m, prods)
            break
    assert picked, "no main category returned products in subtree"
    main, prods_subtree = picked

    # Confirm products' category_id are descendants (or main itself)
    def collect_ids(node):
        ids = [node["id"]]
        for c in node.get("children", []) or []:
            ids += collect_ids(c)
        return ids
    subtree_ids = set(collect_ids(main))
    for p in prods_subtree:
        assert p.get("category_id") in subtree_ids, f"product {p['id']} category_id not in subtree"

    # Now the EXACT category (top-level) should typically not contain products
    # because products live on leaves. Ensure returned count > count for a single leaf.
    # Find a leaf under this main
    def first_leaf(node):
        kids = node.get("children") or []
        if not kids:
            return node
        for c in kids:
            l = first_leaf(c)
            if l:
                return l
        return node
    leaf = first_leaf(main)
    r_leaf = requests.get(f"{API}/products", params={"category_id": leaf["id"], "limit": 500})
    assert r_leaf.status_code == 200
    prods_leaf = r_leaf.json()
    # subtree should be >= leaf count
    assert len(prods_subtree) >= len(prods_leaf)


def test_scoped_search_within_category(categories):
    # Get any product, take a distinctive word from its name and check scoping
    r_all = requests.get(f"{API}/products", params={"limit": 5})
    assert r_all.status_code == 200
    sample = r_all.json()
    assert sample, "no products"
    p = sample[0]
    cat_id = p["category_id"]
    # find the main that contains this category
    def find_main_of(node, target):
        if node["id"] == target:
            return True
        for c in node.get("children", []) or []:
            if find_main_of(c, target):
                return True
        return False
    main = next((m for m in categories if find_main_of(m, cat_id)), None)
    assert main, "could not locate main for product's category"

    term = p["name"].split()[0]
    r_scoped = requests.get(f"{API}/products", params={"category_id": main["id"], "search": term, "limit": 200})
    assert r_scoped.status_code == 200
    results = r_scoped.json()
    # every returned product must be in that main's subtree
    def collect_ids(node):
        ids = [node["id"]]
        for c in node.get("children", []) or []:
            ids += collect_ids(c)
        return ids
    subtree_ids = set(collect_ids(main))
    for pr in results:
        assert pr.get("category_id") in subtree_ids

    # And a search scoped to a *different* main should NOT contain our product
    other = next((m for m in categories if m["id"] != main["id"]), None)
    if other:
        r_other = requests.get(f"{API}/products", params={"category_id": other["id"], "search": term, "limit": 200})
        assert r_other.status_code == 200
        ids_other = {x["id"] for x in r_other.json()}
        assert p["id"] not in ids_other


# ---- Admin stats low-stock -------------------------------------------------

def test_admin_stats_has_low_stock_fields(admin_session):
    r = admin_session.get(f"{API}/admin/stats")
    assert r.status_code == 200
    data = r.json()
    assert "low_stock" in data
    assert "low_stock_threshold" in data
    assert isinstance(data["low_stock"], int)
    assert isinstance(data["low_stock_threshold"], int)


def test_admin_low_stock_endpoint(admin_session):
    r = admin_session.get(f"{API}/admin/low-stock")
    assert r.status_code == 200
    data = r.json()
    assert "threshold" in data and "products" in data
    assert isinstance(data["products"], list)
    # sorted ascending by stock
    stocks = [p["stock"] for p in data["products"]]
    assert stocks == sorted(stocks)
    # every product should have stock <= threshold
    for p in data["products"]:
        assert p["stock"] <= data["threshold"]


# ---- Full workflow: threshold + low_stock toggling -------------------------

def test_threshold_persist_and_low_stock_recompute(admin_session):
    # Fetch original settings
    r_set = admin_session.get(f"{API}/settings")
    assert r_set.status_code == 200
    orig_settings = r_set.json()
    orig_threshold = orig_settings.get("low_stock_threshold", 5)

    # Pick a product and set its stock to 2
    r_p = requests.get(f"{API}/products", params={"limit": 1})
    prod = r_p.json()[0]
    pid = prod["id"]
    orig_stock = prod["stock"]

    try:
        # Set threshold to 3 and stock to 2 -> should show up as low_stock=1
        r1 = admin_session.put(f"{API}/settings", json={"low_stock_threshold": 3})
        assert r1.status_code == 200
        r_stat_before = admin_session.get(f"{API}/admin/stats").json()
        # Update product stock to 2 - PUT requires full body
        full = {k: v for k, v in prod.items() if k != "id"}
        full["stock"] = 2
        upd = admin_session.put(f"{API}/products/{pid}", json=full)
        assert upd.status_code == 200, upd.text
        assert upd.json()["stock"] == 2

        # GET low_stock count and low-stock list
        stat = admin_session.get(f"{API}/admin/stats").json()
        assert stat["low_stock_threshold"] == 3
        assert stat["low_stock"] >= 1

        lst = admin_session.get(f"{API}/admin/low-stock").json()
        assert lst["threshold"] == 3
        assert any(p["id"] == pid for p in lst["products"])

        # Raise threshold-below (0), our product no longer low
        admin_session.put(f"{API}/settings", json={"low_stock_threshold": 0})
        stat2 = admin_session.get(f"{API}/admin/stats").json()
        assert stat2["low_stock_threshold"] == 0
        # products with stock<=0 only
        assert stat2["low_stock"] <= stat["low_stock"]
    finally:
        # Restore threshold and stock
        admin_session.put(f"{API}/settings", json={"low_stock_threshold": orig_threshold})
        full = {k: v for k, v in prod.items() if k != "id"}
        full["stock"] = orig_stock
        admin_session.put(f"{API}/products/{pid}", json=full)
        # Verify restoration
        vr = requests.get(f"{API}/products/{pid}")
        assert vr.json()["stock"] == orig_stock


def test_baseline_restored():
    # 13 mains, low_stock back to 0 with default threshold
    cats = requests.get(f"{API}/categories").json()
    assert len(cats) == 13
    # login admin quickly
    s = requests.Session()
    s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PWD})
    stat = s.get(f"{API}/admin/stats").json()
    assert stat["low_stock_threshold"] == 5
    assert stat["low_stock"] == 0, f"low_stock should be 0, got {stat['low_stock']}"
