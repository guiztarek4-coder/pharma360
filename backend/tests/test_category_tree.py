"""Backend tests for 3-level category tree feature (Pharma360)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://wellness-pharma-dz.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PW = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def tree():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    return r.json()


# ---------- GET /api/categories (tree) ----------
class TestCategoryTree:
    def test_top_level_has_13(self, tree):
        assert isinstance(tree, list)
        assert len(tree) == 13, f"expected 13 top-level cats, got {len(tree)}"

    def test_top_level_have_children_subs(self, tree):
        for main in tree:
            assert main["level"] == 0
            assert main.get("parent_id") is None
            assert isinstance(main.get("children"), list)
            assert len(main["children"]) == 2, f"{main['label']} expected 2 subs"
            for sub in main["children"]:
                assert sub["level"] == 1
                assert sub["parent_id"] == main["id"]
                assert len(sub["children"]) == 2, f"{sub['label']} expected 2 leaves"
                for leaf in sub["children"]:
                    assert leaf["level"] == 2
                    assert leaf["parent_id"] == sub["id"]
                    assert leaf["children"] == []

    def test_images_present(self, tree):
        # All nodes have image string
        for main in tree:
            assert main.get("image")
            for sub in main["children"]:
                assert sub.get("image")


# ---------- GET /api/categories/{id} ----------
class TestCategoryDetail:
    def test_leaf_ancestors_and_children(self, tree):
        main = tree[0]
        sub = main["children"][0]
        leaf = sub["children"][0]
        r = requests.get(f"{API}/categories/{leaf['id']}")
        assert r.status_code == 200
        data = r.json()
        assert data["category"]["id"] == leaf["id"]
        assert len(data["ancestors"]) == 2
        assert data["ancestors"][0]["id"] == main["id"]
        assert data["ancestors"][1]["id"] == sub["id"]
        assert data["children"] == []

    def test_main_ancestors_empty(self, tree):
        main = tree[0]
        r = requests.get(f"{API}/categories/{main['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["ancestors"] == []
        assert len(d["children"]) == 2

    def test_invalid_id_404(self):
        r = requests.get(f"{API}/categories/nonexistent-xxx")
        assert r.status_code == 404


# ---------- Products filtered by leaf ----------
class TestProductsByLeaf:
    def test_leaf_has_products(self, tree):
        leaf = tree[0]["children"][0]["children"][0]
        r = requests.get(f"{API}/products", params={"category_id": leaf["id"]})
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) >= 1, "expected products for leaf"
        for p in prods:
            assert p["category_id"] == leaf["id"]

    def test_total_products_around_104(self):
        r = requests.get(f"{API}/products", params={"limit": 500})
        assert r.status_code == 200
        prods = r.json()
        assert 90 <= len(prods) <= 130, f"unexpected total products: {len(prods)}"


# ---------- Admin CRUD + depth limit ----------
class TestCategoryCRUD:
    created = {}

    def test_create_main(self, admin_session):
        r = admin_session.post(f"{API}/categories",
                               json={"label": "TEST_MainCat", "parent_id": None, "order": 999})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["level"] == 0
        assert d["parent_id"] is None
        self.__class__.created["main"] = d["id"]

    def test_create_sub(self, admin_session):
        r = admin_session.post(f"{API}/categories",
                               json={"label": "TEST_SubCat", "parent_id": self.created["main"]})
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == 1
        self.__class__.created["sub"] = d["id"]

    def test_create_leaf(self, admin_session):
        r = admin_session.post(f"{API}/categories",
                               json={"label": "TEST_LeafCat", "parent_id": self.created["sub"]})
        assert r.status_code == 200
        d = r.json()
        assert d["level"] == 2
        self.__class__.created["leaf"] = d["id"]

    def test_reject_4th_level(self, admin_session):
        r = admin_session.post(f"{API}/categories",
                               json={"label": "TEST_TooDeep", "parent_id": self.created["leaf"]})
        assert r.status_code == 400, f"expected 400, got {r.status_code} - {r.text}"

    def test_update_category(self, admin_session):
        r = admin_session.put(f"{API}/categories/{self.created['main']}",
                              json={"label": "TEST_MainCat_Renamed", "order": 500})
        assert r.status_code == 200
        assert r.json()["label"] == "TEST_MainCat_Renamed"
        # verify via GET
        g = requests.get(f"{API}/categories/{self.created['main']}")
        assert g.json()["category"]["label"] == "TEST_MainCat_Renamed"

    def test_product_on_leaf_and_delete_cascade(self, admin_session):
        # Create product pointing to leaf
        pr = admin_session.post(f"{API}/products", json={
            "name": "TEST_ProductLeaf", "brand": "TestBrand", "category": "test",
            "category_id": self.created["leaf"], "description": "x", "price": 100, "stock": 5,
        })
        assert pr.status_code == 200
        pid = pr.json()["id"]
        # filter should return it
        lst = requests.get(f"{API}/products", params={"category_id": self.created["leaf"]}).json()
        assert any(p["id"] == pid for p in lst)
        # Delete main -> should cascade delete sub + leaf
        d = admin_session.delete(f"{API}/categories/{self.created['main']}")
        assert d.status_code == 200
        assert requests.get(f"{API}/categories/{self.created['main']}").status_code == 404
        assert requests.get(f"{API}/categories/{self.created['sub']}").status_code == 404
        assert requests.get(f"{API}/categories/{self.created['leaf']}").status_code == 404
        # cleanup product
        admin_session.delete(f"{API}/products/{pid}")


# ---------- Auth required ----------
class TestCategoryAuth:
    def test_create_requires_admin(self):
        r = requests.post(f"{API}/categories", json={"label": "nope"})
        assert r.status_code in (401, 403)
