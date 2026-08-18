from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class CategoryPublicResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    sort_order: int

    model_config = {"from_attributes": True}


class ProductPublicResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: str | None
    price: Decimal
    stock: int
    image_url: str | None
    category: CategoryPublicResponse | None = None

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    items: list[ProductPublicResponse]
    total: int
    page: int
    limit: int
    pages: int


class SiteContentPublicResponse(BaseModel):
    id: UUID
    section: str
    title: str | None
    body: str | None
    image_url: str | None
    caption: str | None
    session_type_id: UUID | None
    session_type_name: str | None
    sort_order: int

    model_config = {"from_attributes": True}
