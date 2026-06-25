"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://calisthenics:devpassword@localhost:5433/calisthenics",
        description="Async SQLAlchemy database URL",
    )

    # Auth
    bearer_token: str = Field(
        default="dev-bearer-token-replace-me",
        description="Bearer token required on all routes except /healthz",
    )

    # App
    environment: str = Field(default="development")
    api_v1_prefix: str = "/api/v1"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
