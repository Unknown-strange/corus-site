from collections.abc import Callable, Generator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.permissions import StaffPermission
from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(db: DbSession, token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def user_has_permission(user: User, permission: StaffPermission | str) -> bool:
    if user.role == UserRole.admin:
        return True
    if user.role != UserRole.staff:
        return False
    perm_value = permission.value if isinstance(permission, StaffPermission) else permission
    staff_permissions = user.permissions or []
    return perm_value in staff_permissions


def user_has_any_permission(user: User, *permissions: StaffPermission) -> bool:
    return any(user_has_permission(user, perm) for perm in permissions)


def require_admin(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_customer(current_user: CurrentUser) -> User:
    if current_user.role != UserRole.customer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )
    return current_user


def require_staff_or_admin(current_user: CurrentUser) -> User:
    if current_user.role not in (UserRole.admin, UserRole.staff):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff or admin access required",
        )
    return current_user


def require_permission(permission: StaffPermission) -> Callable[..., User]:
    def _checker(current_user: CurrentUser) -> User:
        if not user_has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission.value}",
            )
        return current_user

    return _checker


def require_any_permission(*permissions: StaffPermission) -> Callable[..., User]:
    def _checker(current_user: CurrentUser) -> User:
        if not user_has_any_permission(current_user, *permissions):
            perm_list = ", ".join(p.value for p in permissions)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of these permissions required: {perm_list}",
            )
        return current_user

    return _checker


CustomerUser = Annotated[User, Depends(require_customer)]

AdminUser = Annotated[User, Depends(require_admin)]

StaffOrAdminUser = Annotated[User, Depends(require_staff_or_admin)]
