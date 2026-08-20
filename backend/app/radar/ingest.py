import hashlib
import logging
import shutil
import json
import time
from pathlib import Path
from fastapi import HTTPException, UploadFile
from .metadata import MetadataStore, iso_now
from .storage import RadarStorage
from .decoder import DecoderError, NexradLevel3Decoder, UnsupportedProduct, encode_payload
log = logging.getLogger(__name__)

class DuplicateFile(Exception):
    def __init__(self, file_id: str) -> None: self.file_id = file_id

class RadarIngestService:
    def __init__(self, storage: RadarStorage, metadata: MetadataStore, max_bytes: int = 100 * 1024 * 1024, decoder=None):
        self.storage, self.metadata, self.max_bytes = storage, metadata, max_bytes
        self.decoder = decoder or NexradLevel3Decoder()
    def ingest_path(self, source: Path, original_filename: str | None = None) -> dict:
        if not source.is_file(): raise ValueError("Radar file does not exist")
        return self._ingest(source, original_filename or source.name, move=False)
    async def ingest_upload(self, upload: UploadFile) -> tuple[str, dict | None, str | None]:
        name = self.storage.safe_filename(upload.filename or "radar-product")
        temp = self.storage.incoming / f".upload-{hashlib.sha256(name.encode()).hexdigest()[:16]}"; size = 0
        try:
            with temp.open("wb") as out:
                while chunk := await upload.read(1024 * 1024):
                    size += len(chunk)
                    if size > self.max_bytes: raise HTTPException(413, "Upload exceeds maximum size")
                    out.write(chunk)
            try: return "accepted", self._ingest(temp, name, move=True), None
            except DuplicateFile as duplicate: return "duplicate", None, duplicate.file_id
        finally: temp.unlink(missing_ok=True)
    def _ingest(self, source: Path, name: str, move: bool) -> dict:
        log.info("Radar file ingest attempt filename=%s", name); digest = hashlib.sha256(); size = 0
        with source.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""): digest.update(chunk); size += len(chunk)
        file_id = digest.hexdigest()
        if self.metadata.get(file_id): log.warning("Duplicate radar file rejected file_id=%s", file_id); raise DuplicateFile(file_id)
        destination = self.storage.archive_path(name); destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists(): destination = destination.with_name(f"{file_id[:12]}-{destination.name}")
        (shutil.move if move else shutil.copy2)(source, destination)
        data = {"id": file_id, "original_filename": name, "stored_filename": destination.name, "file_size": size, "sha256": file_id, "ingested_at": iso_now(), "storage_path": str(destination), "decode_status": "pending", "radar_site": None, "product_code": None, "scan_time": None, "error": None}
        try: self.metadata.create(data)
        except Exception: destination.unlink(missing_ok=True); raise
        self._decode(file_id, destination)
        log.info("Radar file ingested file_id=%s path=%s", file_id, destination)
        return self.metadata.get(file_id) or data

    def _decode(self, file_id: str, source: Path) -> None:
        started = time.perf_counter()
        try:
            decoded = self.decoder.decode(source, file_id=file_id)
            payload = encode_payload(decoded)
            destination = self.storage.decoded_path(decoded.radar_site, decoded.product_code, file_id, decoded.scan_time)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(payload)
            valid = [value for radial in decoded.radials for value in radial.values if value is not None]
            states = sorted({state.value for radial in decoded.radials for state in radial.states})
            elapsed = (time.perf_counter() - started) * 1000
            self.metadata.update(file_id, decode_status="decoded", radar_site=decoded.radar_site, product_code=decoded.product_code, scan_time=decoded.scan_time.isoformat() if decoded.scan_time else None, product_name=decoded.product_name, latitude=decoded.latitude, longitude=decoded.longitude, radar_altitude=decoded.radar_altitude, elevation_angle=decoded.elevation_angle, radial_count=decoded.radial_count, gate_count=decoded.gate_count, decoded_path=str(destination), decoded_size=len(payload), decode_time_ms=elapsed, min_valid_dbz=min(valid) if valid else None, max_valid_dbz=max(valid) if valid else None, special_states=json.dumps(states))
            log.info("Decoded payload stored file_id=%s bytes=%d elapsed_ms=%.1f", file_id, len(payload), elapsed)
        except UnsupportedProduct as exc:
            self.metadata.update(file_id, decode_status="unsupported_product", error=str(exc), decode_time_ms=(time.perf_counter()-started)*1000)
            log.warning("Unsupported radar product file_id=%s error=%s", file_id, exc)
        except DecoderError as exc:
            self.metadata.update(file_id, decode_status="failed", error=str(exc), decode_time_ms=(time.perf_counter()-started)*1000)
            log.error("Radar decode failed file_id=%s error=%s", file_id, exc)
        except Exception as exc:
            self.metadata.update(file_id, decode_status="failed", error=f"Unexpected decoder error: {exc}", decode_time_ms=(time.perf_counter()-started)*1000)
            log.exception("Unexpected radar decode error file_id=%s", file_id)
