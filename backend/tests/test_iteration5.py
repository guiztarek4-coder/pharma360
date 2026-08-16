"""Iteration 5 backend tests: customer email, sender_email setting, order status + non-fatal SMS."""
import os, uuid, time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "pharmacie360benak@gmail.com"
ADMIN_PW = "Aminetarek1992*"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"identifier": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="module")
def product_id():
    r = requests.get(f"{BASE_URL}/api/products?limit=1")
    assert r.status_code == 200
    items = r.json()
    assert items, "seed missing"
    return items[0]["id"], items[0]["price"], items[0]["name"]


# --- Settings sender_email ---
def test_settings_has_sender_email():
    r = requests.get(f"{BASE_URL}/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert "sender_email" in data
    assert data["sender_email"]  # non-empty default


def test_admin_update_sender_email(admin_session):
    original = requests.get(f"{BASE_URL}/api/settings").json().get("sender_email")
    new_val = "onboarding@resend.dev"  # keep safe
    r = admin_session.put(f"{BASE_URL}/api/settings", json={"sender_email": new_val})
    assert r.status_code == 200
    assert r.json()["sender_email"] == new_val
    # verify persistence
    assert requests.get(f"{BASE_URL}/api/settings").json()["sender_email"] == new_val
    # restore
    if original and original != new_val:
        admin_session.put(f"{BASE_URL}/api/settings", json={"sender_email": original})


# --- Order with email ---
def _make_order_payload(product, email=None):
    pid, price, name = product
    return {
        "items": [{"product_id": pid, "name": name, "price": price, "quantity": 1}],
        "full_name": "TEST Iter5 Customer",
        "phone": "0555000000",
        "email": email,
        "wilaya": "Alger",
        "commune": "Bab Ezzouar",
        "street": "1 Rue Test",
        "payment_method": "cod",
        "delivery_method": "domicile",
        "promo_code": "",
        "notes": "iteration5 test",
    }


def test_create_order_with_email_stores_it_and_totals_ok(product_id):
    payload = _make_order_payload(product_id, email="TEST_iter5@example.com")
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    assert r.status_code == 200, r.text
    order = r.json()
    assert order["email"] == "test_iter5@example.com"  # lowercased
    subtotal = product_id[1]  # qty 1
    assert order["subtotal"] == subtotal
    assert order["total"] == order["subtotal"] + order["delivery"] - order["discount"]
    assert "id" in order and order["status"] == "En attente"


def test_create_order_without_email_ok(product_id):
    payload = _make_order_payload(product_id, email=None)
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    assert r.status_code == 200, r.text
    assert r.json().get("email") in (None, "")


def test_create_order_empty_email_ok(product_id):
    payload = _make_order_payload(product_id, email="")
    r = requests.post(f"{BASE_URL}/api/orders", json=payload)
    assert r.status_code == 200


# --- Order status updates (SMS non-fatal) ---
@pytest.mark.parametrize("status", ["En attente", "Confirmée", "Expédiée", "Livrée", "Annulée"])
def test_update_order_status_all_values(admin_session, product_id, status):
    # create order
    r = requests.post(f"{BASE_URL}/api/orders", json=_make_order_payload(product_id))
    assert r.status_code == 200
    oid = r.json()["id"]
    r2 = admin_session.put(f"{BASE_URL}/api/orders/{oid}/status", json={"status": status})
    assert r2.status_code == 200, r2.text
    assert r2.json()["status"] == status


def test_admin_notification_created(admin_session, product_id):
    before = admin_session.get(f"{BASE_URL}/api/notifications").json()
    before_count = len(before["notifications"])
    requests.post(f"{BASE_URL}/api/orders", json=_make_order_payload(product_id, email="TEST_notif@example.com"))
    time.sleep(0.3)
    after = admin_session.get(f"{BASE_URL}/api/notifications").json()
    assert len(after["notifications"]) >= before_count + 1
    assert after["notifications"][0]["type"] == "order"
