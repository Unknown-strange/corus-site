from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError

from app.core.admin_deps import ProductsManageUser, ProductsViewUser
from app.core.deps import DbSession
from app.models.product import ProductForSale
from app.models.product_category import ProductCategory
from app.schemas.product import (
    ProductAdminResponse,
    ProductCreateRequest,
    ProductUpdateRequest,
)
from app.services.audit_service import log_action
from app.services.imagekit import delete_image
from app.services.stock_alerts import check_stock_crossing_alert
from app.utils.unique_slug import unique_slug

router = APIRouter(prefix="/admin/products", tags=["admin-products"])


def _to_admin_response(product: ProductForSale) -> ProductAdminResponse:
    return ProductAdminResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price=product.price,
        stock=product.stock,
        low_stock_threshold=product.low_stock_threshold,
        effective_low_stock_threshold=product.effective_low_stock_threshold,
        is_low_stock=product.is_low_stock,
        image_url=product.image_url,
        imagekit_file_id=product.imagekit_file_id,
        category_id=product.category_id,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def _validate_category(db: DbSession, category_id: UUID | None) -> None:
    if category_id is None:
        return
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")


@router.post("", response_model=ProductAdminResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreateRequest, user: ProductsManageUser, db: DbSession) -> ProductAdminResponse:
    _validate_category(db, payload.category_id)
    base_slug = payload.slug or payload.name
    product = ProductForSale(
        name=payload.name.strip(),
        slug=unique_slug(db, ProductForSale, base_slug),
        description=payload.description,
        price=payload.price,
        stock=payload.stock,
        low_stock_threshold=payload.low_stock_threshold,
        category_id=payload.category_id,
        image_url=payload.image_url,
        imagekit_file_id=payload.imagekit_file_id,
        is_active=payload.is_active,
    )
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product slug already exists")
    db.refresh(product)

    log_action(
        db,
        actor=user,
        action="product.created",
        resource_type="product",
        resource_id=str(product.id),
    )
    db.commit()

    previous_stock = max(product.stock, product.effective_low_stock_threshold) + 1
    check_stock_crossing_alert(db, product, previous_stock)
    return _to_admin_response(product)


@router.get("", response_model=list[ProductAdminResponse])
def list_products(
    _user: ProductsViewUser,
    db: DbSession,
    low_stock: bool | None = Query(default=None),
) -> list[ProductAdminResponse]:
    products = db.query(ProductForSale).order_by(ProductForSale.created_at.desc()).all()
    if low_stock:
        products = [product for product in products if product.is_low_stock]
    return [_to_admin_response(product) for product in products]


@router.get("/{product_id}", response_model=ProductAdminResponse)
def get_product(product_id: UUID, _user: ProductsViewUser, db: DbSession) -> ProductAdminResponse:
    product = db.get(ProductForSale, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return _to_admin_response(product)


@router.patch("/{product_id}", response_model=ProductAdminResponse)
def update_product(
    product_id: UUID,
    payload: ProductUpdateRequest,
    user: ProductsManageUser,
    db: DbSession,
) -> ProductAdminResponse:
    product = db.get(ProductForSale, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    previous_stock = product.stock
    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data:
        _validate_category(db, data["category_id"])
        product.category_id = data["category_id"]
    if "name" in data and data["name"] is not None:
        product.name = data["name"].strip()
    if "slug" in data and data["slug"] is not None:
        product.slug = unique_slug(db, ProductForSale, data["slug"], exclude_id=product.id)
    if "description" in data:
        product.description = data["description"]
    if "price" in data and data["price"] is not None:
        product.price = data["price"]
    if "stock" in data and data["stock"] is not None:
        product.stock = data["stock"]
    if "low_stock_threshold" in data:
        product.low_stock_threshold = data["low_stock_threshold"]
    if "is_active" in data and data["is_active"] is not None:
        product.is_active = data["is_active"]

    if "image_url" in data or "imagekit_file_id" in data:
        new_file_id = data.get("imagekit_file_id", product.imagekit_file_id)
        if new_file_id != product.imagekit_file_id and product.imagekit_file_id:
            delete_image(product.imagekit_file_id)
        product.image_url = data.get("image_url", product.image_url)
        product.imagekit_file_id = new_file_id

    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product slug already exists")
    db.refresh(product)

    log_action(
        db,
        actor=user,
        action="product.updated",
        resource_type="product",
        resource_id=str(product.id),
        metadata=data,
    )
    db.commit()

    check_stock_crossing_alert(db, product, previous_stock)
    return _to_admin_response(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: UUID, user: ProductsManageUser, db: DbSession) -> None:
    product = db.get(ProductForSale, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.is_active = False
    db.add(product)
    log_action(
        db,
        actor=user,
        action="product.deactivated",
        resource_type="product",
        resource_id=str(product_id),
    )
    db.commit()
