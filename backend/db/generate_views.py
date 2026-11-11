"""Generates db/init/03_metric_views.sql from the census menu and the point layers (db/mv_columns.py).

Usage (from the backend/ directory):
    python -m db.generate_views           write the file
    python -m db.generate_views --check   exit non-zero if the file is out of date
"""

import sys
from pathlib import Path

from db.mv_columns import BLOCK_GROUP_COLUMNS, HAWAIIAN_HOMELAND_COLUMNS

OUT_PATH = Path(__file__).parent / "init" / "03_metric_views.sql"

HEADER = """-- GENERATED FILE — do not edit.
-- Change config/census_menu.json or the point layers, then run: python -m db.generate_views
--
-- Both views are dropped and recreated on every apply
-- A rebuild applies this while the tables are still empty, so refresh afterwards:
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW block_group_metrics;"
--   docker exec ccsvi-pg psql -U ccsvi -d ccsvi -c "REFRESH MATERIALIZED VIEW hawaiian_homeland_metrics;"
"""

# One filtered aggregate per metric key, holding the number the map shows: the percentage when the
# metric has one, otherwise the count
def columns_sql(keys: list[str]) -> str:
    return ",\n".join(
        "    MAX(CASE WHEN m.has_percentage THEN mv.percentage ELSE mv.absolute END)\n"
        f"        FILTER (WHERE m.key = '{key}') AS {key}"
        for key in keys
    )


# One area type's view: a row per area of that type (geographies.type), with its filter columns.
# extra_ids are id columns only that type has; each gets an index.
def view_sql(view: str, index_prefix: str, area_type: str, extra_ids: list[str], keys: list[str]) -> str:
    ids = ["geoid", "name", *extra_ids, "population", "geom"]
    id_select = "".join(f"    g.{col},\n" for col in ids)
    group_by = ", ".join(f"g.{col}" for col in ids)
    indexes = "\n".join(
        [
            f"CREATE UNIQUE INDEX IF NOT EXISTS idx_{index_prefix}_geoid ON {view} (geoid);",
            f"CREATE INDEX IF NOT EXISTS idx_{index_prefix}_geom ON {view} USING GIST (geom);",
            f"CREATE INDEX IF NOT EXISTS idx_{index_prefix}_centroid ON {view} USING GIST (centroid);",
            *(f"CREATE INDEX IF NOT EXISTS idx_{index_prefix}_{col} ON {view} ({col});" for col in extra_ids),
        ]
    )
    return f"""

DROP MATERIALIZED VIEW IF EXISTS {view};
CREATE MATERIALIZED VIEW {view} AS
SELECT
{id_select}    ST_Centroid(g.geom) AS centroid,

{columns_sql(keys)}

FROM geographies g
LEFT JOIN metric_values mv ON mv.geoid = g.geoid
LEFT JOIN metrics m ON m.id = mv.metric_id
WHERE g.type = '{area_type}'
GROUP BY {group_by};

{indexes}
"""


def render() -> str:
    return (
        HEADER
        + view_sql("block_group_metrics", "bgm", "block_group", ["county"], BLOCK_GROUP_COLUMNS)
        + view_sql("hawaiian_homeland_metrics", "hhlm", "hawaiian_homeland", [], HAWAIIAN_HOMELAND_COLUMNS)
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