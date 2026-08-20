from datetime import datetime, timezone
from pathlib import Path
import re
_SAFE = re.compile(r"[^A-Za-z0-9._-]+")

class RadarStorage:
    def __init__(self, incoming: Path, archive: Path, rejected: Path, decoded: Path | None = None) -> None:
        self.incoming, self.archive, self.rejected = incoming, archive, rejected
        self.decoded = decoded or archive.parent / "decoded"
        for path in (incoming, archive, rejected, self.decoded): path.mkdir(parents=True, exist_ok=True)
    @staticmethod
    def safe_filename(name: str) -> str:
        cleaned = _SAFE.sub("_", Path(name).name).strip("._")
        return cleaned[:180] or "radar-product"
    def archive_path(self, filename: str, when: datetime | None = None) -> Path:
        now = when or datetime.now(timezone.utc)
        return self.archive / "undecoded" / f"{now.year:04d}" / f"{now.month:02d}" / f"{now.day:02d}" / self.safe_filename(filename)

    def decoded_path(self, site: str, product: str, file_id: str, when: datetime | None = None) -> Path:
        now = when or datetime.now(timezone.utc)
        return self.decoded / self.safe_filename(site) / self.safe_filename(product) / f"{now.year:04d}" / f"{now.month:02d}" / f"{now.day:02d}" / f"{file_id}.l3z"
