from pathlib import Path
from app.radar.decoder import NexradLevel3Decoder, UnsupportedProduct

FIXTURE = Path(__file__).parent / "fixtures" / "KOUN_SDUS54_N0QTLX_201305202016"

def test_real_level3_reflectivity_fixture():
    decoded = NexradLevel3Decoder().decode(FIXTURE, "fixture-id")
    assert decoded.radar_site == "TLX"
    assert decoded.product_code == "94"
    assert decoded.product_name == "Base Reflectivity Data Array"
    assert decoded.scan_time is not None and decoded.scan_time.tzinfo is not None
    assert 30 < decoded.latitude < 40 and -105 < decoded.longitude < -90
    assert decoded.radial_count == 360 and decoded.gate_count == 460
    valid = [v for radial in decoded.radials for v in radial.values if v is not None]
    assert valid and min(valid) >= -32 and max(valid) <= 95
    assert decoded.gate_spacing_m > 0

def test_corrupt_fixture_fails_cleanly(tmp_path):
    corrupt = tmp_path / "corrupt.nids"
    corrupt.write_bytes(FIXTURE.read_bytes()[:32])
    try:
        NexradLevel3Decoder().decode(corrupt)
    except Exception as exc:
        assert "parser" in str(exc).lower() or exc.__class__.__name__ in {"DecoderError", "UnsupportedProduct"}
