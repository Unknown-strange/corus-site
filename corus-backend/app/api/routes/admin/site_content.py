from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.admin_deps import CmsManageUser
from app.core.deps import DbSession
from app.models.site_content import ContentSection, SiteContent
from app.schemas.site_content import (
    SiteContentAdminResponse,
    SiteContentCreateRequest,
    SiteContentUpdateRequest,
)
from app.services.audit_service import log_action
from app.services.imagekit import delete_image

router = APIRouter(prefix="/admin/site-content", tags=["admin-site-content"])


@router.post("", response_model=SiteContentAdminResponse, status_code=status.HTTP_201_CREATED)
def create_site_content(
    payload: SiteContentCreateRequest,
    user: CmsManageUser,
    db: DbSession,
) -> SiteContent:
    content = SiteContent(
        section=payload.section,
        title=payload.title,
        body=payload.body,
        image_url=payload.image_url,
        imagekit_file_id=payload.imagekit_file_id,
        caption=payload.caption,
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
    return content


@router.get("", response_model=list[SiteContentAdminResponse])
def list_site_content(
    admin: CmsManageUser,
    db: DbSession,
    section: ContentSection | None = Query(default=None),
) -> list[SiteContent]:
    query = db.query(SiteContent)
    if section is not None:
        query = query.filter(SiteContent.section == section)
    return query.order_by(SiteContent.sort_order.asc(), SiteContent.created_at.asc()).all()


@router.patch("/{content_id}", response_model=SiteContentAdminResponse)
def update_site_content(
    content_id: UUID,
    payload: SiteContentUpdateRequest,
    user: CmsManageUser,
    db: DbSession,
) -> SiteContent:
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
    return content


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
