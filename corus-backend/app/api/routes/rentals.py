from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import joinedload

from app.core.deps import CustomerUser, DbSession
from app.models.equipment_for_rent import EquipmentForRent
from app.models.rental_request import RentalRequest
from app.schemas.rental import (
    RentEquipmentPublicResponse,
    RentalCheckoutRequest,
    RentalCheckoutResponse,
    RentalDetailResponse,
)
from app.services.rental_checkout import checkout_rental

router = APIRouter(prefix="/rentals", tags=["rentals"])


def _to_detail(rental: RentalRequest) -> RentalDetailResponse:
    return RentalDetailResponse(
        id=rental.id,
        status=rental.status.value,
        start_date=rental.start_date,
        end_date=rental.end_date,
        rental_days=rental.rental_days,
        total_price_ghs=rental.total_price_ghs,
        paystack_reference=rental.paystack_reference,
        paid_at=rental.paid_at,
        returned_at=rental.returned_at,
        created_at=rental.created_at,
        equipment_name=rental.equipment.name if rental.equipment else "",
        equipment_slug=rental.equipment.slug if rental.equipment else "",
    )


@router.get("/equipment", response_model=list[RentEquipmentPublicResponse])
def list_rent_equipment(db: DbSession) -> list[EquipmentForRent]:
    return (
        db.query(EquipmentForRent)
        .filter(EquipmentForRent.is_active.is_(True), EquipmentForRent.stock > 0)
        .order_by(EquipmentForRent.name)
        .all()
    )


@router.get("/equipment/{slug}", response_model=RentEquipmentPublicResponse)
def get_rent_equipment(slug: str, db: DbSession) -> EquipmentForRent:
    equipment = (
        db.query(EquipmentForRent)
        .filter(
            EquipmentForRent.slug == slug,
            EquipmentForRent.is_active.is_(True),
            EquipmentForRent.stock > 0,
        )
        .first()
    )
    if equipment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Equipment not found")
    return equipment


@router.post("/checkout", response_model=RentalCheckoutResponse)
def rental_checkout(
    payload: RentalCheckoutRequest,
    user: CustomerUser,
    db: DbSession,
) -> RentalCheckoutResponse:
    result = checkout_rental(
        db,
        user,
        payload.equipment_id,
        payload.start_date,
        payload.end_date,
    )
    return RentalCheckoutResponse(**result)


@router.get("/me", response_model=list[RentalDetailResponse])
def my_rentals(user: CustomerUser, db: DbSession) -> list[RentalDetailResponse]:
    rentals = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.user_id == user.id)
        .order_by(RentalRequest.created_at.desc())
        .all()
    )
    return [_to_detail(rental) for rental in rentals]


@router.get("/{rental_id}", response_model=RentalDetailResponse)
def get_rental(rental_id: UUID, user: CustomerUser, db: DbSession) -> RentalDetailResponse:
    rental = (
        db.query(RentalRequest)
        .options(joinedload(RentalRequest.equipment))
        .filter(RentalRequest.id == rental_id, RentalRequest.user_id == user.id)
        .first()
    )
    if rental is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental not found")
    return _to_detail(rental)
