from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app.core.admin_deps import ProductsManageUser, ProductsViewUser
from app.core.deps import DbSession
from app.models.product_category import ProductCategory
from app.schemas.product import (
    CategoryAdminResponse,
    CategoryCreateRequest,
    CategoryUpdateRequest,
)
from app.utils.unique_slug import unique_slug

router = APIRouter(prefix="/admin/categories", tags=["admin-categories"])


@router.post("", response_model=CategoryAdminResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreateRequest, _user: ProductsManageUser, db: DbSession) -> ProductCategory:
    base_slug = payload.slug or payload.name
    category = ProductCategory(
        name=payload.name.strip(),
        slug=unique_slug(db, ProductCategory, base_slug),
        description=payload.description,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")
    db.refresh(category)
    return category


@router.get("", response_model=list[CategoryAdminResponse])
def list_categories(_user: ProductsViewUser, db: DbSession) -> list[ProductCategory]:
    return (
        db.query(ProductCategory)
        .order_by(ProductCategory.sort_order.asc(), ProductCategory.name.asc())
        .all()
    )


@router.patch("/{category_id}", response_model=CategoryAdminResponse)
def update_category(
    category_id: UUID,
    payload: CategoryUpdateRequest,
    _user: ProductsManageUser,
    db: DbSession,
) -> ProductCategory:
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        category.name = data["name"].strip()
    if "slug" in data and data["slug"] is not None:
        category.slug = unique_slug(db, ProductCategory, data["slug"], exclude_id=category.id)
    elif "name" in data and payload.slug is None and "slug" not in data:
        pass
    if "description" in data:
        category.description = data["description"]
    if "sort_order" in data and data["sort_order"] is not None:
        category.sort_order = data["sort_order"]
    if "is_active" in data and data["is_active"] is not None:
        category.is_active = data["is_active"]

    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category slug already exists")
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: UUID, _user: ProductsManageUser, db: DbSession) -> None:
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    category.is_active = False
    db.add(category)
    db.commit()
