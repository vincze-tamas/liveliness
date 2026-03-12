from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./liveliness.db"
    anthropic_api_key: str = ""
    garmin_username: str = ""
    garmin_password: str = ""
    secret_key: str = "changeme"
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
