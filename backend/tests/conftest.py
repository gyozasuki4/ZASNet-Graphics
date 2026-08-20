from pathlib import Path
import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("RADAR_DATA_ROOT", str(tmp_path / "radar"))
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "backend.db"))
    monkeypatch.setenv("LOG_FILE", str(tmp_path / "backend.log"))
    from app.config import get_settings
    get_settings.cache_clear()
    from app.main import app
    with TestClient(app) as c:
        yield c
