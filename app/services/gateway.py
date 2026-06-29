from dataclasses import dataclass
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas.chat import ChatRequest, ChatResponse, RawChatResponse


@dataclass(frozen=True)
class GatewayRequestBody:
    model: str
    messages: list[dict[str, str]]
    temperature: float | None = None
    max_tokens: int | None = None
    response_format: dict[str, str] | None = None
    stream: bool = False

    def to_dict(self) -> dict[str, Any]:
        body: dict[str, Any] = {
            "model": self.model,
            "messages": self.messages,
            "stream": self.stream,
        }
        if self.temperature is not None:
            body["temperature"] = self.temperature
        if self.max_tokens is not None:
            body["max_tokens"] = self.max_tokens
        if self.response_format is not None:
            body["response_format"] = self.response_format
        return body


@dataclass(frozen=True)
class GatewayResponseEnvelope:
    url: str
    body: GatewayRequestBody
    data: dict[str, Any]


@dataclass(frozen=True)
class GatewayRequestInfo:
    model: str
    messages: list[dict[str, str]]
    temperature: float | None
    max_tokens: int | None
    response_format: dict[str, str] | None
    stream: bool

    def to_body(self) -> GatewayRequestBody:
        return GatewayRequestBody(
            model=self.model,
            messages=self.messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            response_format=self.response_format,
            stream=self.stream,
        )


def _to_request_info(payload: ChatRequest, settings: Settings) -> GatewayRequestInfo:
    return GatewayRequestInfo(
        model=payload.model or settings.gateway_model,
        messages=[message.model_dump() for message in payload.messages],
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        response_format=payload.response_format.model_dump() if payload.response_format else None,
        stream=payload.stream,
    )


def _build_gateway_request_body(payload: ChatRequest, settings: Settings) -> GatewayRequestBody:
    return _to_request_info(payload, settings).to_body()


def _normalize_chat_completions_url(base_url: str) -> str:
    normalized = base_url.strip().strip('"').strip("'")
    if normalized.endswith("/chat/completions"):
        return normalized
    return f"{normalized.rstrip('/')}/chat/completions"


def _build_gateway_request_body(payload: ChatRequest, settings: Settings) -> GatewayRequestBody:
    return GatewayRequestBody(
        model=payload.model or settings.gateway_model,
        messages=[message.model_dump() for message in payload.messages],
        temperature=payload.temperature,
        max_tokens=payload.max_tokens,
        response_format=payload.response_format.model_dump() if payload.response_format else None,
        stream=payload.stream,
    )


async def forward_chat_completion(payload: ChatRequest, settings: Settings) -> GatewayResponseEnvelope:
    url = _normalize_chat_completions_url(settings.gateway_base_url)
    body = _build_gateway_request_body(payload, settings)
    timeout = httpx.Timeout(settings.gateway_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.gateway_api_key}",
                },
                json=body.to_dict(),
            )
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail=f"Gateway timeout sau {settings.gateway_timeout_seconds} giây.") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=f"Không kết nối được tới gateway: {error}") from error

    if response.status_code >= 400:
        detail = response.text[:1000] or f"Gateway trả lỗi HTTP {response.status_code}."
        raise HTTPException(status_code=502, detail=f"Gateway error: {detail}")

    data = response.json()
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="Gateway không trả về JSON object hợp lệ.")

    return GatewayResponseEnvelope(url=url, body=body, data=data)


def normalize_chat_response(envelope: GatewayResponseEnvelope) -> ChatResponse:
    choice = envelope.data.get("choices", [{}])[0]
    message = choice.get("message", {})
    content = message.get("content")

    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=502, detail="Gateway không trả về nội dung hợp lệ.")

    return ChatResponse(
        id=str(envelope.data.get("id", "gateway-response")),
        model=str(envelope.data.get("model", envelope.body.model)),
        output=content,
        finish_reason=choice.get("finish_reason"),
    )


async def create_chat_completion(payload: ChatRequest, settings: Settings) -> ChatResponse:
    envelope = await forward_chat_completion(payload, settings)
    return normalize_chat_response(envelope)


async def create_raw_chat_completion(payload: ChatRequest, settings: Settings) -> RawChatResponse:
    envelope = await forward_chat_completion(payload, settings)
    return RawChatResponse(
        data=envelope.data,
        forwarded_model=envelope.body.model,
        forwarded_url=envelope.url,
    )


__all__ = [
    "create_chat_completion",
    "create_raw_chat_completion",
    "forward_chat_completion",
    "normalize_chat_response",
]
