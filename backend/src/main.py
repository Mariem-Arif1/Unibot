from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from src.api.v1.router import api_v1_router
from src.core.config import get_settings
from src.core.database import AsyncSessionLocal


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Aivora API", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_v1_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        try:
            async with AsyncSessionLocal() as session:
                await session.execute(text("SELECT 1"))
            return {"status": "ok", "db": "ok"}
        except Exception:
            return JSONResponse(
                status_code=503,
                content={"status": "degraded", "db": "unreachable"},
            )

    return app


app = create_app()
