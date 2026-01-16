from pydantic_settings import BaseSettings

# Centralized settings so we can easily switch providers and credentials.
class Settings(BaseSettings):
    openai_api_key: str | None = None
    gemini_api_key: str | None = None
    serpapi_key: str | None = None
    brave_api_key: str | None = None
    database_url: str | None = None  # Example: postgresql://user:pass@host:5432/db
    chroma_path: str = ".chroma"  # Local path for Chroma/FAISS storage
    
    # JWT Authentication Settings
    secret_key: str = "your-secret-key-change-this-in-production" 
    jwt_algorithm: str = "HS256"
    access_token_expire_days: int = 7
    
    # CORS Settings
    cors_origins: list[str] = ["*"]
    cors_credentials: bool = False
    cors_methods: list[str] = ["*"]
    cors_headers: list[str] = ["*"]
    
    # Rate Limiting Settings (requests per minute per IP)
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100  # 100 requests per minute
    rate_limit_period: int = 60  # seconds
    
    # Request Throttling (min seconds between requests from same IP)
    throttle_enabled: bool = True
    throttle_delay: float = 0.1  # 100ms minimum between requests
    
    # Collection endpoint specific throttling (heavy operation)
    collection_endpoint_rate_limit: int = 10  # 10 requests per minute for /knowledge/collections

    class Config:
        env_file = ".env"
        extra = "ignore"


def get_settings() -> Settings:
    # Lazy singleton pattern can be added later if needed.
    return Settings()
