from pathlib import Path

def test_ingest_duplicate_and_unsafe(client):
    payload = b"test-level-iii-binary"
    first = client.post("/api/v1/radar/ingest", files={"file": ("../../etc/passwd", payload, "application/octet-stream")})
    assert first.status_code == 200 and first.json()["status"] == "accepted"
    item = first.json()["file"]
    assert item["sha256"] and item["decode_status"] in {"failed", "pending"}
    stored = Path(item["storage_path"])
    assert stored.exists()
    assert "etc" not in stored.name and "passwd" in stored.name
    second = client.post("/api/v1/radar/ingest", files={"file": ("other-name", payload, "application/octet-stream")})
    assert second.json()["status"] == "duplicate"
    assert client.get(f"/api/v1/radar/files/{item['id']}").status_code == 200
    assert client.get("/api/v1/radar/files/not-found").status_code == 404

def test_real_fixture_ingests_and_persists_payload(client):
    fixture = Path(__file__).parent / "fixtures" / "KOUN_SDUS54_N0QTLX_201305202016"
    response = client.post("/api/v1/radar/ingest", files={"file": (fixture.name, fixture.read_bytes(), "application/octet-stream")})
    assert response.json()["file"]["decode_status"] == "decoded"
    file_id = response.json()["file"]["id"]
    metadata = client.get(f"/api/v1/radar/files/{file_id}/metadata")
    assert metadata.status_code == 200 and metadata.json()["radial_count"] == 360
    data = client.get(f"/api/v1/radar/files/{file_id}/data")
    assert data.status_code == 200 and data.content.startswith(b"ZASNETL3")
