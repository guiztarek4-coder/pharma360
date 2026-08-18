"""Iteration 7 – Bulk import (CSV/XLSX), category reorder, banner fields."""
import io
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PASSWORD = "Aminetarek1992*"

TEST_MAIN = "TEST_ImpMain"
TEST_SUB = "TEST_ImpSub"
TEST_LEAF = "TEST_ImpLeaf"
TEST_PRODUCT = "TEST_ImportedProd"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login",
               json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module", autouse=True)
def cleanup(admin_session):
    yield
    # Delete TEST_ categories (cascade) and orphaned test products
    r = admin_session.get(f"{API}/categories")
    if r.ok:
        def walk(nodes):
            out = []
            for n in nodes:
                out.append(n)
                out.extend(walk(n.get("children") or []))
            return out
        for n in walk(r.json()):
            if str(n.get("label", "")).startswith("TEST_"):
                admin_session.delete(f"{API}/categories/{n['id']}")
    # products
    rp = admin_session.get(f"{API}/products")
    if rp.ok:
        for p in rp.json():
            if str(p.get("name", "")).startswith("TEST_"):
                admin_session.delete(f"{API}/products/{p['id']}")


# ---------- Templates ----------
class TestTemplates:
    def test_categories_template_csv(self, admin_session):
        r = admin_session.get(f"{API}/admin/import/template/categories?format=csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.content.decode("utf-8-sig")
        assert "Catégorie" in text
        assert "Sous-catégorie" in text
        assert "Sous-sous-catégorie" in text
        assert "Image catégorie" in text

    def test_categories_template_xlsx(self, admin_session):
        r = admin_session.get(f"{API}/admin/import/template/categories?format=xlsx")
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert r.content[:2] == b"PK"  # xlsx zip magic

    def test_products_template_csv(self, admin_session):
        r = admin_session.get(f"{API}/admin/import/template/products?format=csv")
        assert r.status_code == 200
        text = r.content.decode("utf-8-sig")
        for h in ["Nom", "Marque", "Chemin catégorie", "Prix", "Ancien prix",
                  "Stock", "Description", "Image", "Badge",
                  "Coup de coeur", "Nouveau"]:
            assert h in text, f"missing header {h}"

    def test_products_template_xlsx(self, admin_session):
        r = admin_session.get(f"{API}/admin/import/template/products?format=xlsx")
        assert r.status_code == 200
        assert r.content[:2] == b"PK"

    def test_templates_require_admin(self):
        r = requests.get(f"{API}/admin/import/template/categories?format=csv")
        assert r.status_code in (401, 403)


# ---------- Category import ----------
class TestCategoryImport:
    def _csv(self):
        return (
            "Catégorie,Sous-catégorie,Sous-sous-catégorie\n"
            f"{TEST_MAIN},{TEST_SUB},{TEST_LEAF}\n"
            f"{TEST_MAIN},{TEST_SUB},{TEST_LEAF}2\n"
        ).encode("utf-8")

    def test_import_creates_tree(self, admin_session):
        files = {"file": ("cats.csv", self._csv(), "text/csv")}
        r = admin_session.post(f"{API}/admin/import/categories", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] >= 4  # main + sub + 2 leaves
        # Verify persisted
        cats = admin_session.get(f"{API}/categories").json()
        main = next((c for c in cats if c["label"] == TEST_MAIN), None)
        assert main is not None
        sub = next((c for c in main.get("children", []) if c["label"] == TEST_SUB), None)
        assert sub is not None
        leaves = [c["label"] for c in sub.get("children", [])]
        assert TEST_LEAF in leaves and f"{TEST_LEAF}2" in leaves

    def test_import_idempotent(self, admin_session):
        files = {"file": ("cats.csv", self._csv(), "text/csv")}
        r = admin_session.post(f"{API}/admin/import/categories", files=files)
        assert r.status_code == 200
        assert r.json()["created"] == 0  # no duplicates


# ---------- Product import ----------
class TestProductImport:
    def test_import_product_valid_path(self, admin_session):
        csv = (
            "Nom,Marque,Chemin catégorie,Prix,Stock,Description,Image,Coup de coeur,Nouveau\n"
            f"{TEST_PRODUCT},Acme,{TEST_MAIN} > {TEST_SUB} > {TEST_LEAF},1200,10,desc,,oui,non\n"
        ).encode("utf-8")
        files = {"file": ("p.csv", csv, "text/csv")}
        r = admin_session.post(f"{API}/admin/import/products", files=files)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] == 1
        assert data["errors"] == []

    def test_import_product_invalid_path(self, admin_session):
        csv = (
            "Nom,Chemin catégorie,Prix,Stock\n"
            f"{TEST_PRODUCT}_bad,Nonexistent > Foo > Bar,100,1\n"
        ).encode("utf-8")
        files = {"file": ("p.csv", csv, "text/csv")}
        r = admin_session.post(f"{API}/admin/import/products", files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 0
        assert len(data["errors"]) == 1
        assert data["errors"][0]["row"] == 2

    def test_import_product_non_leaf_path(self, admin_session):
        # Path stops at sub (which has children) — should error
        csv = (
            "Nom,Chemin catégorie,Prix,Stock\n"
            f"{TEST_PRODUCT}_nonleaf,{TEST_MAIN} > {TEST_SUB},100,1\n"
        ).encode("utf-8")
        files = {"file": ("p.csv", csv, "text/csv")}
        r = admin_session.post(f"{API}/admin/import/products", files=files)
        assert r.status_code == 200
        data = r.json()
        assert data["created"] == 0
        assert len(data["errors"]) == 1


# ---------- Reorder ----------
class TestReorder:
    def test_reorder_siblings(self, admin_session):
        cats = admin_session.get(f"{API}/categories").json()
        original_ids = [c["id"] for c in cats]
        assert len(original_ids) >= 3
        # Reverse order
        reversed_ids = list(reversed(original_ids))
        r = admin_session.put(f"{API}/categories/reorder",
                              json={"ids": reversed_ids})
        assert r.status_code == 200, r.text
        # Fetch again and verify new order
        new_cats = admin_session.get(f"{API}/categories").json()
        new_ids = [c["id"] for c in new_cats]
        assert new_ids == reversed_ids
        # Restore original
        admin_session.put(f"{API}/categories/reorder",
                          json={"ids": original_ids})

    def test_reorder_route_not_shadowed(self, admin_session):
        # Ensure PUT /categories/reorder is NOT interpreted as PUT /categories/{id}
        r = admin_session.put(f"{API}/categories/reorder",
                              json={"ids": []})
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Banner fields ----------
class TestBanner:
    def test_create_and_update_banner(self, admin_session):
        # Create a temp main category with banner
        payload = {
            "label": "TEST_BannerMain",
            "icon": "Tag",
            "banner_image": "https://example.com/b.jpg",
            "banner_title": "Titre bannière",
            "banner_subtitle": "Sous-titre",
            "banner_cta_label": "Voir plus",
            "banner_cta_link": "/promo",
        }
        r = admin_session.post(f"{API}/categories", json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        cid = created["id"]
        assert created["banner_title"] == "Titre bannière"
        assert created["banner_cta_link"] == "/promo"

        # GET reflects banner
        cats = admin_session.get(f"{API}/categories").json()
        node = next((c for c in cats if c["id"] == cid), None)
        assert node is not None
        assert node["banner_image"] == "https://example.com/b.jpg"
        assert node["banner_subtitle"] == "Sous-titre"

        # Update banner
        payload["banner_title"] = "Nouveau titre"
        r = admin_session.put(f"{API}/categories/{cid}", json=payload)
        assert r.status_code == 200
        assert r.json()["banner_title"] == "Nouveau titre"

        # Cleanup
        admin_session.delete(f"{API}/categories/{cid}")
