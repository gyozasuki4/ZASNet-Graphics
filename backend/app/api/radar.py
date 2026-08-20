import json
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
