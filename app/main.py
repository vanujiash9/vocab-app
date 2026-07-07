from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.core.config import get_settings
from app.schemas.chat import RootResponse

settings = get_settings()

app = FastAPI(
    title="Vocabulary Gateway Test API",
    version="1.0.0",
    description="Minimal FastAPI service for testing an OpenAI-compatible gateway from Swagger UI.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.fastapi_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/", tags=["Service"], response_model=RootResponse, summary="Service info")
async def root(request: Request) -> RootResponse:
    base_url = str(request.base_url).rstrip("/")
    return RootResponse(
        name="Vocabulary Gateway Test API",
        docs=f"{base_url}/docs",
        health=f"{base_url}/api/health",
        models=f"{base_url}/api/models",
        normalized_chat=f"{base_url}/api/chat",
        raw_chat=f"{base_url}/api/chat/raw",
    )
