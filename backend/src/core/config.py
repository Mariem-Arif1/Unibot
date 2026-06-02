from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret_key: str
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_hours: int = 8
    bcrypt_rounds: int = 12
    cors_origins: str = "http://localhost:3000"

    # LLM provider keys (optional — only required when using the respective provider)
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
