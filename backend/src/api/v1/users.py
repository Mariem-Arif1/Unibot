from fastapi import APIRouter, Depends

from src.dependencies import CurrentUser, get_current_user
from src.schemas.user import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return UserOut(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
        is_active=True,
        created_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
