from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class SessionTypeResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    price_ghs: Decimal
    duration_minutes: int

    model_config = {"from_attributes": True}


class SessionTypeCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    description: str | None = None
    price_ghs: Decimal = Field(gt=0)
    duration_minutes: int = Field(default=60, ge=15, le=480)
    is_active: bool = True


class SessionTypeUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    description: str | None = None
    price_ghs: Decimal | None = Field(default=None, gt=0)
    duration_minutes: int | None = Field(default=None, ge=15, le=480)
    is_active: bool | None = None


class SessionTypeAdminResponse(SessionTypeResponse):
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StudioSlotResponse(BaseModel):
    id: UUID
    starts_at: datetime
    ends_at: datetime

    model_config = {"from_attributes": True}


class StudioSlotCreateRequest(BaseModel):
    starts_at: datetime
    ends_at: datetime


class StudioSlotAdminResponse(StudioSlotResponse):
    is_blocked: bool
    created_by_id: UUID | None
    created_at: datetime


class SlotBlockRequest(BaseModel):
    is_blocked: bool


class HoldCreateRequest(BaseModel):
    slot_id: UUID
    session_type_id: UUID


class HoldResponse(BaseModel):
    id: UUID
    slot_id: UUID
    session_type_id: UUID
    expires_at: datetime
    status: str

    model_config = {"from_attributes": True}
