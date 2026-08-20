import asyncio
import logging
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from .ingest import DuplicateFile, RadarIngestService
from .metadata import MetadataStore, iso_now
from .source import RadarSource, RadarCandidate
log = logging.getLogger(__name__)

class LiveRadarService:
    def __init__(self, ingest: RadarIngestService, metadata: MetadataStore, source: RadarSource, site: str, product: str, source_product: str = "N0Q", poll_seconds: int = 60, stale_minutes: int = 12, retention_minutes: int = 60, max_frames: int = 30, max_download_bytes: int = 25 * 1024 * 1024) -> None:
        self.ingest, self.metadata, self.source = ingest, metadata, source; self.site, self.product, self.source_product = site.upper(), product, source_product; self.poll_seconds, self.stale_minutes, self.retention_minutes, self.max_frames, self.max_download_bytes = poll_seconds, stale_minutes, retention_minutes, max_frames, max_download_bytes; self._stop = asyncio.Event(); self._seen_sources: set[str] = set()
    def _set(self, **fields: object) -> None: self.metadata.update_live_status(self.site, self.product, source=str(fields.pop("source", "nws_tgftp")), **fields)
    def poll_once(self) -> list[dict]:
        now = datetime.now(timezone.utc); self._set(status="offline", last_poll=now.isoformat(), last_error=None)
        try: candidates = self.source.list_recent(self.site, self.source_product, self.retention_minutes, self.max_frames)
        except Exception as exc:
            previous = self.metadata.get_live_status(self.site, self.product) or {}; failures = int(previous.get("consecutive_failures") or 0) + 1; self._set(status="error", consecutive_failures=failures, last_error=str(exc)); log.warning("Radar source poll failed site=%s product=%s error=%s", self.site, self.product, exc); return []
        self._set(last_discovery=now.isoformat(), consecutive_failures=0)
        results: list[dict] = []
        for candidate in reversed(candidates):
            if candidate.filename != "sn.last" and candidate.source_id in self._seen_sources: continue
            with tempfile.TemporaryDirectory(prefix="zasnet-live-") as temp:
                path = Path(temp) / candidate.filename
                try:
                    self.source.download(candidate, path, self.max_download_bytes)
                    result = self.ingest.ingest_path(path, candidate.filename)
                    if result.get("decode_status") == "decoded" and result.get("radar_site") == self.site[1:]:
                        result = self.metadata.update(result["id"], radar_site=self.site) or result
                    if result.get("decode_status") == "decoded":
                        results.append(result); log.info("Live radar frame indexed file_id=%s scan_time=%s", result.get("id"), result.get("scan_time"))
                except DuplicateFile: self._seen_sources.add(candidate.source_id); log.info("Live radar duplicate skipped source=%s", candidate.source_id)
                except Exception as exc: log.warning("Live radar candidate failed source=%s error=%s", candidate.source_id, exc)
                else:
                    if candidate.filename != "sn.last": self._seen_sources.add(candidate.source_id)
        current = self.metadata.get_live_status(self.site, self.product) or {}
        recent = self.metadata.list_frames(self.site, self.product, None, self.max_frames)
        latest = recent[-1].get("scan_time") if recent else current.get("latest_scan")
        if latest: self._set(latest_scan=latest)
        if latest:
            try:
                age = (datetime.now(timezone.utc) - datetime.fromisoformat(latest)).total_seconds() / 60
                self._set(status="stale" if age > self.stale_minutes else "live")
            except ValueError: pass
        return results
    async def run(self) -> None:
        self._set(status="offline", source="nws_tgftp")
        while not self._stop.is_set():
            await asyncio.to_thread(self.poll_once)
            try: await asyncio.wait_for(self._stop.wait(), timeout=self.poll_seconds)
            except asyncio.TimeoutError: pass
    def stop(self) -> None: self._stop.set()
