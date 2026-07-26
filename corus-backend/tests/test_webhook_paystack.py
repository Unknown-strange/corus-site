import json

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from tests.conftest import paystack_signature


def test_webhook_rejects_invalid_signature(client: TestClient):
    body = json.dumps({"event": "charge.success", "data": {"reference": "test_ref"}}).encode()
    response = client.post(
        "/webhooks/paystack",
        content=body,
        headers={
            "Content-Type": "application/json",
            "x-paystack-signature": "invalid",
        },
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


@pytest.mark.skipif(
    not settings.paystack_secret_key,
    reason="PAYSTACK_SECRET_KEY required for signature test",
)
def test_webhook_accepts_valid_signature(client: TestClient):
    payload = {
        "event": "charge.success",
        "data": {"reference": "nonexistent_ref_12345", "id": 999001, "status": "success"},
    }
    body = json.dumps(payload).encode()
    sig = paystack_signature(body, settings.paystack_secret_key)
    response = client.post(
        "/webhooks/paystack",
        content=body,
        headers={
            "Content-Type": "application/json",
            "x-paystack-signature": sig,
        },
    )
    assert response.status_code == 200
    assert response.json()["status"] in {"ok", "already_processed"}


@pytest.mark.skipif(
    not settings.paystack_secret_key,
    reason="PAYSTACK_SECRET_KEY required for dedup test",
)
def test_webhook_duplicate_event_is_idempotent(client: TestClient):
    payload = {
        "event": "charge.success",
        "data": {"reference": "nonexistent_ref_dup", "id": 999002, "status": "success"},
    }
    body = json.dumps(payload).encode()
    sig = paystack_signature(body, settings.paystack_secret_key)
    headers = {
        "Content-Type": "application/json",
        "x-paystack-signature": sig,
    }
    first = client.post("/webhooks/paystack", content=body, headers=headers)
    second = client.post("/webhooks/paystack", content=body, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "already_processed"
