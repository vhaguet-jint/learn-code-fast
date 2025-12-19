from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = Field(default="Learn Code Fast API")
    environment: str = Field(default="development")
    backend_port: int = Field(default=8000)

    database_url: str = Field(default="postgresql+psycopg2://postgres:postgres@db:5432/app")
    redis_url: str = Field(default="redis://redis:6379/0")
    celery_broker_url: str | None = Field(default=None)
    celery_result_backend: str | None = Field(default=None)

    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_api_version: str | None = Field(default="2024-02-15-preview")

    class Config:
        env_file = ".env"
        case_sensitive = False


def get_settings() -> Settings:
    return Settings()
