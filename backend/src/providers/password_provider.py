from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import verify_password
from src.models.user import User


class PasswordAuthProvider:
    async def authenticate(
        self, email: str, password: str, session: AsyncSession
    ) -> User | None:
        result = await session.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if user is None:
            # Run hash anyway to prevent timing-based enumeration
            verify_password(password, "$2b$12$notarealhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX")
            return None

        if not verify_password(password, user.hashed_password):
            return None

        if not user.is_active:
            return None

        return user
