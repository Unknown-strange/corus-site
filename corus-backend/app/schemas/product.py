from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    description: str | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    description: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryAdminResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    description: str | None = None
    price: Decimal = Field(gt=0)
    stock: int = Field(ge=0, default=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    is_active: bool = True


class ProductUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    description: str | None = None
    price: Decimal | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)
    category_id: UUID | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    is_active: bool | None = None


class ProductAdminResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    price: Decimal
    stock: int
    low_stock_threshold: int | None
    effective_low_stock_threshold: int
    is_low_stock: bool
    image_url: str | None
    imagekit_file_id: str | None
    category_id: UUID | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
