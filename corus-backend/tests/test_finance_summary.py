from decimal import Decimal

from fastapi.testclient import TestClient

from app.services.finance_service import current_month_bounds_utc


def test_finance_summary_after_manual_expense(client: TestClient, admin_headers: dict):
    before = client.get("/admin/finance/summary", headers=admin_headers)
    assert before.status_code == 200
    income_before = Decimal(before.json()["total_income_ghs"])

    # The default summary period is the current month, so the record must land inside it.
    period_start, _ = current_month_bounds_utc()

    create = client.post(
        "/admin/finance/records",
        headers=admin_headers,
        json={
            "record_type": "expense",
            "amount_ghs": "25.00",
            "record_date": period_start.isoformat(),
            "category": "supplies",
            "description": "pytest expense",
            "source_label": "Test",
        },
    )
    assert create.status_code == 201

    after = client.get("/admin/finance/summary", headers=admin_headers)
    assert after.status_code == 200
    data = after.json()
    expenses = Decimal(data["total_expenses_ghs"])
    profit = Decimal(data["profit_ghs"])
    income = Decimal(data["total_income_ghs"])
    assert expenses >= Decimal("25.00")
    assert profit == income - expenses
    assert income == income_before
