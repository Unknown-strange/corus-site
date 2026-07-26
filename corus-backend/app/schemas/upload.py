from pydantic import BaseModel


class ImageUploadResponse(BaseModel):
    url: str
    file_id: str


class ClientUploadAuthResponse(BaseModel):
    token: str
    signature: str
    expire: int
    publicKey: str
    urlEndpoint: str
