from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.admin_deps import CmsManageUser
from app.core.deps import DbSession
from app.models.session_type import SessionType
from app.models.site_content import ContentSection, SiteContent
from app.schemas.site_content import (
    SiteContentAdminResponse,
    SiteContentCreateRequest,
    SiteContentUpdateRequest,
)
from app.services.audit_service import log_action
from app.services.imagekit import delete_image

router = APIRouter(prefix="/admin/site-content", tags=["admin-site-content"])


def _gallery_query(db: DbSession):
    return db.query(SiteContent).options(joinedload(SiteContent.session_type))


def _ensure_gallery_session_type(section: ContentSection, session_type_id: UUID | None) -> None:
    if section == ContentSection.gallery and session_type_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="session_type_id is required for gallery content",
        )


def _validate_session_type(db: DbSession, session_type_id: UUID) -> None:
    session_type = db.get(SessionType, session_type_id)
    if session_type is None or not session_type.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid or inactive session type",
        )


@router.post("", response_model=SiteContentAdminResponse, status_code=status.HTTP_201_CREATED)
def create_site_content(
    payload: SiteContentCreateRequest,
    user: CmsManageUser,
    db: DbSession,
) -> SiteContentAdminResponse:
    if payload.session_type_id is not None:
        _validate_session_type(db, payload.session_type_id)

    content = SiteContent(
        section=payload.section,
        title=payload.title,
        body=payload.body,
        image_url=payload.image_url,
        imagekit_file_id=payload.imagekit_file_id,
        caption=payload.caption,
        session_type_id=payload.session_type_id,
        sort_order=payload.sort_order,
        is_published=payload.is_published,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    log_action(
        db,
        actor=user,
        action="site_content.created",
        resource_type="site_content",
        resource_id=str(content.id),
    )
    db.commit()

    loaded = _gallery_query(db).filter(SiteContent.id == content.id).first()
    assert loaded is not None
    return SiteContentAdminResponse.from_model(loaded)


@router.get("", response_model=list[SiteContentAdminResponse])
def list_site_content(
    admin: CmsManageUser,
    db: DbSession,
    section: ContentSection | None = Query(default=None),
) -> list[SiteContentAdminResponse]:
    query = _gallery_query(db)
    if section is not None:
        query = query.filter(SiteContent.section == section)
    items = query.order_by(SiteContent.sort_order.asc(), SiteContent.created_at.asc()).all()
    return [SiteContentAdminResponse.from_model(item) for item in items]


@router.patch("/{content_id}", response_model=SiteContentAdminResponse)
def update_site_content(
    content_id: UUID,
    payload: SiteContentUpdateRequest,
    user: CmsManageUser,
    db: DbSession,
) -> SiteContentAdminResponse:
    content = db.get(SiteContent, content_id)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    data = payload.model_dump(exclude_unset=True)
    if "section" in data and data["section"] is not None:
        content.section = data["section"]
    if "title" in data:
        content.title = data["title"]
    if "body" in data:
        content.body = data["body"]
    if "caption" in data:
        content.caption = data["caption"]
    if "session_type_id" in data:
        if data["session_type_id"] is not None:
            _validate_session_type(db, data["session_type_id"])
        content.session_type_id = data["session_type_id"]
    if "sort_order" in data and data["sort_order"] is not None:
        content.sort_order = data["sort_order"]
    if "is_published" in data and data["is_published"] is not None:
        content.is_published = data["is_published"]

    if "image_url" in data or "imagekit_file_id" in data:
        new_file_id = data.get("imagekit_file_id", content.imagekit_file_id)
        if new_file_id != content.imagekit_file_id and content.imagekit_file_id:
            delete_image(content.imagekit_file_id)
        content.image_url = data.get("image_url", content.image_url)
        content.imagekit_file_id = new_file_id

    _ensure_gallery_session_type(content.section, content.session_type_id)

    db.add(content)
    db.commit()
    db.refresh(content)
    log_action(
        db,
        actor=user,
        action="site_content.updated",
        resource_type="site_content",
        resource_id=str(content.id),
        metadata=data,
    )
    db.commit()

    loaded = _gallery_query(db).filter(SiteContent.id == content.id).first()
    assert loaded is not None
    return SiteContentAdminResponse.from_model(loaded)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site_content(content_id: UUID, user: CmsManageUser, db: DbSession) -> None:
    content = db.get(SiteContent, content_id)
    if content is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")

    delete_image(content.imagekit_file_id)
    db.delete(content)
    log_action(
        db,
        actor=user,
        action="site_content.deleted",
        resource_type="site_content",
        resource_id=str(content_id),
    )
    db.commit()
