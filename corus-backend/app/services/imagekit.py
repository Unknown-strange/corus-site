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
    rental_equipment = "rental_equipment"


@dataclass
class ImageUploadResult:
    url: str
    file_id: str


def _get_client() -> ImageKit:
    print(
        f"🔍 [IMAGEKIT CONFIG CHECK] configured={settings.imagekit_configured}, "
        f"url_endpoint={settings.imagekit_url_endpoint}, "
        f"public_key_set={bool(settings.imagekit_public_key)}, "
        f"private_key_set={bool(settings.imagekit_private_key)}",
        flush=True,
    )
    if not settings.imagekit_configured:
        err_msg = (
            "ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT. "
            f"(url_endpoint={settings.imagekit_url_endpoint}, private_key_present={bool(settings.imagekit_private_key)})"
        )
        print(f"❌ [IMAGEKIT CONFIG ERROR] {err_msg}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=err_msg,
        )
    return ImageKit(private_key=settings.imagekit_private_key)


def _folder_for_purpose(purpose: UploadPurpose) -> str:
    if purpose in (UploadPurpose.product,):
        return FOLDER_PRODUCTS
    if purpose in (UploadPurpose.rental, UploadPurpose.rental_equipment):
        return FOLDER_RENTALS
    return FOLDER_GALLERY


def validate_image(file_name: str, content_type: str | None, size_bytes: int) -> None:
    print(
        f"🔍 [VALIDATE IMAGE] name={file_name}, content_type={content_type}, size={size_bytes} bytes",
        flush=True,
    )
    if size_bytes > settings.max_upload_size_mb * 1024 * 1024:
        err = f"File exceeds {settings.max_upload_size_mb}MB limit (actual: {size_bytes / (1024 * 1024):.2f}MB)"
        print(f"❌ [VALIDATE ERROR] {err}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=err,
        )

    if not content_type or content_type not in ALLOWED_CONTENT_TYPES:
        err = f"Invalid content type: '{content_type}'. Only JPEG, PNG, and WebP images are allowed."
        print(f"❌ [VALIDATE ERROR] {err}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err,
        )

    ext = "." + file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in ALLOWED_CONTENT_TYPES[content_type]:
        err = f"File extension '{ext}' does not match content type '{content_type}'."
        print(f"❌ [VALIDATE ERROR] {err}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err,
        )


def upload_image(
    file_bytes: bytes,
    file_name: str,
    purpose: UploadPurpose,
    content_type: str | None = None,
) -> ImageUploadResult:
    print(f"🚀 [IMAGEKIT UPLOAD START] file_name={file_name}, purpose={purpose}", flush=True)
    validate_image(file_name, content_type, len(file_bytes))
    client = _get_client()
    folder = _folder_for_purpose(purpose)
    tags = ["corus", purpose.value]

    try:
        print(f"📡 [CALLING IMAGEKIT API] folder={folder}, tags={tags}...", flush=True)
        response = client.files.upload(
            file=file_bytes,
            file_name=file_name,
            folder=folder,
            tags=tags,
        )
        print(f"📥 [IMAGEKIT RAW RESPONSE] {response}", flush=True)
    except Exception as exc:
        print(f"💥 [IMAGEKIT EXCEPTION]: {type(exc).__name__}: {exc}", flush=True)
        logger.exception("ImageKit upload failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ImageKit API upload failed: {type(exc).__name__} - {exc!s}",
        ) from exc

    if not response.url or not response.file_id:
        err = f"ImageKit upload returned incomplete response (url={response.url}, file_id={response.file_id})"
        print(f"❌ [IMAGEKIT RESPONSE ERROR] {err}", flush=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=err,
        )

    print(f"🎉 [IMAGEKIT SUCCESS] url={response.url}, file_id={response.file_id}", flush=True)
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
