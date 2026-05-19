from flask import Flask, request, Response, jsonify
import requests
import os
from pathlib import Path

app = Flask(__name__)

API_BASE = "https://api.hcdp.ikewai.org"


def _load_local_env() -> None:
    """Load `public/data/HCDP_API/.env` without exposing values to the frontend."""
    env_file = Path(__file__).resolve().parent / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_local_env()

HCDP_API_TOKEN = os.getenv("HCDP_API_TOKEN")
HCDP_EMAIL = os.getenv("HCDP_EMAIL")

HEADERS = {
    "Authorization": f"Bearer {HCDP_API_TOKEN}",
    "User-Agent": HCDP_EMAIL
}

# 🔹 Raster Proxy (GeoTIFF)
@app.route("/api/raster")
def raster_proxy():
    params = request.args

    r = requests.get(
        f"{API_BASE}/raster",
        params=params,
        headers=HEADERS
    )

    return Response(
        r.content,
        content_type="image/tiff"
    )

# 🔹 Date Range Proxy
@app.route("/api/date-range")
def date_range():
    params = request.args

    r = requests.get(
        f"{API_BASE}/datasets/date/range",
        params=params,
        headers=HEADERS
    )

    return jsonify(r.json())

# 🔹 Health check
@app.route("/")
def home():
    return {"status": "running"}

if __name__ == "__main__":
    app.run(debug=True)