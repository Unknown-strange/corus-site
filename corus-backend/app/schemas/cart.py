from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CartItemResponse(BaseModel):
    product_id: UUID
    product_name: str
    product_slug: str
    unit_price_ghs: Decimal
    quantity: int
    line_total_ghs: Decimal
    image_url: str | None
    stock: int


class CartResponse(BaseModel):
    id: UUID
    items: list[CartItemResponse]
    total_ghs: Decimal
    item_count: int
    updated_at: datetime


class CartAddItemRequest(BaseModel):
    product_id: UUID
    quantity: int = Field(default=1, ge=1)


class CartUpdateItemRequest(BaseModel):
    quantity: int = Field(ge=0)
