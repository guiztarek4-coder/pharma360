"""Iteration 13 — Footer 5-columns + CMS pages backend tests."""
import os, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://wellness-pharma-dz.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PASS = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE}/api/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


def test_settings_footer_fields():
    r = requests.get(f"{BASE}/api/settings")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("footer_about"), str) and len(d["footer_about"]) > 20
    news = d.get("footer_news_links") or []
    help_ = d.get("footer_help_links") or []
    assert len(news) >= 4, f"expected >=4 news links, got {len(news)}"
    assert len(help_) >= 8, f"expected >=8 help links, got {len(help_)}"
    labels = [l["label"].lower() for l in help_]
    assert any("confidential" in x for x in labels)
    assert any("cgv" in x for x in labels)


def test_public_page_faq_ok():
    r = requests.get(f"{BASE}/api/pages/faq")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "faq"
    assert data.get("title") and data.get("content")


def test_public_page_notfound():
    r = requests.get(f"{BASE}/api/pages/inexistant-xyz-404")
    assert r.status_code == 404


def test_admin_pages_list(admin_session):
    r = admin_session.get(f"{BASE}/api/admin/pages")
    assert r.status_code == 200
    pages = r.json()
    assert isinstance(pages, list) and len(pages) >= 9
    slugs = {p["slug"] for p in pages}
    for expected in ["faq", "carte-cadeau", "programme-fidelite", "retour-produit"]:
        assert expected in slugs


def test_admin_page_crud(admin_session):
    payload = {"title": "TEST_Iteration13 Page", "content": "Contenu de test", "enabled": True}
    r = admin_session.post(f"{BASE}/api/admin/pages", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    pid = created["id"]
    slug = created["slug"]
    assert created["title"] == payload["title"]

    # public GET works
    r2 = requests.get(f"{BASE}/api/pages/{slug}")
    assert r2.status_code == 200
    assert r2.json()["content"] == "Contenu de test"

    # update
    r3 = admin_session.put(f"{BASE}/api/admin/pages/{pid}", json={"title": created["title"], "content": "Nouveau contenu", "enabled": True})
    assert r3.status_code == 200
    assert r3.json()["content"] == "Nouveau contenu"

    # verify GET reflects update
    r4 = requests.get(f"{BASE}/api/pages/{slug}")
    assert r4.json()["content"] == "Nouveau contenu"

    # delete
    r5 = admin_session.delete(f"{BASE}/api/admin/pages/{pid}")
    assert r5.status_code == 200
    r6 = requests.get(f"{BASE}/api/pages/{slug}")
    assert r6.status_code == 404


def test_footer_settings_update(admin_session):
    # get current
    cur = requests.get(f"{BASE}/api/settings").json()
    original_about = cur.get("footer_about")
    original_news = cur.get("footer_news_links") or []

    new_about = original_about + " [TEST_ITER13]"
    r = admin_session.put(f"{BASE}/api/settings", json={
        "footer_about": new_about,
        "whatsapp_url": cur.get("whatsapp_url") or "",
        "footer_news_links": original_news,
        "footer_help_links": cur.get("footer_help_links") or [],
    })
    assert r.status_code == 200, r.text

    # verify GET reflects
    got = requests.get(f"{BASE}/api/settings").json()
    assert got["footer_about"] == new_about

    # restore
    admin_session.put(f"{BASE}/api/settings", json={
        "footer_about": original_about,
        "whatsapp_url": cur.get("whatsapp_url") or "",
        "footer_news_links": original_news,
        "footer_help_links": cur.get("footer_help_links") or [],
    })
