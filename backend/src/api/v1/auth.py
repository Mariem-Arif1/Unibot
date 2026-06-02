from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.schemas.auth import LoginRequest, LoginResponse
from src.services.auth_service import AuthService

router = APIRouter()
_service = AuthService()


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    return await _service.login(body.email, body.password, session, response)


@router.post("/refresh")
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    await _service.refresh(request, response, session)
    return {"ok": True}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    await _service.logout(request, response, session)
    return {"ok": True}
