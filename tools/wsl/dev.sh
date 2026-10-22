#!/bin/bash
# Build, then render one frame: dev.sh out.png [page] [overlay]. Prints only errors and QML output.
cd /mnt/c/Users/Thomas/Documents/VantaOS
bash tools/wsl/build-shell.sh 2>&1 | grep -E "^(error|warning: unused|warning\[)|^\s+-->|could not compile|Finished" | grep -v "vanta-shell@" | head -40
bash tools/wsl/shot-shell.sh "$@"
