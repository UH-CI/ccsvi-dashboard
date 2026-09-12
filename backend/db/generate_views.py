"""Generates db/init/03_metric_views.sql from db/mv_columns.py.

Usage (from the backend/ directory):
    python -m db.generate_views           write the file
    python -m db.generate_views --check   exit non-zero if the file is out of date
"""

import sys
from pathlib import Path

from db.mv_columns import BLOCK_GROUP_COLUMNS, HAWAIIAN_HOMELAND_COLUMNS

OUT_PATH = Path(__file__).parent / "init" / "03_metric_views.sql"

HEADER = """-- GENERATED FILE — do not edit.
-- Change db/mv_columns.py, then run: python -m db.generate_views
--
-- Both views are dropped and recreated on every apply
-- A rebuild applies this while the tables are still empty, so refresh afterwards:
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"
"""

BLOCK_GROUP_SQL = """

DROP MATERIALIZED VIEW IF EXISTS block_group_metrics;
CREATE MATERIALIZED VIEW block_group_metrics AS
SELECT
    g.geoid,
    g.name,
    g.county,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

{columns}

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE EXISTS (
    SELECT 1
    FROM metric_values mv2
    JOIN metrics m2 ON m2.id = mv2.metric_id
    WHERE mv2.geoid = g.geoid
      AND m2.dataset_id != '2022_census_hawaiian_homelands'
)
GROUP BY g.geoid, g.name, g.county, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bgm_geoid    ON block_group_metrics (geoid);
CREATE INDEX        IF NOT EXISTS idx_bgm_geom     ON block_group_metrics USING GIST (geom);
CREATE INDEX        IF NOT EXISTS idx_bgm_centroid ON block_group_metrics USING GIST (centroid);
CREATE INDEX        IF NOT EXISTS idx_bgm_county   ON block_group_metrics (county);
"""

HAWAIIAN_HOMELAND_SQL = """

DROP MATERIALIZED VIEW IF EXISTS hawaiian_homeland_metrics;
CREATE MATERIALIZED VIEW hawaiian_homeland_metrics AS
SELECT
    g.geoid,
    g.name,
    g.population,
    g.geom,
    ST_Centroid(g.geom) AS centroid,

{columns}

FROM geographies g
JOIN metric_values mv ON mv.geoid = g.geoid
JOIN metrics m ON m.id = mv.metric_id AND m.dataset_id = '2022_census_hawaiian_homelands'
GROUP BY g.geoid, g.name, g.population, g.geom;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hhlm_geoid    ON hawaiian_homeland_metrics (geoid);
CREATE INDEX        IF NOT EXISTS idx_hhlm_geom     ON hawaiian_homeland_metrics USING GIST (geom);
CREATE INDEX        IF NOT EXISTS idx_hhlm_centroid ON hawaiian_homeland_metrics USING GIST (centroid);
"""


# One filtered aggregate per mapped column
def columns_sql(rows: list[tuple[str, str, str, str]]) -> str:
    lines = []
    for column, dataset_id, name, source in rows:
        escaped = name.replace("'", "''")
        lines.append(
            f"    MAX(mv.{source}) FILTER (WHERE m.dataset_id = '{dataset_id}'\n"
            f"        AND m.name = '{escaped}') AS {column}"
        )
    return ",\n".join(lines)


def render() -> str:
    return (
        HEADER
        + BLOCK_GROUP_SQL.format(columns=columns_sql(BLOCK_GROUP_COLUMNS))
        + HAWAIIAN_HOMELAND_SQL.format(columns=columns_sql(HAWAIIAN_HOMELAND_COLUMNS))
    )


def main() -> None:
    sql = render()
    if "--check" in sys.argv[1:]:
        if not OUT_PATH.exists() or OUT_PATH.read_text() != sql:
            print(f"{OUT_PATH.name} is out of date — run: python -m db.generate_views", file=sys.stderr)
            sys.exit(1)
        print(f"{OUT_PATH.name} is up to date.")
        return

    OUT_PATH.write_text(sql)
    print(
        f"Wrote {OUT_PATH.name} "
        f"({len(BLOCK_GROUP_COLUMNS)} block group + {len(HAWAIIAN_HOMELAND_COLUMNS)} homeland columns)."
    )


if __name__ == "__main__":
    main()