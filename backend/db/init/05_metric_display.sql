-- Adds display info to each metric. The table
-- endpoint reads these to order its columns and decide which ones to show.
--
-- Apply with backend/scripts/db-schema.sh, then re-run ingest/load_cleaned_census.py.

ALTER TABLE metrics ADD COLUMN IF NOT EXISTS display_order  INTEGER;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS has_moe        BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS has_percentage BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS has_moe_pp     BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_metrics_dataset_display_order
    ON metrics (dataset_id, display_order);