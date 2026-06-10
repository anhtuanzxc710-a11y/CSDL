import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NVT Quant Lab Backend"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
        "https://dntquantlab.pro.vn",
    ]
    
    # DATABASE
    # Using SQL Server as primary, fallback to SQLite for local dev if not set
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./app.db"

    
    # JWT SETTINGS
    # Security note: In production, generate a random secret key and keep it safe
    SECRET_KEY: str = os.getenv("SECRET_KEY", "b3e9fc44c2f6d0f6ed80cd1e204d1ed349c259882aee6ab7f9fd8c3eaf602fd9")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # AI SETTINGS
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # SENTRY SETTINGS
    SENTRY_DSN: str = os.getenv("SENTRY_DSN", "")
    SENTRY_ENVIRONMENT: str = os.getenv("SENTRY_ENVIRONMENT", "production")
    SENTRY_TRACES_SAMPLE_RATE: float = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
    
    # ALERT SETTINGS
    ALERT_WEBHOOK_URL: str = os.getenv("ALERT_WEBHOOK_URL", "")
    ALERT_ENABLED: bool = os.getenv("ALERT_ENABLED", "false").lower() == "true"
    
    # Optimization SETTINGS
    vnstock_source: str = "TCBS"
    trading_days_per_year: int = 252

    class Config:
        env_file = ".env"

settings = Settings()
