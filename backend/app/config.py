from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    db_name: str = "aidflow"
    gemini_api_key: str = ""
    google_maps_api_key: str = ""

    model_config = {"env_file": Path(__file__).resolve().parents[1] / ".env"}


settings = Settings()
