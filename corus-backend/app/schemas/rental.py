from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class RentEquipmentPublicResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    daily_rate_ghs: Decimal
    stock: int
    image_url: str | None

    model_config = {"from_attributes": True}


class RentalCheckoutRequest(BaseModel):
    equipment_id: UUID
    start_date: date
    end_date: date


class RentalCheckoutResponse(BaseModel):
    rental_id: UUID
    authorization_url: str
    reference: str
    public_key: str
    amount_ghs: Decimal
    rental_days: int
    daily_rate_ghs: Decimal


class RentalDetailResponse(BaseModel):
    id: UUID
    status: str
    start_date: date
    end_date: date
    rental_days: int
    total_price_ghs: Decimal
    paystack_reference: str | None
    paid_at: datetime | None
    returned_at: datetime | None
    created_at: datetime
    equipment_name: str
    equipment_slug: str


class RentEquipmentAdminResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    daily_rate_ghs: Decimal
    stock: int
    low_stock_threshold: int | None
    effective_low_stock_threshold: int
    is_low_stock: bool
    image_url: str | None
    imagekit_file_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class RentEquipmentCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str | None = None
    description: str | None = None
    daily_rate_ghs: Decimal = Field(gt=0)
    stock: int = Field(ge=0, default=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    imagekit_file_id: str | None = None
    is_active: bool = True


class RentEquipmentUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = None
    description: str | None = None
    daily_rate_ghs: Decimal | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    imagekit_file_id: str | None = None
    is_active: bool | None = None


class RentalAdminResponse(BaseModel):
    id: UUID
    user_id: UUID
    equipment_id: UUID
    equipment_name: str
    status: str
    start_date: date
    end_date: date
    rental_days: int
    total_price_ghs: Decimal
    paystack_reference: str | None
    paid_at: datetime | None
    returned_at: datetime | None
    created_at: datetime
