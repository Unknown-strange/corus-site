import math
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.orm import joinedload

from app.core.deps import DbSession
from app.models.product import ProductForSale
from app.models.product_category import ProductCategory
from app.models.site_content import ContentSection, SiteContent
from app.schemas.catalog import (
    CategoryPublicResponse,
    ProductListResponse,
    ProductPublicResponse,
    SiteContentPublicResponse,
)

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _product_to_public(product: ProductForSale) -> ProductPublicResponse:
    category = None
    if product.category and product.category.is_active:
        category = CategoryPublicResponse.model_validate(product.category)
    return ProductPublicResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price=product.price,
        stock=product.stock,
        image_url=product.image_url,
        category=category,
    )


@router.get("/categories", response_model=list[CategoryPublicResponse])
def list_categories(db: DbSession) -> list[ProductCategory]:
    return (
        db.query(ProductCategory)
        .filter(ProductCategory.is_active.is_(True))
        .order_by(ProductCategory.sort_order.asc(), ProductCategory.name.asc())
        .all()
    )


@router.get("/products", response_model=ProductListResponse)
def list_products(
    db: DbSession,
    category: str | None = Query(default=None, description="Category slug filter"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> ProductListResponse:
    query = (
        db.query(ProductForSale)
        .options(joinedload(ProductForSale.category))
        .filter(ProductForSale.is_active.is_(True), ProductForSale.stock > 0)
    )

    if category:
        query = query.join(ProductCategory).filter(
            ProductCategory.slug == category,
            ProductCategory.is_active.is_(True),
        )

    total = query.count()
    products = (
        query.order_by(ProductForSale.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return ProductListResponse(
        items=[_product_to_public(product) for product in products],
        total=total,
        page=page,
        limit=limit,
        pages=max(1, math.ceil(total / limit)) if total else 1,
    )


@router.get("/products/{slug}", response_model=ProductPublicResponse)
def get_product(slug: str, db: DbSession) -> ProductPublicResponse:
    product = (
        db.query(ProductForSale)
        .options(joinedload(ProductForSale.category))
        .filter(
            ProductForSale.slug == slug,
            ProductForSale.is_active.is_(True),
            ProductForSale.stock > 0,
        )
        .first()
    )
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _product_to_public(product)


def _content_for_section(db: DbSession, section: ContentSection) -> list[SiteContent]:
    return (
        db.query(SiteContent)
        .filter(SiteContent.section == section, SiteContent.is_published.is_(True))
        .order_by(SiteContent.sort_order.asc(), SiteContent.created_at.asc())
        .all()
    )


@router.get("/content/homepage", response_model=list[SiteContentPublicResponse])
def get_homepage_content(db: DbSession) -> list[SiteContent]:
    return _content_for_section(db, ContentSection.homepage)


@router.get("/content/gallery", response_model=list[SiteContentPublicResponse])
def get_gallery_content(db: DbSession) -> list[SiteContent]:
    return _content_for_section(db, ContentSection.gallery)


@router.get("/content/rental-info", response_model=list[SiteContentPublicResponse])
def get_rental_info_content(db: DbSession) -> list[SiteContent]:
    return _content_for_section(db, ContentSection.rental_info)
