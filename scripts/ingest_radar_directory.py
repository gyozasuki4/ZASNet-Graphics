#!/usr/bin/env python3
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.config import get_settings
from app.radar.ingest import DuplicateFile, RadarIngestService
from app.radar.metadata import MetadataStore
from app.radar.storage import RadarStorage

def main() -> int:
    settings = get_settings()
    service = RadarIngestService(RadarStorage(settings.radar_incoming_dir, settings.radar_archive_dir, settings.radar_rejected_dir, settings.radar_decoded_dir), MetadataStore(settings.database_path), settings.max_upload_bytes)
    for path in sorted(settings.radar_incoming_dir.iterdir()):
        if not path.is_file() or path.name.startswith(".upload-"): continue
        try: service.ingest_path(path); print(f"accepted {path.name}")
        except DuplicateFile as exc: print(f"duplicate {path.name} {exc.file_id}")
        except Exception as exc: print(f"rejected {path.name}: {exc}")
    return 0
if __name__ == "__main__": raise SystemExit(main())
