from dataclasses import dataclass

import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.security import decode_access_token
from src.core.database import get_session
from src.models.user import UserRole


@dataclass
class CurrentUser:
    id: str  # UUID as string (SQL Server String(36))
    email: str
    display_name: str
    role: UserRole


async def get_current_user(
    aivora_access: str | None = Cookie(default=None),
) -> CurrentUser:
    if not aivora_access:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        payload = decode_access_token(aivora_access)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    return CurrentUser(
        id=payload["sub"],
        email=payload["email"],
        display_name=payload["display_name"],
        role=UserRole(payload["role"]),
    )


def require_role(*roles: UserRole):
    async def checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return current_user
    return checker


def get_session_or_404():
    """
    Returns a FastAPI dependency that loads a ChatSession by session_id path param,
    enforcing that it belongs to the current user. Raises 404 if not found or not owned.
    Usage: Depends(get_session_or_404())
    """
    async def _dep(
        session_id: str,
        current_user: CurrentUser = Depends(get_current_user),
        db: AsyncSession = Depends(get_session),
    ):
        from src.models.chat_session import ChatSession

        result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == current_user.id,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return session

    return _dep
