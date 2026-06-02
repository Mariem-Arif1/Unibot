from datetime import datetime

from pydantic import BaseModel

from src.models.user import UserRole


class UserOut(BaseModel):
    id: str  # stored as String(36) UUID in SQL Server
    email: str
    display_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
