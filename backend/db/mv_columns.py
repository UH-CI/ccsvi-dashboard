"""The wide metric view columns the Data Analyzer filters on: one per census menu indicator, switched
on or off, and one per point layer's count. Each column is named by its metric's key.
"""

from ingest.load_postgis import POINT_LAYERS
from ingest.writer import layer_metric_key
from pipeline.check_layers import census_datasets, census_indicators, repeats


def view_columns(homelands):
    homelands_of = census_datasets()
    keys = [indicator["key"] for indicator in census_indicators() if homelands_of[indicator["dataset"]] == homelands]
    keys += [layer_metric_key(layer_id, "Count", homelands) for _, layer_id, _ in POINT_LAYERS]
    if repeated := repeats(keys):
        raise SystemExit(f"Filter column name used twice: {', '.join(repeated)}")
    return keys


BLOCK_GROUP_COLUMNS = view_columns(False)
HAWAIIAN_HOMELAND_COLUMNS = view_columns(True)