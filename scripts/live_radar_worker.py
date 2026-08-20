#!/usr/bin/env python3
"""Run the configured live Level III acquisition loop outside FastAPI."""
import asyncio
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.config import get_settings
from app.logging_config import configure_logging
from app.radar.ingest import RadarIngestService
from app.radar.live import LiveRadarService
from app.radar.metadata import MetadataStore
from app.radar.source import NwsTgftpLevel3Source
from app.radar.storage import RadarStorage

async def main() -> None:
    settings = get_settings(); configure_logging(settings.log_level, settings.log_file)
    if not settings.live_radar_enabled:
        logging.getLogger(__name__).warning("Live radar is disabled; set LIVE_RADAR_ENABLED=true to start acquisition")
        return
    metadata = MetadataStore(settings.database_path)
    storage = RadarStorage(settings.radar_incoming_dir, settings.radar_archive_dir, settings.radar_rejected_dir, settings.radar_decoded_dir)
    ingest = RadarIngestService(storage, metadata, settings.max_upload_bytes)
    worker = LiveRadarService(ingest, metadata, NwsTgftpLevel3Source(), settings.live_radar_site, settings.live_radar_product, settings.live_radar_source_product, settings.live_radar_poll_seconds, settings.live_radar_stale_minutes, settings.live_radar_hot_retention_minutes, settings.live_radar_max_frames, settings.live_radar_max_download_bytes)
    await worker.run()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: pass
