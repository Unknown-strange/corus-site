from fastapi import HTTPException, status

from app.core.permissions import normalize_permissions
from app.models.user import User
from app.schemas.auth import StaffResponse


def staff_to_response(user: User) -> StaffResponse:
    return StaffResponse(
        id=user.id,
        email=user.email or "",
        username=user.username or "",
        role=user.role.value,
        is_active=user.is_active,
        permissions=list(user.permissions or []),
        created_at=user.created_at,
    )


def parse_staff_permissions(permissions: list[str]) -> list[str]:
    try:
        return normalize_permissions(permissions)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
