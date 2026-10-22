#!/bin/bash
# Renders a set of pages and overlays to a folder: shots.sh out_dir name:page[:overlay] ...
OUT=$1; shift
mkdir -p "$OUT"
for spec in "$@"; do
  IFS=: read -r name page overlay <<< "$spec"
  echo "== $name"
  bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/shot-shell.sh "$OUT/$name.png" "$page" "$overlay" | grep -v "^-rw\|Failed to seek"
done
