from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from app.core.admin_deps import (
    RentalsManageUser,
    RentalsViewUser,
    ReservationsApproveUser,
    ReservationsViewUser,
)
from app.core.deps import DbSession
from app.models.equipment_for_rent import EquipmentForRent
from app.models.rental_request import RentalRequest, RentalStatus
from app.models.studio_reservation import ReservationStatus, StudioReservation
from app.models.user import User
from app.schemas.pagination import PaginatedResponse, build_paginated_response
from app.schemas.rental import (
    RentalAdminResponse,
    RentEquipmentAdminResponse,
    RentEquipmentCreateRequest,
    RentEquipmentUpdateRequest,
)
from app.schemas.reservation import (
    PendingReservationApprovalResponse,
    ReservationAdminResponse,
    ReservationApproveRequest,
    ReservationRejectRequest,
)
from app.services.audit_service import log_action
from app.services.imagekit import delete_image
from app.services.rental_checkout import mark_rental_returned
from app.services.studio_reservations import approve_reservation, reject_reservation
from app.utils.unique_slug import unique_slug

router = APIRouter(tags=["admin-rent-reserve"])


def _rent_equipment_response(equipment: EquipmentForRent) -> RentEquipmentAdminResponse:
    return RentEquipmentAdminResponse(
        id=equipment.id,
        name=equipment.name,
        slug=equipment.slug,
        description=equipment.description,
        daily_rate_ghs=equipment.daily_rate_ghs,
        stock=equipment.stock,
        low_stock_threshold=equipment.low_stock_threshold,
        effective_low_stock_threshold=equipment.effective_low_stock_threshold,
        is_low_stock=equipment.is_low_stock,
        image_url=equipment.image_url,
        imagekit_file_id=equipment.imagekit_file_id,
        is_active=equipment.is_active,
        created_at=equipment.created_at,
        updated_at=equipment.updated_at,
    )


def _rental_admin_response(rental: RentalRequest) -> RentalAdminResponse:
    return RentalAdminResponse(
        id=rental.id,
        user_id=rental.user_id,
        equipment_id=rental.equipment_id,
        equipment_name=rental.equipment.name if rental.equipment else "",
        status=rental.status.value,
        start_date=rental.start_date,
        end_date=rental.end_date,
        rental_days=rental.rental_days,
        total_price_ghs=rental.total_price_ghs,
        paystack_reference=rental.paystack_reference,
        paid_at=rental.paid_at,
        returned_at=rental.returned_at,
        created_at=rental.created_at,
    )


def _reservation_admin_response(reservation: StudioReservation, user: User | None) -> ReservationAdminResponse:
    return ReservationAdminResponse(
        id=reservation.id,
        user_id=reservation.user_id,
        customer_email=user.email if user else None,
        customer_name=user.first_name if user else None,
        status=reservation.status.value,
        requested_start=reservation.requested_start,
        requested_end=reservation.requested_end,
        purpose=reservation.purpose,
        notes=reservation.notes,
        approved_price_ghs=reservation.approved_price_ghs,
        deposit_amount_ghs=reservation.deposit_amount_ghs,
        balance_due_ghs=reservation.balance_due_ghs,
        approved_at=reservation.approved_at,
        payment_deadline=reservation.payment_deadline,
        paystack_reference=reservation.paystack_reference,
        rejection_reason=reservation.rejection_reason,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
    )


@router.post("/admin/rent-equipment", response_model=RentEquipmentAdminResponse, status_code=status.HTTP_201_CREATED)
def create_rent_equipment(
    payload: RentEquipmentCreateRequest,
    user: RentalsManageUser,
    db: DbSession,
) -> RentEquipmentAdminResponse:
    equipment = EquipmentForRent(
        name=payload.name.strip(),
        slug=unique_slug(db, EquipmentForRent, payload.slug or payload.name),
        description=payload.description,
        daily_rate_ghs=payload.daily_rate_ghs,
        stock=payload.stock,
        low_stock_threshold=payload.low_stock_threshold,
        image_url=payload.image_url,
        imagekit_file_id=payload.imagekit_file_id,
        is_active=payload.is_active,
    )
    db.add(equipment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Equipment slug already exists")
    db.refresh(equipment)
    log_action(
        db,
        actor=user,
        action="rent_equipment.created",
        resource_type="rent_equipment",
        resource_id=str(equipment.id),
    )
    db.commit()
    return _rent_equipment_response(equipment)


@router.get("/admin/rent-equipment", response_model=list[RentEquipmentAdminResponse])
def list_rent_equipment_admin(_user: RentalsViewUser, db: DbSession) -> list[RentEquipmentAdminResponse]:
    items = db.query(EquipmentForRent).order_by(EquipmentForRent.created_at.desc()).all()
    return [_rent_equipment_response(item) for item in items]


@router.get("/admin/rent-equipment/{equipment_id}", response_model=RentEquipmentAdminResponse)
def get_rent_equipment_admin(
    equipment_id: UUID,
    _user: RentalsViewUser,
    db: DbSession,
) -> RentEquipmentAdminResponse:
    equipment = db.get(EquipmentForRent, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return _rent_equipment_response(equipment)


@router.patch("/admin/rent-equipment/{equipment_id}", response_model=RentEquipmentAdminResponse)
def update_rent_equipment(
    equipment_id: UUID,
    payload: RentEquipmentUpdateRequest,
    user: RentalsManageUser,
    db: DbSession,
) -> RentEquipmentAdminResponse:
    equipment = db.get(EquipmentForRent, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()
    if "slug" in data and data["slug"] is not None:
        data["slug"] = unique_slug(db, EquipmentForRent, data["slug"], exclude_id=equipment.id)

    for key, value in data.items():
        setattr(equipment, key, value)

    db.add(equipment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Equipment slug already exists")
    db.refresh(equipment)
    log_action(
        db,
        actor=user,
        action="rent_equipment.updated",
        resource_type="rent_equipment",
        resource_id=str(equipment.id),
        metadata=data,
    )
    db.commit()
    return _rent_equipment_response(equipment)


@router.delete("/admin/rent-equipment/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rent_equipment(equipment_id: UUID, user: RentalsManageUser, db: DbSession) -> None:
    equipment = db.get(EquipmentForRent, equipment_id)
    if equipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")

    if equipment.imagekit_file_id:
        delete_image(equipment.imagekit_file_id)

    db.delete(equipment)
    log_action(
        db,
        actor=user,
        action="rent_equipment.deleted",
        resource_type="rent_equipment",
        resource_id=str(equipment_id),
    )
    db.commit()


@router.get("/admin/rentals", response_model=PaginatedResponse[RentalAdminResponse])
def list_rentals_admin(
    _user: RentalsViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
) -> PaginatedResponse[RentalAdminResponse]:
    query = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .order_by(RentalRequest.created_at.desc())
    )
    if status_filter:
        try:
            query = query.filter(RentalRequest.status == RentalStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    total = query.count()
    rentals = query.offset((page - 1) * limit).limit(limit).all()
    items = [_rental_admin_response(rental) for rental in rentals]
    return build_paginated_response(items, total=total, page=page, limit=limit)


@router.patch("/admin/rentals/{rental_id}/returned", response_model=RentalAdminResponse)
def mark_rental_returned_admin(
    rental_id: UUID,
    user: RentalsManageUser,
    db: DbSession,
) -> RentalAdminResponse:
    rental = mark_rental_returned(db, rental_id)
    rental = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.id == rental.id)
        .first()
    )
    log_action(
        db,
        actor=user,
        action="rental.returned",
        resource_type="rental",
        resource_id=str(rental_id),
    )
    db.commit()
    return _rental_admin_response(rental)


@router.get("/admin/reservations", response_model=PaginatedResponse[ReservationAdminResponse])
def list_reservations_admin(
    _user: ReservationsViewUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
) -> PaginatedResponse[ReservationAdminResponse]:
    query = db.query(StudioReservation).order_by(StudioReservation.created_at.desc())
    if status_filter:
        try:
            query = query.filter(StudioReservation.status == ReservationStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")

    total = query.count()
    reservations = query.offset((page - 1) * limit).limit(limit).all()
    results = []
    for reservation in reservations:
        customer = db.get(User, reservation.user_id)
        results.append(_reservation_admin_response(reservation, customer))
    return build_paginated_response(results, total=total, page=page, limit=limit)


@router.patch("/admin/reservations/{reservation_id}/approve", response_model=ReservationAdminResponse)
def approve_reservation_admin(
    reservation_id: UUID,
    payload: ReservationApproveRequest,
    user: ReservationsApproveUser,
    db: DbSession,
) -> ReservationAdminResponse:
    reservation = approve_reservation(db, reservation_id, payload.approved_price_ghs)
    customer = db.get(User, reservation.user_id)
    log_action(
        db,
        actor=user,
        action="reservation.approved",
        resource_type="reservation",
        resource_id=str(reservation_id),
        metadata={"approved_price_ghs": str(payload.approved_price_ghs)},
    )
    db.commit()
    return _reservation_admin_response(reservation, customer)


@router.patch("/admin/reservations/{reservation_id}/reject", response_model=ReservationAdminResponse)
def reject_reservation_admin(
    reservation_id: UUID,
    payload: ReservationRejectRequest,
    user: ReservationsApproveUser,
    db: DbSession,
) -> ReservationAdminResponse:
    reservation = reject_reservation(db, reservation_id, payload.rejection_reason)
    customer = db.get(User, reservation.user_id)
    log_action(
        db,
        actor=user,
        action="reservation.rejected",
        resource_type="reservation",
        resource_id=str(reservation_id),
        metadata={"rejection_reason": payload.rejection_reason},
    )
    db.commit()
    return _reservation_admin_response(reservation, customer)


@router.get("/admin/approvals/pending", response_model=list[PendingReservationApprovalResponse])
def pending_reservation_approvals(
    _user: ReservationsViewUser,
    db: DbSession,
) -> list[PendingReservationApprovalResponse]:
    reservations = (
        db.query(StudioReservation)
        .filter(StudioReservation.status == ReservationStatus.pending)
        .order_by(StudioReservation.created_at.asc())
        .all()
    )
    results = []
    for reservation in reservations:
        customer = db.get(User, reservation.user_id)
        results.append(
            PendingReservationApprovalResponse(
                id=reservation.id,
                user_id=reservation.user_id,
                customer_email=customer.email if customer else None,
                customer_name=customer.first_name if customer else None,
                requested_start=reservation.requested_start,
                requested_end=reservation.requested_end,
                purpose=reservation.purpose,
                notes=reservation.notes,
                created_at=reservation.created_at,
            )
        )
    return results
