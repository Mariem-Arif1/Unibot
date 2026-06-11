from datetime import datetime

from pydantic import BaseModel


class OrganizationCreate(BaseModel):
    name: str
    bc_company_name: str
    bc_database_url: str | None = None


class OrganizationUpdate(BaseModel):
    name: str | None = None
    bc_company_name: str | None = None
    bc_database_url: str | None = None
    is_active: bool | None = None


class OrganizationOut(BaseModel):
    id: str
    name: str
    bc_company_name: str
    bc_database_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrganizationListOut(BaseModel):
    items: list[OrganizationOut]
    total: int


class AssignUserRequest(BaseModel):
    user_id: str
