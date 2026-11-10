import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Restaurant POS & Sync Microservice"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database connection URL (defaults to localhost:5433 for host run, or container DNS for docker)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://ecommerce:ecommerce@localhost:5433/ecommerce"
    )

    def get_clean_database_url(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            return "postgresql+psycopg2://" + url[len("postgresql://"):]
        return url
    DB_SCHEMA: str = os.getenv("DB_SCHEMA", "main_restaurants")
    
    PORT: int = int(os.getenv("PORT", "8005"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

settings = Settings()
