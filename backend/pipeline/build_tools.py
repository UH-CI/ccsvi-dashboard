"""Shared by the vector and raster builds: running GIS commands, file sizes and the run report."""

import subprocess
from datetime import datetime

import settings


def run(cmd):
    return subprocess.run([str(c) for c in cmd], stdout=subprocess.PIPE, text=True, check=True).stdout


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
