from flask import Flask, request, Response
import requests

app = Flask(__name__)

API_BASE = "https://api.hcdp.ikewai.org/raster"

@app.route("/api/raster")
def raster_proxy():
    params = request.args

    r = requests.get(API_BASE, params=params, headers={
        "Authorization": f"Bearer {hcdp_api_token}"
    })

    return Response(
        r.content,
        content_type="image/tiff"
    )