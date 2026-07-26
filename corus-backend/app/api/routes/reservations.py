from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.deps import CustomerUser, DbSession
from app.models.studio_reservation import StudioReservation
from app.schemas.reservation import (
    ReservationCheckoutResponse,
    ReservationDetailResponse,
    ReservationSubmitRequest,
)
from app.services.studio_reservations import checkout_reservation_deposit, submit_reservation

router = APIRouter(prefix="/reservations", tags=["reservations"])


def _to_detail(reservation: StudioReservation) -> ReservationDetailResponse:
    return ReservationDetailResponse(
        id=reservation.id,
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


@router.post("", response_model=ReservationDetailResponse, status_code=status.HTTP_201_CREATED)
def create_reservation(
    payload: ReservationSubmitRequest,
    user: CustomerUser,
    db: DbSession,
) -> ReservationDetailResponse:
    reservation = submit_reservation(
        db,
        user,
        payload.requested_start,
        payload.requested_end,
        payload.purpose,
        payload.notes,
    )
    return _to_detail(reservation)


@router.get("/me", response_model=list[ReservationDetailResponse])
def my_reservations(user: CustomerUser, db: DbSession) -> list[ReservationDetailResponse]:
    reservations = (
        db.query(StudioReservation)
        .filter(StudioReservation.user_id == user.id)
        .order_by(StudioReservation.created_at.desc())
        .all()
    )
    return [_to_detail(r) for r in reservations]


@router.get("/{reservation_id}", response_model=ReservationDetailResponse)
def get_reservation(
    reservation_id: UUID,
    user: CustomerUser,
    db: DbSession,
) -> ReservationDetailResponse:
    reservation = db.get(StudioReservation, reservation_id)
    if reservation is None or reservation.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return _to_detail(reservation)


@router.post("/{reservation_id}/checkout", response_model=ReservationCheckoutResponse)
def reservation_checkout(
    reservation_id: UUID,
    user: CustomerUser,
    db: DbSession,
) -> ReservationCheckoutResponse:
    result = checkout_reservation_deposit(db, user, reservation_id)
    return ReservationCheckoutResponse(**result)
