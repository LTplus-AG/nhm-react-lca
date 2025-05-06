#!/usr/bin/env python3
"""
totals.py – quick-and-dirty helper to sum the environmental indicators
in the export you pasted into ChatGPT.

USAGE
    python plugin-lca\scripts\kafkatotals.py kafkLLCAexport.json

The script prints

1. the grand total for each indicator across all rows
2. an optional breakdown by material (mat_kbob)

Requires only the Python 3 standard library.
"""

import json
import sys
from collections import defaultdict
from pathlib import Path


METRICS = (
    "gwp_relative", "gwp_absolute",
    "penr_relative", "penr_absolute",
    "ubp_relative", "ubp_absolute",
)


def main(json_path: Path) -> None:
    # 1 – load the file --------------------------------------------------------
    with json_path.open(encoding="utf-8") as f:
        payload = json.load(f)

    rows = payload.get("data", [])
    if not rows:
        sys.exit("No rows found under 'data' – nothing to do.")

    # 2 – grand totals --------------------------------------------------------
    grand = defaultdict(float)
    for row in rows:
        for m in METRICS:
            grand[m] += row.get(m, 0.0)

    print("=== GRAND TOTALS ===")
    for m in METRICS:
        print(f"{m:15}: {grand[m]:,.6f}")

    # 3 – per-material breakdown (optional) -----------------------------------
    per_material = defaultdict(lambda: defaultdict(float))
    for row in rows:
        mat = row.get("mat_kbob", "UNKNOWN")
        for m in METRICS:
            per_material[mat][m] += row.get(m, 0.0)

    print("\n=== BREAKDOWN BY MATERIAL (mat_kbob) ===")
    for mat, metrics in per_material.items():
        print(f"\n{mat}")
        for m in METRICS:
            print(f"  {m:13}: {metrics[m]:,.6f}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python totals.py <path_to_json>")
    main(Path(sys.argv[1]))
