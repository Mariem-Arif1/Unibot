"""CLI helper to create admin or user accounts in the Aivora database."""
import argparse
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import get_settings
from src.core.security import hash_password
from src.models import User, UserRole  # imports both models so relationships resolve


async def create_user(email: str, password: str, display_name: str, role: str) -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        user = User(
            email=email.lower(),
            display_name=display_name,
            hashed_password=hash_password(password),
            role=UserRole(role),
        )
        session.add(user)
        await session.commit()
        print(f"[OK] User created: {email}")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed an Aivora user account")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--role", choices=["admin", "user"], default="user")
    args = parser.parse_args()
    asyncio.run(create_user(args.email, args.password, args.display_name, args.role))


if __name__ == "__main__":
    main()
