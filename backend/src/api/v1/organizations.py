import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.dependencies import CurrentUser, require_role
from src.models.organization import Organization
from src.models.user import User, UserRole
from src.schemas.organization import (
    AssignUserRequest,
    OrganizationCreate,
    OrganizationListOut,
    OrganizationOut,
    OrganizationUpdate,
)

router = APIRouter()

# All endpoints require admin role
_admin = Depends(require_role(UserRole.admin))


@router.get("", response_model=OrganizationListOut)
async def list_organizations(
    active_only: bool = True,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    query = select(Organization).order_by(Organization.name)
    if active_only:
        query = query.where(Organization.is_active == True)  # noqa: E712
    result = await db.execute(query)
    orgs = list(result.scalars().all())
    return OrganizationListOut(
        items=[OrganizationOut.model_validate(o) for o in orgs],
        total=len(orgs),
    )


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    org = Organization(
        id=str(uuid.uuid4()),
        name=body.name,
        bc_company_name=body.bc_company_name,
        bc_database_url=body.bc_database_url,
    )
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return OrganizationOut.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(
    org_id: str,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return OrganizationOut.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationOut)
async def update_organization(
    org_id: str,
    body: OrganizationUpdate,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)
    return OrganizationOut.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_organization(
    org_id: str,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    """Soft-delete: sets is_active=False. Users are not unassigned."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    org.is_active = False
    await db.commit()


@router.get("/{org_id}/users")
async def list_org_users(
    org_id: str,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    """List all users assigned to this organization."""
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    users_result = await db.execute(
        select(User).where(User.organization_id == org_id).order_by(User.email)
    )
    users = list(users_result.scalars().all())
    return {
        "organization_id": org_id,
        "users": [
            {"id": u.id, "email": u.email, "display_name": u.display_name, "role": u.role}
            for u in users
        ],
        "total": len(users),
    }


@router.post("/{org_id}/users", status_code=status.HTTP_200_OK)
async def assign_user_to_organization(
    org_id: str,
    body: AssignUserRequest,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    """Assign (or reassign) a user to this organization.
    Pass organization_id=None in the body to unassign the user.
    """
    # Validate org exists
    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    if org_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    # Validate user exists
    user_result = await db.execute(select(User).where(User.id == body.user_id))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.organization_id = org_id
    await db.commit()
    return {"user_id": user.id, "organization_id": org_id}


@router.delete("/{org_id}/users/{user_id}", status_code=status.HTTP_200_OK)
async def unassign_user_from_organization(
    org_id: str,
    user_id: str,
    _: CurrentUser = _admin,
    db: AsyncSession = Depends(get_session),
):
    """Remove a user from this organization (sets organization_id to NULL)."""
    user_result = await db.execute(
        select(User).where(User.id == user_id, User.organization_id == org_id)
    )
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this organization.",
        )
    user.organization_id = None
    await db.commit()
    return {"user_id": user_id, "organization_id": None}
