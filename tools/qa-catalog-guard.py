"""Prove catalog shrink-guard fails closed on unexpected subset write."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

# Import by path
import importlib.util

spec = importlib.util.spec_from_file_location(
    "build_pres", ROOT / "tools" / "build-pokedex-presentation.py"
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

previous = {"assets": {str(i): {} for i in range(1, 152)}}
previous["assets"]["25:10199"] = {}
tiny = {"25": {}, "26": {}}  # destructive subset

try:
    mod.validate_catalog_or_abort(tiny, previous, only_mode=False, allow_shrink=False)
    print("FAIL: expected abort on shrink")
    raise SystemExit(1)
except SystemExit as e:
    if e.code == 2:
        print("OK full-rebuild shrink aborted")
    else:
        raise

try:
    mod.validate_catalog_or_abort(tiny, previous, only_mode=True, allow_shrink=False)
    print("FAIL: expected abort on --only subset without merge")
    raise SystemExit(1)
except SystemExit as e:
    if e.code == 2:
        print("OK --only subset aborted")
    else:
        raise

# Healthy full catalog at/above floor passes
healthy = {str(i): {} for i in range(1, 231)}
healthy["25:10199"] = {}
report = mod.validate_catalog_or_abort(healthy, {"assets": {str(i): {} for i in range(1, 231)}}, only_mode=False, allow_shrink=False)
print("OK full catalog retained", report["newCount"], "prev", report["previousCount"])
