from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Trip Timing AI"
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    LITEAPI_API_KEY: str = ""
    WEATHER_API_KEY: str = ""
    DATABASE_URL: str = (
        "postgresql://triptiming:triptiming@postgres:5432/triptiming"
    )

    class Config:
        env_file = ".env"


settings = Settings()
