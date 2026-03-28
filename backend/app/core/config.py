from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    PROJECT_NAME: str = "Trip Timing AI"
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    LITEAPI_API_KEY_SEARCH: str = ""
    LITEAPI_API_KEY_RATES: str = ""
    DATABASE_URL: str = (
        "postgresql://triptiming:triptiming@postgres:5432/triptiming"
    )


settings = Settings()
