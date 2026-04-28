from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "OnChat"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database - SQLite for free hosting, PostgreSQL for production
    DATABASE_URL: str = "sqlite+aiosqlite:///./onchat.db"

    # JWT
    SECRET_KEY: str = "change-this-to-a-secure-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    # Socket.IO
    SOCKETIO_PATH: str = "/socket.io"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()