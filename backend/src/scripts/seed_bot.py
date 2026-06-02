"""CLI helper to create bot records in the Aivora database."""
import argparse
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.core.config import get_settings
from src.models import Bot


async def create_bot(
    name: str,
    provider: str,
    model: str,
    system_prompt: str,
    description: str | None = None,
) -> None:
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        bot = Bot(
            name=name,
            description=description,
            provider=provider,
            model=model,
            system_prompt=system_prompt,
        )
        session.add(bot)
        await session.commit()
        await session.refresh(bot)
        print(f"[OK] Bot created: id={bot.id} name={bot.name} provider={bot.provider}")

    await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed an Aivora bot")
    parser.add_argument("--name", required=True)
    parser.add_argument("--provider", choices=["anthropic", "openai", "gemini"], required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--system-prompt", default="You are a helpful assistant.")
    parser.add_argument("--description", default=None)
    args = parser.parse_args()
    asyncio.run(create_bot(
        name=args.name,
        provider=args.provider,
        model=args.model,
        system_prompt=args.system_prompt,
        description=args.description,
    ))


if __name__ == "__main__":
    main()
