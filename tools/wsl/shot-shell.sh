#!/bin/bash
# Renders one frame of the shell offscreen. Usage: shot-shell.sh out.png [page] [overlay]
# Starts from a copy of dev-config (setup done, one profile; VANTA_DEV_CONFIG=dev-config-ja for
# Japanese) unless VANTA_CONFIG is set.
# Extra environment (VANTA_GAME, VANTA_SHOT_DELAY, QSG_INFO=1, ...) passes through.
set -e
OUT=${1:-/tmp/vanta-shot.png}
cd /mnt/c/Users/Thomas/Documents/VantaOS/shell
if [ -z "$VANTA_CONFIG" ]; then
  rm -rf /tmp/vanta-config && cp -r ../tools/wsl/${VANTA_DEV_CONFIG:-dev-config} /tmp/vanta-config
  export VANTA_CONFIG=/tmp/vanta-config
fi
export VANTA_PAGE=${2:-$VANTA_PAGE}
export VANTA_OVERLAY=${3:-$VANTA_OVERLAY}
export QT_QPA_PLATFORM=${QT_QPA_PLATFORM:-offscreen}
# GPU path (Mesa llvmpipe here). The default software renderer skips shader effects.
export QT_QUICK_BACKEND=${QT_QUICK_BACKEND:-rhi}
export QSG_RHI_BACKEND=${QSG_RHI_BACKEND:-opengl}
# Fedora hides console.log by default.
export QT_LOGGING_RULES=${QT_LOGGING_RULES:-qml.debug=true}
export VANTA_DATA=$PWD/data
export VANTA_SCREENSHOT=$OUT
timeout 40 $HOME/vanta-target/shell/debug/vanta-shell 2>&1 | grep -v -E "^qt.qpa|propagateSizeHints|^\[(dash|hls|https|tls|mov|tcp|AVIO)|^  |^Input #|^Output #|VDPAU|dzn is not|pipewire|ffmpeg: Using" || true
ls -la "$OUT" 2>/dev/null || echo "no screenshot"
