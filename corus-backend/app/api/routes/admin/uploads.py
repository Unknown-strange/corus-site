from fastapi import APIRouter, File, Form, UploadFile, status

from app.core.admin_deps import UploadUser
from app.schemas.upload import ClientUploadAuthResponse, ImageUploadResponse
from app.services.imagekit import UploadPurpose, get_client_upload_auth, upload_image

router = APIRouter(prefix="/admin/uploads", tags=["admin-uploads"])


@router.post("", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    user: UploadUser,
    file: UploadFile = File(...),
    purpose: UploadPurpose = Form(...),
) -> ImageUploadResponse:
    username = getattr(user, "username", str(user))
    print(
        f"📥 [ROUTE /admin/uploads] Request from user='{username}', file='{file.filename}', "
        f"content_type='{file.content_type}', purpose='{purpose}'",
        flush=True,
    )
    file_bytes = await file.read()
    print(f"📦 [ROUTE /admin/uploads] Read {len(file_bytes)} bytes from '{file.filename}'", flush=True)

    try:
        result = upload_image(
            file_bytes=file_bytes,
            file_name=file.filename or "upload.jpg",
            purpose=purpose,
            content_type=file.content_type,
        )
        print(f"✅ [ROUTE /admin/uploads] Success: url='{result.url}'", flush=True)
        return ImageUploadResponse(url=result.url, file_id=result.file_id)
    except Exception as exc:
        print(f"❌ [ROUTE /admin/uploads] Error during upload: {type(exc).__name__} - {exc}", flush=True)
        raise


@router.get("/auth", response_model=ClientUploadAuthResponse)
def get_upload_auth(_user: UploadUser) -> ClientUploadAuthResponse:
    auth = get_client_upload_auth()
    return ClientUploadAuthResponse(**auth)
