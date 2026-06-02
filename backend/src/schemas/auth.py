import re

from pydantic import BaseModel, field_validator

from src.models.user import UserRole
from src.schemas.user import UserOut

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL_RE.match(v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or len(v) > 128:
            raise ValueError("Password must be 1–128 characters")
        return v


class LoginResponse(BaseModel):
    user: UserOut


class TokenPayload(BaseModel):
    sub: str  # UUID stored as string
    email: str
    display_name: str
    role: UserRole
    type: str = "access"
