from datetime import datetime, timezone
from pathlib import Path

from app.radar.ingest import RadarIngestService
from app.radar.live import LiveRadarService
from app.radar.metadata import MetadataStore
from app.radar.source import RadarCandidate, RadarSource
from app.radar.storage import RadarStorage

class FixtureSource(RadarSource):
    def __init__(self, fixture: Path):
        self.fixture = fixture
        self.candidates = [
            RadarCandidate("one", "fixture://one", "one.nids", datetime.now(timezone.utc)),
            RadarCandidate("two", "fixture://two", "two.nids", datetime.now(timezone.utc)),
        ]
    def list_recent(self, site, source_product, max_age_minutes, limit):
        return self.candidates[:limit]
    def download(self, candidate, destination, max_bytes):
        data = self.fixture.read_bytes(); destination.write_bytes(data); return len(data)

def test_live_poll_indexes_frames_and_status(tmp_path):
    fixture = Path(__file__).parent / "fixtures" / "KOUN_SDUS54_N0QTLX_201305202016"
    metadata = MetadataStore(tmp_path / "backend.db")
    storage = RadarStorage(tmp_path / "incoming", tmp_path / "archive", tmp_path / "rejected", tmp_path / "decoded")
    worker = LiveRadarService(RadarIngestService(storage, metadata), metadata, FixtureSource(fixture), "TLX", "94", max_frames=2)
    frames = worker.poll_once()
    assert len(frames) == 1  # the two source objects contain the same SHA-256 product
    assert metadata.get_live_status("TLX", "94")["status"] == "stale"
    listed = metadata.list_frames("TLX", "94", None, 10)
    assert len(listed) == 1 and listed[0]["decode_status"] == "decoded"
