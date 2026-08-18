from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.models.site_content import ContentSection, SiteContent


class SiteContentCreateRequest(BaseModel):
    section: ContentSection
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    caption: str | None = Field(default=None, max_length=500)
    session_type_id: UUID | None = None
    sort_order: int = 0
    is_published: bool = False

    @model_validator(mode="after")
    def gallery_requires_session_type(self) -> "SiteContentCreateRequest":
        if self.section == ContentSection.gallery and self.session_type_id is None:
            raise ValueError("session_type_id is required for gallery content")
        return self


class SiteContentUpdateRequest(BaseModel):
    section: ContentSection | None = None
    title: str | None = Field(default=None, max_length=200)
    body: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    imagekit_file_id: str | None = Field(default=None, max_length=255)
    caption: str | None = Field(default=None, max_length=500)
    session_type_id: UUID | None = None
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
    session_type_id: UUID | None
    session_type_name: str | None
    sort_order: int
    is_published: bool
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_model(cls, content: SiteContent) -> "SiteContentAdminResponse":
        return cls(
            id=content.id,
            section=content.section,
            title=content.title,
            body=content.body,
            image_url=content.image_url,
            imagekit_file_id=content.imagekit_file_id,
            caption=content.caption,
            session_type_id=content.session_type_id,
            session_type_name=content.session_type.name if content.session_type else None,
            sort_order=content.sort_order,
            is_published=content.is_published,
            created_at=content.created_at,
            updated_at=content.updated_at,
        )
