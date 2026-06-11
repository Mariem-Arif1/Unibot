from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from src.core.database import AsyncSessionLocal
from src.dependencies import CurrentUser, get_current_user, get_session_or_404
from src.models.chat_session import ChatSession
from src.schemas.chat import ChatRequest
from src.services.chat_service import ChatService

router = APIRouter()
_chat_svc = ChatService()


@router.post("/{session_id}/chat")
async def stream_chat(
    body: ChatRequest,
    chat_session: ChatSession = Depends(get_session_or_404()),
    current_user: CurrentUser = Depends(get_current_user),
):
    # Open a dedicated session for the lifetime of the stream.
    # Injected Depends(get_session) sessions are closed when the route handler
    # returns, which is before StreamingResponse iterates the generator.
    async def generate():
        print("\n>>> generate() started", flush=True)
        try:
            async with AsyncSessionLocal() as db:
                print(">>> db session opened", flush=True)
                gen = await _chat_svc.stream_response(
                    session=chat_session,
                    user_id=current_user.id,
                    content=body.content,
                    db=db,
                    provider_override=body.provider,
                    model_override=body.model,
                )
                print(">>> got generator, iterating...", flush=True)
                async for chunk in gen:
                    yield chunk
        except Exception as e:
            import traceback
            print(f"\n>>> generate() EXCEPTION: {e}\n{traceback.format_exc()}", flush=True)
            raise

    return StreamingResponse(
        content=generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
