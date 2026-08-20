import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .api.health import router as health_router
from .api.system import router as system_router
from .api.radar import router as radar_router
from .config import get_settings
from .logging_config import configure_logging
from .radar.ingest import RadarIngestService
from .radar.metadata import MetadataStore
from .radar.storage import RadarStorage
from .radar.live import LiveRadarService
from .radar.source import NwsTgftpLevel3Source
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings(); configure_logging(settings.log_level, settings.log_file); app.state.settings = settings
    app.state.metadata = MetadataStore(settings.database_path); app.state.storage = RadarStorage(settings.radar_incoming_dir, settings.radar_archive_dir, settings.radar_rejected_dir, settings.radar_decoded_dir); app.state.ingest = RadarIngestService(app.state.storage, app.state.metadata, settings.max_upload_bytes)
    app.state.live = None
    logging.getLogger(__name__).info("Application startup"); yield; logging.getLogger(__name__).info("Application shutdown")
app = FastAPI(title="ZASNet WX Broadcast Graphics", version="1.0.0", lifespan=lifespan)
app.include_router(health_router, prefix="/api/v1"); app.include_router(system_router, prefix="/api/v1"); app.include_router(radar_router, prefix="/api/v1")
@app.get("/")
def root() -> dict[str, str]: return {"name": "ZASNet WX Broadcast Graphics", "component": "backend", "status": "running", "api_version": "v1"}
