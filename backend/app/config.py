from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    db_name: str = "aidflow"
    # Default: three levels up from app/ → swachhata/complaints.json (local dev)
    # Override with COMPLAINTS_JSON env var (e.g. /data/complaints.json in Docker)
    complaints_json: Path = Path(__file__).resolve().parents[3] / "complaints.json"

    model_config = {"env_file": Path(__file__).resolve().parents[1] / ".env"}


settings = Settings()
