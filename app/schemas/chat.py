from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(..., min_length=1)


class ResponseFormat(BaseModel):
    type: Literal["text", "json_object"]


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1)
    temperature: Optional[float] = Field(default=None, ge=0, le=2)
    model: Optional[str] = Field(default=None, min_length=1)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    response_format: Optional[ResponseFormat] = None
    stream: bool = False

    @model_validator(mode="after")
    def validate_stream(self) -> "ChatRequest":
        if self.stream:
            raise ValueError("Streaming chưa được hỗ trợ. Hãy gửi stream=false.")
        return self


class ChatResponse(BaseModel):
    id: str
    model: str
    output: str
    finish_reason: Optional[str] = None


class RawChatResponse(BaseModel):
    data: dict[str, Any]
    forwarded_model: str
    forwarded_url: str


class ModelsResponse(BaseModel):
    configured_model: str
    note: str


class HealthResponse(BaseModel):
    status: str
    auth_header: str
    docs: str


class RootResponse(BaseModel):
    name: str
    docs: str
    health: str
    models: str
    normalized_chat: str
    raw_chat: str


class ErrorResponse(BaseModel):
    detail: str


TEXT_REQUEST_EXAMPLE = {
    "messages": [
        {
            "role": "user",
            "content": "Explain spaced repetition simply.",
        }
    ],
    "temperature": 0.2,
    "max_tokens": 200,
    "response_format": {"type": "text"},
    "stream": False,
}

JSON_OBJECT_REQUEST_EXAMPLE = {
    "messages": [
        {
            "role": "user",
            "content": "Return a JSON object with keys title and summary about spaced repetition.",
        }
    ],
    "temperature": 0.2,
    "max_tokens": 200,
    "response_format": {"type": "json_object"},
    "stream": False,
}

NORMALIZED_RESPONSE_EXAMPLE = {
    "id": "chatcmpl-example",
    "model": "cx/gpt-5.4-mini",
    "output": "Spaced repetition is a study method that shows information again right before you are likely to forget it.",
    "finish_reason": "stop",
}

RAW_GATEWAY_RESPONSE_EXAMPLE = {
    "data": {
        "id": "chatcmpl-example",
        "object": "chat.completion",
        "model": "cx/gpt-5.4-mini",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Spaced repetition is a study method that shows information again right before you are likely to forget it.",
                },
                "finish_reason": "stop",
            }
        ],
    },
    "forwarded_model": "cx/gpt-5.4-mini",
    "forwarded_url": "https://your-openai-compatible-gateway.example.com/v1/chat/completions",
}

ERROR_RESPONSE_EXAMPLE = {"detail": "X-API-Key không hợp lệ."}
