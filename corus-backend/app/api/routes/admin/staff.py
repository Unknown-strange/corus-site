from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.deps import AdminUser, DbSession
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.auth import StaffCreateRequest, StaffPermissionsUpdateRequest, StaffResponse
from app.services.audit_service import log_action
from app.utils.staff import parse_staff_permissions, staff_to_response

router = APIRouter(prefix="/admin/staff", tags=["admin-staff"])


@router.post("", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreateRequest, admin: AdminUser, db: DbSession) -> StaffResponse:
    permissions = parse_staff_permissions(payload.permissions)
    staff = User(
        email=payload.email.lower(),
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=UserRole.staff,
        email_verified=True,
        created_by_id=admin.id,
        permissions=permissions,
    )
    db.add(staff)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email or username already in use",
        )
    db.refresh(staff)
    log_action(
        db,
        actor=admin,
        action="staff.created",
        resource_type="staff",
        resource_id=str(staff.id),
        metadata={"permissions": permissions},
    )
    db.commit()
    return staff_to_response(staff)


@router.get("", response_model=list[StaffResponse])
def list_staff(admin: AdminUser, db: DbSession) -> list[StaffResponse]:
    staff_members = (
        db.query(User)
        .filter(User.role == UserRole.staff)
        .order_by(User.created_at.desc())
        .all()
    )
    return [staff_to_response(member) for member in staff_members]


@router.patch("/{staff_id}/permissions", response_model=StaffResponse)
def update_staff_permissions(
    staff_id: UUID,
    payload: StaffPermissionsUpdateRequest,
    admin: AdminUser,
    db: DbSession,
) -> StaffResponse:
    staff = db.get(User, staff_id)
    if staff is None or staff.role != UserRole.staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    permissions = parse_staff_permissions(payload.permissions)
    staff.permissions = permissions
    db.add(staff)
    log_action(
        db,
        actor=admin,
        action="staff.permissions_updated",
        resource_type="staff",
        resource_id=str(staff.id),
        metadata={"permissions": permissions},
    )
    db.commit()
    db.refresh(staff)
    return staff_to_response(staff)


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_staff(staff_id: UUID, admin: AdminUser, db: DbSession) -> None:
    staff = db.get(User, staff_id)
    if staff is None or staff.role != UserRole.staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Staff member not found",
        )

    staff.is_active = False
    db.add(staff)
    log_action(
        db,
        actor=admin,
        action="staff.deactivated",
        resource_type="staff",
        resource_id=str(staff.id),
    )
    db.commit()
