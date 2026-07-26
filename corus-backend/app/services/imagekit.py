import logging
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException, status
from imagekitio import ImageKit

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
}

FOLDER_PRODUCTS = "/corus/products"
FOLDER_GALLERY = "/corus/gallery"
FOLDER_RENTALS = "/corus/rentals"


class UploadPurpose(str, Enum):
    product = "product"
    gallery = "gallery"
    rental = "rental"


@dataclass
class ImageUploadResult:
    url: str
    file_id: str


def _get_client() -> ImageKit:
    if not settings.imagekit_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT.",
        )
    return ImageKit(private_key=settings.imagekit_private_key)


def _folder_for_purpose(purpose: UploadPurpose) -> str:
    if purpose == UploadPurpose.product:
        return FOLDER_PRODUCTS
    if purpose == UploadPurpose.rental:
        return FOLDER_RENTALS
    return FOLDER_GALLERY


def validate_image(file_name: str, content_type: str | None, size_bytes: int) -> None:
    if size_bytes > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_size_mb}MB limit",
        )

    if not content_type or content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    ext = "." + file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in ALLOWED_CONTENT_TYPES[content_type]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File extension does not match content type",
        )


def upload_image(
    file_bytes: bytes,
    file_name: str,
    purpose: UploadPurpose,
    content_type: str | None = None,
) -> ImageUploadResult:
    validate_image(file_name, content_type, len(file_bytes))
    client = _get_client()
    folder = _folder_for_purpose(purpose)
    tags = ["corus", purpose.value]

    try:
        response = client.files.upload(
            file=file_bytes,
            file_name=file_name,
            folder=folder,
            tags=tags,
        )
    except Exception as exc:
        logger.exception("ImageKit upload failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Image upload failed",
        ) from exc

    if not response.url or not response.file_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ImageKit upload returned incomplete response",
        )

    return ImageUploadResult(url=response.url, file_id=response.file_id)


def delete_image(file_id: str | None) -> None:
    if not file_id or not settings.imagekit_configured:
        return

    try:
        client = _get_client()
        client.files.delete(file_id)
    except Exception:
        logger.exception("Failed to delete ImageKit file %s", file_id)


def get_client_upload_auth() -> dict:
    client = _get_client()
    auth = client.helper.get_authentication_parameters()
    return {
        "token": auth["token"],
        "signature": auth["signature"],
        "expire": auth["expire"],
        "publicKey": settings.imagekit_public_key or "",
        "urlEndpoint": settings.imagekit_url_endpoint or "",
    }
