# CCSVI Dashboard

A web map of Hawaiʻi's climate change social vulnerability: census-based vulnerability indicators by block group and Hawaiian Home Lands, overlaid with hazard layers (flood, fire, storm surge, landslide and more), point layers (shelters, hospitals, fire stations and more) and climate rasters.

## Layout

- `src/`: the web app (React, Vite, react-leaflet, Zustand for the app's own state, and TanStack Query for loading data from the server).
- `backend/app/`: the API (FastAPI, with TiTiler for raster tiles).
- `backend/db/`: database setup (PostGIS) and the generated metric views.
- `backend/pipeline/`: turns raw census tables and hazard, point and raster files into cleaned data and map files.
- `backend/ingest/`: loads the pipeline's output into the database.
- `ops/`: scripts that run on the VM: server setup, the database rebuild (`rebuild.sh`) and the deploy (`deploy.sh`).
- `.github/workflows/`: builds and deploys the web app.

## Running the web app locally

1. `npm install`
2. `npm run dev`

There is no local backend. The dev server forwards API and tile requests (`/api`) and map files (`/data`) to the test VM, which adds the HCDP and basemap keys, so no keys are needed locally. The address is `DATA_SERVER` at the top of `vite.config.ts`; change it to the beta's to use the beta instead.

Other scripts: `npm run build`, `npm run lint`, `npm run preview`.

## Settings

`.env.example` lists every setting with placeholders. Copy what you need into the files below and get the real values from the team; the real files are never committed.

- `.env.development` and `.env.production`: `VITE_API_BASE_URL`, `VITE_DATA_BASE_URL`.
- On the VM, `.env` in the repo root: the database settings, the HCDP key the API uses, and the basemap key nginx adds.
