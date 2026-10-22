#!/bin/bash
# Renders one frame of the shell offscreen. Usage: shot-shell.sh [out.png]
# Extra environment (QSG_INFO=1, QT_QUICK_BACKEND=software, ...) passes through.
set -e
OUT=${1:-/tmp/vanta-shot.png}
cd /mnt/c/Users/Thomas/Documents/VantaOS/shell
export QT_QPA_PLATFORM=${QT_QPA_PLATFORM:-offscreen}
# GPU path (Mesa llvmpipe here). The default software renderer skips shader effects.
export QT_QUICK_BACKEND=${QT_QUICK_BACKEND:-rhi}
export QSG_RHI_BACKEND=${QSG_RHI_BACKEND:-opengl}
# Fedora hides console.log by default.
export QT_LOGGING_RULES=${QT_LOGGING_RULES:-qml.debug=true}
export VANTA_DATA=$PWD/data
export VANTA_SCREENSHOT=$OUT
timeout 30 $HOME/vanta-target/shell/debug/vanta-shell 2>&1
echo "exit $?"
ls -la "$OUT"
