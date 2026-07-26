import json

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from tests.conftest import paystack_signature


def test_confirm_payment_idempotent_on_replay(client: TestClient):
    """Webhook dedup ensures duplicate payloads return already_processed."""
    if not settings.paystack_secret_key:
        pytest.skip("PAYSTACK_SECRET_KEY required")

    payload = {
        "event": "charge.success",
        "data": {"reference": "idempotent_test_ref", "id": 888001, "status": "success"},
    }
    body = json.dumps(payload).encode()
    headers = {
        "Content-Type": "application/json",
        "x-paystack-signature": paystack_signature(body, settings.paystack_secret_key),
    }
    first = client.post("/webhooks/paystack", content=body, headers=headers)
    second = client.post("/webhooks/paystack", content=body, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "already_processed"
