import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.security import create_access_token, decode_access_token, hash_token
from src.models.refresh_token import RefreshToken
from src.models.user import User
from src.providers.password_provider import PasswordAuthProvider
from src.schemas.auth import LoginResponse
from src.schemas.user import UserOut

logger = logging.getLogger(__name__)

_AUTH_COOKIE = "aivora_access"
_REFRESH_COOKIE = "aivora_refresh"


def _set_access_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=_AUTH_COOKIE,
        value=token,
        max_age=settings.jwt_access_expire_minutes * 60,
        httponly=True,
        samesite="lax",
        secure=False,  # Set True in production behind HTTPS
    )


def _set_refresh_cookie(response: Response, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=_REFRESH_COOKIE,
        value=token,
        max_age=settings.jwt_refresh_expire_hours * 3600,
        httponly=True,
        samesite="lax",
        secure=False,  # Set True in production
        path="/api/v1/auth/refresh",
    )


def _clear_cookies(response: Response) -> None:
    response.delete_cookie(_AUTH_COOKIE, samesite="lax")
    response.delete_cookie(_REFRESH_COOKIE, samesite="lax", path="/api/v1/auth/refresh")


class AuthService:
    def __init__(self):
        self._provider = PasswordAuthProvider()

    async def login(
        self, email: str, password: str, session: AsyncSession, response: Response
    ) -> LoginResponse:
        user = await self._provider.authenticate(email, password, session)
        if user is None:
            logger.info("login.failed email=%s reason=invalid_credentials", email)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        # Revoke any prior active refresh token (single-session policy)
        await session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user.id, RefreshToken.revoked == False)  # noqa: E712
            .values(revoked=True)
        )

        # Issue new refresh token
        settings = get_settings()
        raw_token = secrets.token_hex(32)
        token_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=settings.jwt_refresh_expire_hours),
        )
        session.add(token_record)
        await session.commit()

        # Issue access token
        access_token = create_access_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "role": user.role,
            }
        )

        _set_access_cookie(response, access_token)
        _set_refresh_cookie(response, raw_token)

        logger.info("login.success user_id=%s", user.id)
        return LoginResponse(user=UserOut.model_validate(user))

    async def refresh(self, request: Request, response: Response, session: AsyncSession) -> None:
        raw_token = request.cookies.get(_REFRESH_COOKIE)
        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again.",
            )

        token_hash = hash_token(raw_token)
        result = await session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        record = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if (
            record is None
            or record.revoked
            or record.expires_at.replace(tzinfo=timezone.utc) < now
        ):
            _clear_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again.",
            )

        # Load user
        result = await session.execute(select(User).where(User.id == record.user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            _clear_cookies(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please log in again.",
            )

        access_token = create_access_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "display_name": user.display_name,
                "role": user.role,
            }
        )
        _set_access_cookie(response, access_token)
        logger.info("refresh.success user_id=%s", user.id)

    async def logout(self, request: Request, response: Response, session: AsyncSession) -> None:
        raw_token = request.cookies.get(_REFRESH_COOKIE)
        if raw_token:
            token_hash = hash_token(raw_token)
            await session.execute(
                update(RefreshToken)
                .where(RefreshToken.token_hash == token_hash)
                .values(revoked=True)
            )
            await session.commit()

        user_id = None
        access_token = request.cookies.get(_AUTH_COOKIE)
        if access_token:
            try:
                payload = decode_access_token(access_token)
                user_id = payload.get("sub")
            except Exception:
                pass

        _clear_cookies(response)
        logger.info("logout.success user_id=%s", user_id)
