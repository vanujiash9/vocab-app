from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.chat import (
    JSON_OBJECT_REQUEST_EXAMPLE,
    NORMALIZED_RESPONSE_EXAMPLE,
    RAW_GATEWAY_RESPONSE_EXAMPLE,
    ChatRequest,
    ChatResponse,
    HealthResponse,
    ModelsResponse,
    RawChatResponse,
)
from app.services.gateway import create_chat_completion, create_raw_chat_completion

router = APIRouter(prefix="/api", tags=["Gateway API"])


def _base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


@router.get("/health", response_model=HealthResponse, summary="Health check")
async def health_check(request: Request) -> HealthResponse:
    base_url = _base_url(request)
    return HealthResponse(
        status="ok",
        auth_header="Không cần token FastAPI riêng",
        docs=f"{base_url}/docs",
    )


@router.get("/models", response_model=ModelsResponse, summary="Configured default model")
async def models() -> ModelsResponse:
    settings = get_settings()
    return ModelsResponse(
        configured_model=settings.gateway_model,
        note="Đây là model mặc định sẽ được dùng khi request không gửi field model.",
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Normalized chat response",
    description="Forward a non-streaming OpenAI-compatible chat request to your gateway and return a simplified response.",
    responses={
        200: {"description": "Normalized gateway response", "content": {"application/json": {"example": NORMALIZED_RESPONSE_EXAMPLE}}},
        502: {"description": "Gateway upstream error"},
        504: {"description": "Gateway timeout"},
    },
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "examples": {
                        "text": {"summary": "Text response", "value": {**JSON_OBJECT_REQUEST_EXAMPLE, "response_format": {"type": "text"}}},
                        "json_object": {"summary": "JSON object response", "value": JSON_OBJECT_REQUEST_EXAMPLE},
                    }
                }
            }
        }
    },
)
async def chat_with_gateway(payload: ChatRequest) -> ChatResponse:
    settings = get_settings()
    return await create_chat_completion(payload, settings)


@router.post(
    "/chat/raw",
    response_model=RawChatResponse,
    summary="Raw gateway response",
    description="Forward the same request to your gateway and return the full upstream JSON response for debugging.",
    responses={
        200: {"description": "Raw upstream gateway response", "content": {"application/json": {"example": RAW_GATEWAY_RESPONSE_EXAMPLE}}},
        502: {"description": "Gateway upstream error"},
        504: {"description": "Gateway timeout"},
    },
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "examples": {
                        "json_object": {"summary": "JSON object response", "value": JSON_OBJECT_REQUEST_EXAMPLE}
                    }
                }
            }
        }
    },
)
async def raw_chat_with_gateway(payload: ChatRequest) -> RawChatResponse:
    settings = get_settings()
    return await create_raw_chat_completion(payload, settings)
