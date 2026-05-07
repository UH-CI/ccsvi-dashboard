import os

token = import.meta.env.HCDP_API_TOKEN
email = import.meta.env.HCDP_EMAIL

HCDP_API_TOKEN = os.getenv("HCDP_API_TOKEN")
HCDP_EMAIL = os.getenv("HCDP_EMAIL")

HEADERS = {
    "Authorization": f"Bearer {HCDP_API_TOKEN}",
    "User-Agent": HCDP_EMAIL  # if required by API
}