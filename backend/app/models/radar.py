from datetime import datetime
from pydantic import BaseModel, ConfigDict
from enum import Enum

class RadarFile(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_filename: str
    stored_filename: str
    file_size: int
    sha256: str
    ingested_at: datetime
    storage_path: str
    decode_status: str = "pending"
    radar_site: str | None = None
    product_code: str | None = None
    scan_time: datetime | None = None
    error: str | None = None
    product_name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radar_altitude: float | None = None
    elevation_angle: float | None = None
    radial_count: int | None = None
    gate_count: int | None = None
    decoded_path: str | None = None
    decoded_size: int | None = None

class RadarValueState(str, Enum):
    VALID = "valid"
    NO_DATA = "no_data"
    BELOW_THRESHOLD = "below_threshold"
    RANGE_FOLDED = "range_folded"

class DecodedRadial(BaseModel):
    azimuth: float
    start_azimuth: float | None = None
    end_azimuth: float | None = None
    delta_azimuth: float | None = None
    first_gate_m: float
    gate_spacing_m: float
    gate_count: int
    values: list[float | None]
    states: list[RadarValueState]

class DecodedRadarProduct(BaseModel):
    file_id: str | None = None
    radar_site: str
    product_code: str
    product_name: str
    scan_time: datetime | None = None
    generation_time: datetime | None = None
    latitude: float
    longitude: float
    radar_altitude: float | None = None
    elevation_angle: float | None = None
    units: str = "dBZ"
    radial_count: int
    gate_count: int
    gate_spacing_m: float
    first_gate_m: float
    radials: list[DecodedRadial]
    metadata: dict = {}

class IngestResponse(BaseModel):
    status: str
    file: RadarFile | None = None
    file_id: str | None = None
    message: str | None = None
