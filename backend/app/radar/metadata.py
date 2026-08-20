import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
SCHEMA = """CREATE TABLE IF NOT EXISTS radar_files (id TEXT PRIMARY KEY, original_filename TEXT NOT NULL, stored_filename TEXT NOT NULL, file_size INTEGER NOT NULL, sha256 TEXT NOT NULL UNIQUE, ingested_at TEXT NOT NULL, storage_path TEXT NOT NULL, decode_status TEXT NOT NULL, radar_site TEXT, product_code TEXT, scan_time TEXT, error TEXT, product_name TEXT, latitude REAL, longitude REAL, radar_altitude REAL, elevation_angle REAL, radial_count INTEGER, gate_count INTEGER, decoded_path TEXT, decoded_size INTEGER, decode_time_ms REAL, min_valid_dbz REAL, max_valid_dbz REAL, special_states TEXT)"""
EXTRA_COLUMNS = {"product_name": "TEXT", "latitude": "REAL", "longitude": "REAL", "radar_altitude": "REAL", "elevation_angle": "REAL", "radial_count": "INTEGER", "gate_count": "INTEGER", "decoded_path": "TEXT", "decoded_size": "INTEGER", "decode_time_ms": "REAL", "min_valid_dbz": "REAL", "max_valid_dbz": "REAL", "special_states": "TEXT"}

class MetadataStore:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True); self.path = path
        with self._connect() as db:
            db.execute(SCHEMA)
            existing = {row[1] for row in db.execute("PRAGMA table_info(radar_files)")}
            for name, type_ in EXTRA_COLUMNS.items():
                if name not in existing: db.execute(f"ALTER TABLE radar_files ADD COLUMN {name} {type_}")
    def _connect(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path); db.row_factory = sqlite3.Row; return db
    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        columns = ["id", "original_filename", "stored_filename", "file_size", "sha256", "ingested_at", "storage_path", "decode_status", "radar_site", "product_code", "scan_time", "error", *EXTRA_COLUMNS]
        placeholders = ",".join(f":{name}" for name in columns)
        values = {name: data.get(name) for name in columns}
        with self._connect() as db: db.execute(f"INSERT INTO radar_files ({','.join(columns)}) VALUES ({placeholders})", values)
        return data
    def update(self, file_id: str, **fields: Any) -> dict[str, Any] | None:
        fields = {key: value for key, value in fields.items() if key in {"decode_status", "error", "radar_site", "product_code", "scan_time", *EXTRA_COLUMNS}}
        if not fields: return self.get(file_id)
        assignments = ",".join(f"{key} = :{key}" for key in fields)
        with self._connect() as db:
            db.execute(f"UPDATE radar_files SET {assignments} WHERE id = :id", {**fields, "id": file_id})
        return self.get(file_id)
    def get(self, file_id: str) -> dict[str, Any] | None:
        with self._connect() as db: row = db.execute("SELECT * FROM radar_files WHERE id=?", (file_id,)).fetchone()
        return dict(row) if row else None
    def list(self, limit: int, offset: int, decode_status: str | None = None) -> list[dict[str, Any]]:
        query, args = "SELECT * FROM radar_files", []
        if decode_status: query += " WHERE decode_status=?"; args.append(decode_status)
        query += " ORDER BY ingested_at DESC LIMIT ? OFFSET ?"; args.extend((limit, offset))
        with self._connect() as db: return [dict(row) for row in db.execute(query, args).fetchall()]
def iso_now() -> str: return datetime.now(timezone.utc).isoformat()
