from flask import Flask, request, Response, jsonify
import requests
import os

app = Flask(__name__)

API_BASE = "https://api.hcdp.ikewai.org"

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