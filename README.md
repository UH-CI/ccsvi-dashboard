# CCSVI Dashboard

A web map of Hawaiʻi's climate change social vulnerability: census-based vulnerability indicators by block group and Hawaiian Home Lands, overlaid with hazard layers (flood, fire, storm surge, landslide and more), point layers (shelters, hospitals, fire stations and more) and climate rasters.

## Layout

- `src/`: the web app (React, Vite, Zustand, react-leaflet).
- `backend/app/`: the API (FastAPI, with TiTiler for raster tiles).
- `backend/db/`: database setup (PostGIS) and the generated metric views.
- `backend/pipeline/`: turns raw census tables and hazard, point and raster files into cleaned data and map files.
- `backend/ingest/`: loads the pipeline's output into the database.
- `backend/scripts/`: rebuild, deploy and server setup scripts.
- `.github/workflows/`: builds and deploys the web app.

## Running the web app locally

1. `npm install`
2. `npm run dev`

There is no local backend. The dev server forwards API requests (`/api`) and map files (`/data`) to the beta server (see `server.proxy` in `vite.config.ts`).

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

## Settings

None of these files are in the repo; get them from the team.

- `.env.development` and `.env.production`: `VITE_API_BASE_URL`, `VITE_DATA_BASE_URL`.
- `.env`: `HCDP_API_TOKEN`, `HCDP_EMAIL`, `CARTO_API_KEY`, read by `vite.config.ts` for the dev server's HCDP and basemap forwarding.
