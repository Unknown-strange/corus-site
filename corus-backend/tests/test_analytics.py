import pytest
from fastapi.testclient import TestClient

TREND_PATHS = [
    "/admin/analytics/bookings",
    "/admin/analytics/rentals",
    "/admin/analytics/products",
]


@pytest.mark.parametrize("path", TREND_PATHS + ["/admin/analytics/overview"])
def test_analytics_requires_auth(client: TestClient, path: str):
    response = client.get(path)
    assert response.status_code == 401


@pytest.mark.parametrize("path", TREND_PATHS)
def test_trend_response_shape(client: TestClient, admin_headers: dict, path: str):
    response = client.get(path, headers=admin_headers, params={"interval": "month"})
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["interval"] == "month"
    assert isinstance(data["points"], list)
    assert isinstance(data["top_items"], list)
    assert data["total_count"] >= 0

    for point in data["points"]:
        assert {"bucket", "count", "revenue_ghs"} <= point.keys()


def test_overview_includes_all_three_trends(client: TestClient, admin_headers: dict):
    response = client.get("/admin/analytics/overview", headers=admin_headers)
    assert response.status_code == 200, response.text

    data = response.json()
    assert {"bookings", "rentals", "products"} <= data.keys()
    assert data["studio_timezone"]


def test_invalid_interval_rejected(client: TestClient, admin_headers: dict):
    response = client.get(
        "/admin/analytics/bookings",
        headers=admin_headers,
        params={"interval": "century"},
    )
    assert response.status_code == 422


def test_start_after_end_rejected(client: TestClient, admin_headers: dict):
    response = client.get(
        "/admin/analytics/bookings",
        headers=admin_headers,
        params={"start": "2026-08-01", "end": "2026-07-01"},
    )
    assert response.status_code == 400


def test_empty_range_returns_zero_totals(client: TestClient, admin_headers: dict):
    response = client.get(
        "/admin/analytics/rentals",
        headers=admin_headers,
        params={"start": "2000-01-01", "end": "2000-01-31", "interval": "month"},
    )
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["total_count"] == 0
    assert data["top_items"] == []
    assert len(data["points"]) == 1
    assert data["points"][0]["count"] == 0
