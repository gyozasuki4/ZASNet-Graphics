from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "ZASNet WX Broadcast Graphics"
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8080
    radar_data_root: Path = Path("/opt/zasnet-broadcast/data/radar")
    radar_incoming_dir: Path | None = None
    radar_archive_dir: Path | None = None
    radar_rejected_dir: Path | None = None
    radar_decoded_dir: Path | None = None
    database_path: Path | None = None
    log_level: str = "INFO"
    log_file: Path | None = None
    max_upload_bytes: int = 100 * 1024 * 1024
    live_radar_enabled: bool = False
    live_radar_site: str = "KRIW"
    live_radar_product: str = "94"
    live_radar_source_product: str = "N0Q"
    live_radar_poll_seconds: int = 60
    live_radar_stale_minutes: int = 12
    live_radar_hot_retention_minutes: int = 60
    live_radar_max_frames: int = 30
    live_radar_source: str = "nws_tgftp"
    live_radar_max_download_bytes: int = 25 * 1024 * 1024
    model_config = SettingsConfigDict(env_file=".env", env_prefix="", extra="ignore")
    def model_post_init(self, __context: object) -> None:
        self.radar_incoming_dir = self.radar_incoming_dir or self.radar_data_root / "incoming"
        self.radar_archive_dir = self.radar_archive_dir or self.radar_data_root / "archive"
        self.radar_rejected_dir = self.radar_rejected_dir or self.radar_data_root / "rejected"
        self.radar_decoded_dir = self.radar_decoded_dir or self.radar_data_root / "decoded"
        self.database_path = self.database_path or self.radar_data_root.parent / "backend.db"
        self.log_file = self.log_file or self.database_path.parent / "logs" / "backend.log"

@lru_cache
def get_settings() -> Settings:
    return Settings()
