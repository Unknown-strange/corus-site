from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)


class RegisterPendingResponse(BaseModel):
    message: str
    email: EmailStr
    dev_otp: str | None = None


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendOtpRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
    dev_otp: str | None = None


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UsernameChangeRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    current_password: str


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr | None
    username: str | None
    first_name: str | None
    last_name: str | None
    role: str
    email_verified: bool
    is_active: bool
    permissions: list[str] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffCreateRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8)
    permissions: list[str] = Field(default_factory=list)


class StaffPermissionsUpdateRequest(BaseModel):
    permissions: list[str]


class StaffResponse(BaseModel):
    id: UUID
    email: EmailStr
    username: str
    role: str
    is_active: bool
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}
