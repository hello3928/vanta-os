#!/bin/bash
# Builds the shell in release mode in WSL and runs it once offscreen.
cd /mnt/c/Users/Thomas/Documents/VantaOS/shell
export CARGO_TARGET_DIR=$HOME/vanta-target/shell QMAKE=$(command -v qmake6)
cargo build --release 2>&1 | grep -E "^error|Finished"
rm -rf /tmp/vc && cp -r ../tools/wsl/dev-config /tmp/vc
VANTA_SAMPLE=1 VANTA_CONFIG=/tmp/vc VANTA_DATA=$PWD/data QT_QPA_PLATFORM=offscreen VANTA_PAGE=home VANTA_SCREENSHOT=/tmp/rel.png VANTA_SHOT_DELAY=3000 \
  timeout 40 $CARGO_TARGET_DIR/release/vanta-shell 2>&1 | grep -v -E "^qt.qpa|^\[|^  " | tail -5
echo "exit ${PIPESTATUS[0]}"; ls -la /tmp/rel.png
