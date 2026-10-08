#!/usr/bin/env bash
set -euo pipefail
EMXX=${EMXX:-em++}
"$EMXX" stonkfly/neural/kernel.cpp -O3 -std=c++17 --no-entry \
  -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=worker,node \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=536870912 -sMAXIMUM_MEMORY=2147483648 \
  '-sEXPORTED_FUNCTIONS=["_memory_advance","_malloc","_free"]' \
  '-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]' \
  -o web/engine.mjs
