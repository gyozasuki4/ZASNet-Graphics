from abc import ABC, abstractmethod
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import struct
import time
import zlib
from typing import Any
from ..models.radar import DecodedRadarProduct, DecodedRadial, RadarValueState
log = logging.getLogger(__name__)
MAGIC = b"ZASNETL3"
FORMAT_VERSION = 1
MAX_RADIALS = 2000
MAX_GATES = 2000

class DecoderError(Exception): pass
class UnsupportedProduct(DecoderError): pass
class RadarDecoder(ABC):
    @abstractmethod
    def decode(self, path: Path, file_id: str | None = None) -> DecodedRadarProduct: raise NotImplementedError
def _utc(value: datetime | None) -> datetime | None:
    if value is None: return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

class NexradLevel3Decoder(RadarDecoder):
    """MetPy-backed Level III radial decoder; preserves native dBZ and states."""
    def decode(self, path: Path, file_id: str | None = None) -> DecodedRadarProduct:
        started = time.perf_counter()
        try:
            from metpy.io import Level3File
            product = Level3File(str(path))
        except Exception as exc: raise DecoderError(f"Level III parser error: {exc}") from exc
        name = str(product.product_name)
        if "Base Reflectivity" not in name: raise UnsupportedProduct(f"Level III product {product.header.code} ({name}) is not supported")
        if not product.sym_block or not product.sym_block[0]: raise DecoderError("Level III product has no radial data block")
        block = product.sym_block[0][0]; starts, ends, data = block["start_az"], block["end_az"], block["data"]
        if not data or len(data) != len(starts) or len(data) > MAX_RADIALS: raise DecoderError("Invalid or oversized radial block")
        gate_count = len(data[0])
        if gate_count == 0 or gate_count > MAX_GATES or any(len(row) != gate_count for row in data): raise DecoderError("Invalid or oversized gate block")
        gate_spacing_m = float(product.max_range) * 1000.0 / gate_count
        first_gate_m = float(block.get("first", 0)) * float(block.get("gate_scale", 1.0)) * 1000.0
        mapper, radials, valid_values, states_seen = product.map_data, [], [], set()
        for index, row in enumerate(data):
            values, states = [], []
            for encoded in row:
                code = int(encoded)
                if code == 0: state, value = RadarValueState.NO_DATA, None
                elif code == 1: state, value = RadarValueState.BELOW_THRESHOLD, None
                else:
                    try: value = float(mapper.lut[code])
                    except (IndexError, TypeError): value = float("nan")
                    if value != value: state, value = RadarValueState.NO_DATA, None
                    else: state = RadarValueState.VALID; valid_values.append(value)
                states.append(state); states_seen.add(state.value); values.append(value)
            start, end = float(starts[index]), float(ends[index]); delta = (end - start) % 360.0
            radials.append(DecodedRadial(azimuth=(start + delta / 2.0) % 360.0, start_azimuth=start, end_azimuth=end, delta_azimuth=delta, first_gate_m=first_gate_m, gate_spacing_m=gate_spacing_m, gate_count=gate_count, values=values, states=states))
        metadata = {"volume_time": _utc(product.metadata.get("vol_time")), "message_time": _utc(product.metadata.get("msg_time")), "thresholds": product.thresholds, "max_range_km": product.max_range, "vcp": product.prod_desc.vcp, "elevation_number": product.prod_desc.el_num, "special_states": sorted(states_seen)}
        decoded = DecodedRadarProduct(file_id=file_id, radar_site=str(product.siteID), product_code=str(product.header.code), product_name=name, scan_time=_utc(product.metadata.get("vol_time")), generation_time=_utc(product.metadata.get("prod_time")), latitude=float(product.lat), longitude=float(product.lon), radar_altitude=float(product.height), elevation_angle=float(product.metadata.get("el_angle")) if product.metadata.get("el_angle") is not None else None, radial_count=len(radials), gate_count=gate_count, gate_spacing_m=gate_spacing_m, first_gate_m=first_gate_m, radials=radials, metadata=metadata)
        log.info("Decoded Level III site=%s product=%s radials=%d gates=%d elapsed_ms=%.1f", decoded.radar_site, decoded.product_code, decoded.radial_count, decoded.gate_count, (time.perf_counter()-started)*1000)
        return decoded

def encode_payload(product: DecodedRadarProduct) -> bytes:
    descriptors, body = [], bytearray()
    state_codes = {RadarValueState.VALID: 0, RadarValueState.NO_DATA: 1, RadarValueState.BELOW_THRESHOLD: 2, RadarValueState.RANGE_FOLDED: 3}
    for radial in product.radials:
        value_offset = len(body); body.extend(struct.pack(f"<{radial.gate_count}f", *[v if v is not None else float("nan") for v in radial.values]))
        state_offset = len(body); body.extend(bytes(state_codes[state] for state in radial.states))
        descriptors.append({"azimuth": radial.azimuth, "start_azimuth": radial.start_azimuth, "end_azimuth": radial.end_azimuth, "delta_azimuth": radial.delta_azimuth, "first_gate_m": radial.first_gate_m, "gate_spacing_m": radial.gate_spacing_m, "gate_count": radial.gate_count, "value_offset": value_offset, "state_offset": state_offset})
    header = {"format": "zasnet-level3-radials", "version": FORMAT_VERSION, "compression": "zlib", "file_id": product.file_id, "radar_site": product.radar_site, "product_code": product.product_code, "units": product.units, "radial_count": product.radial_count, "gate_count": product.gate_count, "radials": descriptors}
    header_bytes = json.dumps(header, separators=(",", ":")).encode(); return MAGIC + struct.pack("<BI", FORMAT_VERSION, len(header_bytes)) + header_bytes + zlib.compress(bytes(body), level=6)
def payload_header(payload: bytes) -> dict[str, Any]:
    if not payload.startswith(MAGIC): raise DecoderError("Invalid decoded payload")
    _, header_len = struct.unpack_from("<BI", payload, len(MAGIC)); start = len(MAGIC) + 5
    return json.loads(payload[start:start + header_len])
