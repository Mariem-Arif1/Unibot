from fastapi import APIRouter

from src.api.v1 import admin_bots, admin_llm_configs, auth, users, sessions, bots, agents, chat, organizations

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_v1_router.include_router(users.router, prefix="/users", tags=["users"])
api_v1_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_v1_router.include_router(bots.router, prefix="/bots", tags=["bots"])
api_v1_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_v1_router.include_router(chat.router, prefix="/sessions", tags=["chat"])
api_v1_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_v1_router.include_router(admin_bots.router, prefix="/admin/bots", tags=["admin"])
api_v1_router.include_router(admin_llm_configs.router, prefix="/admin/llm-configs", tags=["admin"])
