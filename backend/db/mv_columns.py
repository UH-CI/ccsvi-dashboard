"""The wide metric view columns the Data Analyzer filters on: one per census menu indicator, switched
on or off, and one per point layer's count

Each entry is (view column, dataset id, metric name)
"""

import hashlib
import re

from ingest.load_postgis import POINT_LAYERS
from pipeline.check_layers import census_categories, census_datasets, repeats

# Postgres cuts names longer than this
MAX_NAME = 63


# Lowercase, with every run of characters other than a-z and 0-9 as one _
def name_part(text):
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


# "<dataset>__<metric>", with d_ in front of a leading digit; a name too long for Postgres keeps
# its first 56 characters and a short fingerprint of the whole name, so it stays unique
def column_name(dataset, metric):
    name = f"{name_part(dataset)}__{name_part(metric)}"
    if name[0].isdigit():
        name = f"d_{name}"
    if len(name) > MAX_NAME:
        name = f"{name[:56]}_{hashlib.sha1(name.encode()).hexdigest()[:6]}"
    return name


def view_columns(homelands):
    homelands_of = census_datasets()
    pairs = [
        (indicator["dataset"], indicator["metric"])
        for category in census_categories()
        for indicator in category["indicators"]
        if homelands_of[indicator["dataset"]] == homelands
    ]
    suffix = "_homelands" if homelands else ""
    pairs += [(f"{layer_id}_points{suffix}", "Count") for _, layer_id, _ in POINT_LAYERS]
    columns = [(column_name(dataset, metric), dataset, metric) for dataset, metric in pairs]
    if repeated := repeats([column for column, _, _ in columns]):
        raise SystemExit(f"Filter column name used twice: {', '.join(repeated)}")
    return columns


BLOCK_GROUP_COLUMNS = view_columns(False)
HAWAIIAN_HOMELAND_COLUMNS = view_columns(True)