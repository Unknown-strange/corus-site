from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.site_content import ContentSection


class SiteContentCreateRequest(BaseModel):
    section: ContentSection
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    caption: str | None = Field(default=None, max_length=500)
    sort_order: int = 0
    is_published: bool = False


class SiteContentUpdateRequest(BaseModel):
    section: ContentSection | None = None
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    caption: str | None = Field(default=None, max_length=500)
    sort_order: int | None = None
    is_published: bool | None = None


class SiteContentAdminResponse(BaseModel):
    id: UUID
    section: ContentSection
    title: str | None
    body: str | None
    image_url: str | None
    imagekit_file_id: str | None
    caption: str | None
    sort_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
