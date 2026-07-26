from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password


def test_staff_finance_rbac(client: TestClient, admin_headers: dict):
    db = SessionLocal()
    username = "rbac_finance_staff"
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            existing.permissions = ["finance.view"]
            existing.is_active = True
            db.add(existing)
        else:
            staff = User(
                email="rbac_finance@example.com",
                username=username,
                hashed_password=hash_password("StaffPass123"),
                role=UserRole.staff,
                email_verified=True,
                permissions=["finance.view"],
            )
            db.add(staff)
        db.commit()
    finally:
        db.close()

    login = client.post(
        "/auth/login",
        json={"username": username, "password": "StaffPass123"},
    )
    assert login.status_code == 200
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    summary = client.get("/admin/finance/summary", headers=headers)
    assert summary.status_code == 200

    payments = client.get("/admin/payments", headers=headers, params={"page": 1, "limit": 5})
    assert payments.status_code == 403
    assert payments.json()["error"]["code"] == "forbidden"
