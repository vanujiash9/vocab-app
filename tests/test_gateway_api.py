import pytest
from fastapi import HTTPException

from typing import Any

from app.services.gateway import GatewayRequestBody, GatewayResponseEnvelope, normalize_chat_response


def make_envelope(data: dict[str, Any]) -> GatewayResponseEnvelope:
    return GatewayResponseEnvelope(
        url="https://gateway.example.com/v1/chat/completions",
        body=GatewayRequestBody(model="test-model", messages=[]),
        data=data,
    )


def test_normalize_chat_response_returns_output_and_metadata():
    response = normalize_chat_response(
        make_envelope(
            {
                "id": "chatcmpl-1",
                "model": "upstream-model",
                "choices": [
                    {
                        "message": {"content": "Xin chào"},
                        "finish_reason": "stop",
                    }
                ],
            }
        )
    )

    assert response.id == "chatcmpl-1"
    assert response.model == "upstream-model"
    assert response.output == "Xin chào"
    assert response.finish_reason == "stop"


def test_normalize_chat_response_rejects_missing_content():
    with pytest.raises(HTTPException) as error:
        normalize_chat_response(make_envelope({"choices": [{"message": {}}]}))

    assert error.value.status_code == 502
    assert error.value.detail == "Gateway không trả về nội dung hợp lệ."
