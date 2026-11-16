"""The wide metric view columns the Data Analyzer filters on: one per census menu indicator, switched
on or off, and one per point layer's count. Each column is named by its metric's key.
"""

from registry import census_datasets, census_indicators, layer_metric_key, point_layers, repeats


def view_columns(homelands):
    homelands_of = census_datasets()
    keys = [indicator["key"] for indicator in census_indicators() if homelands_of[indicator["dataset"]] == homelands]
    keys += [layer_metric_key(layer.id, "Count", homelands) for layer in point_layers()]
    if repeated := repeats(keys):
        raise SystemExit(f"Filter column name used twice: {', '.join(repeated)}")
    return keys


BLOCK_GROUP_COLUMNS = view_columns(False)
HAWAIIAN_HOMELAND_COLUMNS = view_columns(True)