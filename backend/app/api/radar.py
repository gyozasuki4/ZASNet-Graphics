import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import FileResponse
from ..models.radar import IngestResponse, RadarFile
router = APIRouter()
@router.post("/radar/ingest", response_model=IngestResponse)
async def ingest(request: Request, file: UploadFile = File(...)):
    status, data, duplicate_id = await request.app.state.ingest.ingest_upload(file)
    if status == "duplicate": return IngestResponse(status=status, file_id=duplicate_id, message="File has already been ingested.")
    return IngestResponse(status="accepted", file=RadarFile.model_validate(data))
@router.get("/radar/files", response_model=list[RadarFile])
def files(request: Request, limit: int = Query(50, ge=1, le=500), offset: int = Query(0, ge=0), decode_status: str | None = None): return [RadarFile.model_validate(x) for x in request.app.state.metadata.list(limit, offset, decode_status)]
@router.get("/radar/files/{file_id}", response_model=RadarFile)
def get_file(file_id: str, request: Request):
    data = request.app.state.metadata.get(file_id)
    if not data: raise HTTPException(404, "Radar file not found")
    return RadarFile.model_validate(data)

@router.get("/radar/files/{file_id}/metadata")
def decoded_metadata(file_id: str, request: Request):
    data = request.app.state.metadata.get(file_id)
    if not data: raise HTTPException(404, "Radar file not found")
    if data.get("decode_status") != "decoded": raise HTTPException(409, f"Radar file is not decoded ({data.get('decode_status')})")
    return {"file_id": file_id, "radar_site": data.get("radar_site"), "product_code": data.get("product_code"), "product_name": data.get("product_name"), "scan_time": data.get("scan_time"), "latitude": data.get("latitude"), "longitude": data.get("longitude"), "radar_altitude": data.get("radar_altitude"), "elevation_angle": data.get("elevation_angle"), "units": "dBZ", "radial_count": data.get("radial_count"), "gate_count": data.get("gate_count"), "decoded_size": data.get("decoded_size"), "min_valid_dbz": data.get("min_valid_dbz"), "max_valid_dbz": data.get("max_valid_dbz"), "special_states": json.loads(data["special_states"]) if data.get("special_states") else [], "decode_time_ms": data.get("decode_time_ms")}

@router.get("/radar/files/{file_id}/data")
def decoded_data(file_id: str, request: Request):
    data = request.app.state.metadata.get(file_id)
    if not data: raise HTTPException(404, "Radar file not found")
    if data.get("decode_status") != "decoded": raise HTTPException(409, f"Radar file is not decoded ({data.get('decode_status')})")
    path = Path(data["decoded_path"]).resolve()
    root = request.app.state.storage.decoded.resolve()
    if root not in path.parents: raise HTTPException(500, "Decoded payload path is outside storage root")
    if not path.is_file(): raise HTTPException(404, "Decoded payload not found")
    return FileResponse(path, media_type="application/octet-stream", filename=path.name, headers={"X-Radar-Format": "zasnet-level3-radials-v1"})

@router.get("/radar/{site}/{product}/latest", response_model=RadarFile)
def latest(site: str, product: str, request: Request):
    matches = [x for x in request.app.state.metadata.list(500, 0, "decoded") if x.get("radar_site") == site and x.get("product_code") == product]
    if not matches: raise HTTPException(404, "No decoded product found")
    return RadarFile.model_validate(matches[0])

def _live_status(site: str, product: str, request: Request) -> dict:
    settings = request.app.state.settings; site, product = site.upper(), product
    stored = request.app.state.metadata.get_live_status(site, product)
    if not settings.live_radar_enabled and not stored:
        return {"site": site, "product": product, "status": "disabled", "source": settings.live_radar_source, "last_poll": None, "latest_scan": None, "age_seconds": None, "frame_count_60m": 0, "consecutive_failures": 0, "last_error": None}
    stored = stored or {}; latest_scan = stored.get("latest_scan"); age = None; state = stored.get("status", "offline")
    if latest_scan:
        try:
            age = max(0.0, (datetime.now(timezone.utc) - datetime.fromisoformat(latest_scan)).total_seconds())
            if age > settings.live_radar_stale_minutes * 60: state = "stale"
        except ValueError: state = "error"
    since = datetime.now(timezone.utc) - timedelta(minutes=settings.live_radar_hot_retention_minutes)
    count = len(request.app.state.metadata.list_frames(site, product, since, settings.live_radar_max_frames))
    return {"site": site, "product": product, "status": state, "source": stored.get("source", settings.live_radar_source), "last_poll": stored.get("last_poll"), "last_discovery": stored.get("last_discovery"), "latest_scan": latest_scan, "age_seconds": age, "frame_count_60m": count, "consecutive_failures": stored.get("consecutive_failures", 0), "last_error": stored.get("last_error")}

@router.get("/radar/{site}/{product}/status")
def live_status(site: str, product: str, request: Request):
    return _live_status(site, product, request)

@router.get("/radar/{site}/{product}/frames")
def frames(site: str, product: str, request: Request, minutes: int = Query(30, ge=1, le=60), limit: int = Query(30, ge=1, le=100)):
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    rows = request.app.state.metadata.list_frames(site.upper(), product, since, min(limit, request.app.state.settings.live_radar_max_frames))
    return {"site": site.upper(), "product": product, "minutes": minutes, "order": "oldest_to_newest", "frames": [{"file_id": row["id"], "scan_time": row["scan_time"], "file_size": row["file_size"], "decoded_size": row.get("decoded_size"), "decode_status": row["decode_status"]} for row in rows]}
