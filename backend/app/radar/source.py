"""Public Level III source adapters."""
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
import re
import time
from urllib.request import Request, urlopen

USER_AGENT = "ZASNet-WX-Broadcast-Graphics/0.4"

@dataclass(frozen=True)
class RadarCandidate:
    source_id: str
    url: str
    filename: str
    modified_at: datetime | None = None

class _IndexParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(); self.href: str | None = None; self.links: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a": self.href = dict(attrs).get("href")
    def handle_data(self, data: str) -> None:
        if self.href and data.strip().startswith("sn."): self.links.append(data.strip()); self.href = None

class RadarSource:
    def list_recent(self, site: str, source_product: str, max_age_minutes: int, limit: int) -> list[RadarCandidate]:
        raise NotImplementedError
    def download(self, candidate: RadarCandidate, destination: Path, max_bytes: int) -> int:
        raise NotImplementedError

class NwsTgftpLevel3Source(RadarSource):
    """NWS RPCCDS FTP gateway's HTTPS directory, suitable for polling."""
    base = "https://tgftp.nws.noaa.gov/data/radar/nexrad_level3"
    def _directory(self, site: str, source_product: str) -> str:
        # Product 94's current equivalent is N0Q, served as DS.p94r0.
        product_dir = "p94r0" if source_product.upper() in {"N0Q", "94"} else source_product.lower()
        return f"{self.base}/DS.{product_dir}/SI.k{site.lower().lstrip('k')}"
    def list_recent(self, site: str, source_product: str, max_age_minutes: int, limit: int) -> list[RadarCandidate]:
        url = self._directory(site, source_product) + "/"
        request = Request(url, headers={"User-Agent": USER_AGENT})
        html = urlopen(request, timeout=20).read().decode("utf-8", errors="replace")
        parser = _IndexParser(); parser.feed(html)
        now = datetime.now(timezone.utc); candidates: list[RadarCandidate] = []
        for filename in parser.links:
            if not re.fullmatch(r"sn\.(?:last|\d{4})", filename): continue
            # The gateway exposes the modification date in the table; use sn.last always and
            # retain recent numbered entries for initial loop bootstrap.
            modified = None
            match = re.search(rf"{re.escape(filename)}</a></td>.*?([0-3]?[0-9]-[A-Za-z]{{3}}-\d{{4}} \d{{2}}:\d{{2}})", html, re.S)
            if match:
                try: modified = datetime.strptime(match.group(1), "%d-%b-%Y %H:%M").replace(tzinfo=timezone.utc)
                except ValueError: pass
            if filename != "sn.last" and modified and (now - modified).total_seconds() > max_age_minutes * 60: continue
            candidates.append(RadarCandidate(f"{url}{filename}", f"{url}{filename}", filename, modified))
        candidates.sort(key=lambda item: item.modified_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        return candidates[:limit]
    def download(self, candidate: RadarCandidate, destination: Path, max_bytes: int) -> int:
        destination.parent.mkdir(parents=True, exist_ok=True)
        for attempt, delay in enumerate((0, 5, 15), start=1):
            if delay: time.sleep(delay)
            try:
                request = Request(candidate.url, headers={"User-Agent": USER_AGENT}); total = 0
                with urlopen(request, timeout=30) as response, destination.open("wb") as output:
                    while chunk := response.read(1024 * 1024):
                        total += len(chunk)
                        if total > max_bytes: raise ValueError("source file exceeds configured maximum")
                        output.write(chunk)
                return total
            except ValueError: raise
            except Exception:
                destination.unlink(missing_ok=True)
                if attempt == 3: raise
        raise RuntimeError("unreachable")
