"""Shared by the vector and raster builds: running GIS commands, file sizes and the run report."""

import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

import settings

# min lon, min lat, max lon, max lat
HAWAII = (-161, 18, -154, 23)
# Correction files for coordinate conversions, kept in the repo; https://cdn.proj.org has every one
PROJ_GRIDS_DIR = Path(__file__).resolve().parents[2] / "config" / "proj"


def run(cmd):
    return subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, text=True, check=True).stdout


# Copies the repo's correction files into the first folder the conversion software looks in
def install_proj_grids():
    folder = Path(run(["projinfo", "--searchpaths"]).splitlines()[0])
    folder.mkdir(parents=True, exist_ok=True)
    for grid in PROJ_GRIDS_DIR.glob("*.tif"):
        shutil.copy2(grid, folder / grid.name)


# The correction files a source's coordinates need, to become longitude/latitude in Hawaii, that can't be
# found, each with where to get it
def missing_proj_grids(source):
    wkt = run(["gdalsrsinfo", "-o", "wkt2", source]).strip()
    box = ",".join(map(str, HAWAII))
    found = run(["projinfo", "-s", wkt, "-t", "EPSG:4326", "--bbox", box, "--spatial-test", "intersects", "-o", "PROJ"])
    grids = sorted(set(re.findall(r"Grid (\S+) needed but not found", found)))
    return [f"{grid} (add https://cdn.proj.org/{grid} to config/proj)" for grid in grids]


# Total size, in KB under 1 MB
def file_size(*paths):
    size = sum(path.stat().st_size for path in paths)
    return f"{size / 1e6:.1f} MB" if size >= 1e6 else f"{size / 1e3:.0f} KB"


# Writes reports/<name>_<date>_<time>.txt: every row's notes, then a table with one row per layer.
# columns is a list of (heading, row key); the first column names the layer in the notes
def write_report(title, name, columns, rows):
    first = columns[0][1]
    notes = [f"  {row[first]}: {note}" for row in rows for note in row["notes"]]
    table = [[heading for heading, _ in columns]]
    table += [[row.get(key, "-") for _, key in columns] for row in rows]
    widths = [max(len(line[i]) for line in table) for i in range(len(columns))]
    lines = [
        title,
        "",
        "---------- Notes ----------",
        *(notes or ["  none"]),
        "---------------------------",
        "",
        *("  ".join(cell.ljust(width) for cell, width in zip(line, widths)).rstrip() for line in table),
    ]
    settings.REPORT_DIR.mkdir(exist_ok=True)
    path = settings.REPORT_DIR / f"{name}_{datetime.now():%Y-%m-%d_%H%M%S}.txt"
    path.write_text("\n".join(lines) + "\n")
    print(f"Report: {path}")
