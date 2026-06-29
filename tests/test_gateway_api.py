import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("GATEWAY_BASE_URL", "https://gateway.example.com/v1")
os.environ.setdefault("GATEWAY_API_KEY", "test-gateway-key")
os.environ.setdefault("GATEWAY_MODEL", "cx/gpt-5.4-mini")

from app.api import routes
from app.main import app

client = TestClient(app)
RAW_GATEWAY_DATA = {
    "id": "chatcmpl-test",
    "model": "cx/gpt-5.4-mini",
    "choices": [
        {
            "message": {
                "role": "assistant",
                "content": "hello from gateway",
            },
            "finish_reason": "stop",
        }
    ],
}


def make_payload() -> dict:
    return {
        "messages": [
            {
                "role": "user",
                "content": "Say hello",
            }
        ],
        "temperature": 0.2,
        "max_tokens": 64,
        "response_format": {"type": "json_object"},
        "stream": False,
    }


def test_health_check() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_raw_chat_returns_gateway_payload(monkeypatch) -> None:
    async def _fake_raw_completion(payload, settings):
        return {
            "data": RAW_GATEWAY_DATA,
            "forwarded_model": settings.gateway_model,
            "forwarded_url": f"{settings.gateway_base_url.rstrip('/')}/chat/completions",
        }

    monkeypatch.setattr(routes, "create_raw_chat_completion", _fake_raw_completion)

    response = client.post("/api/chat/raw", json=make_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["data"] == RAW_GATEWAY_DATA
    assert body["forwarded_model"] == "cx/gpt-5.4-mini"
    assert body["forwarded_url"].endswith("/chat/completions")


def test_models_returns_configured_gateway_model() -> None:
    response = client.get("/api/models")

    assert response.status_code == 200
    assert response.json()["configured_model"] == "cx/gpt-5.4-mini"
