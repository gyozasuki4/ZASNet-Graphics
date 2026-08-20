# ZASNet WX Broadcast Graphics backend

Step 2 adds a MetPy-backed NEXRAD Level III decoder behind `app.radar.decoder.RadarDecoder`. The supported scope is base reflectivity products, including product 94 (Base Reflectivity Data Array). The backend stores original binary products and native dBZ gate values plus explicit state codes; it does not render or colorize radar. Future weather datasets should add parallel modules and APIs rather than coupling them to radar.

## Run

From the backend directory, set `RADAR_DATA_ROOT`, `DATABASE_PATH`, and `LOG_FILE` if `/opt` is not writable, then run:

```bash
/opt/zasnet-broadcast/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8080
```

API base: `http://127.0.0.1:8080/api/v1`; health: `curl http://127.0.0.1:8080/api/v1/health`.

Upload: `curl -X POST -F 'file=@sample-level3-file' http://127.0.0.1:8080/api/v1/radar/ingest`.

Run tests with `/opt/zasnet-broadcast/venv/bin/pytest` from `backend/`. The intended production paths are `/opt/zasnet-broadcast/data/radar/{incoming,archive,rejected,decoded}`, SQLite `/opt/zasnet-broadcast/data/backend.db`, and rotating logs `/opt/zasnet-broadcast/logs/backend.log`.

After ingest, decoded products expose metadata and a compact zlib-compressed binary payload:

```bash
curl http://127.0.0.1:8080/api/v1/radar/files/<FILE_ID>/metadata
curl -o product.l3z http://127.0.0.1:8080/api/v1/radar/files/<FILE_ID>/data
curl http://127.0.0.1:8080/api/v1/radar/TLX/94/latest
```

The `.l3z` format has a `ZASNETL3` header, JSON geometry descriptors, and little-endian float32 dBZ values plus one-byte state codes (`valid`, `no_data`, `below_threshold`, `range_folded`), all zlib-compressed. SQLite stores metadata only. The public Unidata MetPy fixture used for validation is `KOUN_SDUS54_N0QTLX_201305202016` (TLX, product 94, 2013-05-20 20:16:43 UTC).

## Live Level III acquisition

Step 4 adds `scripts/live_radar_worker.py` and `systemd/zasnet-radar-live.service`. The worker polls the public NWS RPCCDS HTTPS directory for product 94/N0Q (`https://tgftp.nws.noaa.gov/data/radar/nexrad_level3/DS.p94r0/SI.kriw/`), downloads only recent candidates, and passes every file through the normal SHA-256 ingest and MetPy decode path. NOAA data are public; retain attribution and do not imply endorsement.

Live acquisition is intentionally disabled by default. Configure `config/backend.env` with `LIVE_RADAR_ENABLED=true`, `LIVE_RADAR_SITE=KRIW`, `LIVE_RADAR_PRODUCT=94`, and `LIVE_RADAR_SOURCE_PRODUCT=N0Q`, then enable the worker service. Status and chronological frame metadata are available at:

```bash
curl http://127.0.0.1:8080/api/v1/radar/KRIW/94/status
curl 'http://127.0.0.1:8080/api/v1/radar/KRIW/94/frames?minutes=30'
```

The directory scanner is `scripts/ingest_radar_directory.py`. It uses the same ingest service as the API. The systemd unit is in `systemd/zasnet-broadcast.service`; install it as root after copying the project to `/opt` and creating the `zasbroadcast` account.

Current limitations: one NWS source/site/product is implemented, polling is used instead of a push feed, and acquisition requires explicit configuration. No warnings, additional products, or public exposure are included.
