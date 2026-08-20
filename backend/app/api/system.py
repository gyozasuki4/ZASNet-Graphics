from fastapi import APIRouter, Request
router = APIRouter()
@router.get("/system/status")
def status(request: Request) -> dict:
    settings = request.app.state.settings
    return {"status": "ok", "application": settings.app_name, "environment": settings.app_env, "radar_storage": {"incoming": settings.radar_incoming_dir.is_dir(), "archive": settings.radar_archive_dir.is_dir(), "rejected": settings.radar_rejected_dir.is_dir(), "decoded": settings.radar_decoded_dir.is_dir()}}
