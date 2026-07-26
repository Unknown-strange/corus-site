from fastapi.testclient import TestClient

from app.core.rate_limit import limiter


def test_login_rate_limit_returns_429(client: TestClient):
    limiter.enabled = True
    if hasattr(limiter, "_storage") and hasattr(limiter._storage, "storage"):
        limiter._storage.storage.clear()

    payload = {"username": "rate_limit_test_user", "password": "wrongpassword123"}
    for _ in range(10):
        client.post("/auth/login", json=payload)
    response = client.post("/auth/login", json=payload)
    assert response.status_code == 429
    body = response.json()
    assert body["error"]["code"] == "rate_limit_exceeded"

    limiter.enabled = False
