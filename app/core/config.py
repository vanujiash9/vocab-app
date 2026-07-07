from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    gateway_base_url: str = Field(..., validation_alias=AliasChoices("GATEWAY_BASE_URL", "OPENAI__BASE_URL"))
    gateway_api_key: str = Field(..., validation_alias=AliasChoices("GATEWAY_API_KEY", "OPENAI__API_KEY"))
    gateway_model: str = Field(..., validation_alias=AliasChoices("GATEWAY_MODEL", "OPENAI__MODEL"))
    gateway_timeout_seconds: float = Field(30, validation_alias=AliasChoices("GATEWAY_TIMEOUT_SECONDS", "OPENAI__TIMEOUT_SECONDS"))
    fastapi_cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:4175", "http://localhost:4176", "http://localhost:4177"], alias="FASTAPI_CORS_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
