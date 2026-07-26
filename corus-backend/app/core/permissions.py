"""Staff permission catalog for admin-assigned RBAC."""

from enum import Enum


class StaffPermission(str, Enum):
    dashboard_view = "dashboard.view"
    orders_view = "orders.view"
    orders_manage = "orders.manage"
    bookings_view = "bookings.view"
    reservations_view = "reservations.view"
    reservations_approve = "reservations.approve"
    rentals_view = "rentals.view"
    rentals_manage = "rentals.manage"
    receipts_view = "receipts.view"
    payments_view = "payments.view"
    customers_view = "customers.view"
    products_view = "products.view"
    products_manage = "products.manage"
    cms_manage = "cms.manage"
    sessions_manage = "sessions.manage"
    finance_view = "finance.view"
    finance_manage = "finance.manage"


ADMIN_ONLY: frozenset[StaffPermission] = frozenset()

ALL_STAFF_PERMISSIONS: frozenset[str] = frozenset(p.value for p in StaffPermission)


def normalize_permissions(permissions: list[str] | None) -> list[str]:
    if not permissions:
        return []
    seen: set[str] = set()
    normalized: list[str] = []
    for perm in permissions:
        if perm not in ALL_STAFF_PERMISSIONS:
            raise ValueError(f"Unknown permission: {perm}")
        if perm not in seen:
            seen.add(perm)
            normalized.append(perm)
    return normalized
