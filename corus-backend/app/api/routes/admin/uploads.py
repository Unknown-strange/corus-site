from fastapi import APIRouter, File, Form, UploadFile, status

from app.core.admin_deps import UploadUser
from app.schemas.upload import ClientUploadAuthResponse, ImageUploadResponse
from app.services.imagekit import UploadPurpose, get_client_upload_auth, upload_image

router = APIRouter(prefix="/admin/uploads", tags=["admin-uploads"])


@router.post("", response_model=ImageUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    _user: UploadUser,
    file: UploadFile = File(...),
    purpose: UploadPurpose = Form(...),
) -> ImageUploadResponse:
    file_bytes = await file.read()
    result = upload_image(
        file_bytes=file_bytes,
        file_name=file.filename or "upload.jpg",
        purpose=purpose,
        content_type=file.content_type,
    )
    return ImageUploadResponse(url=result.url, file_id=result.file_id)


@router.get("/auth", response_model=ClientUploadAuthResponse)
def get_upload_auth(_user: UploadUser) -> ClientUploadAuthResponse:
    auth = get_client_upload_auth()
    return ClientUploadAuthResponse(**auth)
