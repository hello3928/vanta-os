#!/bin/bash
# Runs the shell once inside the built image, offscreen, with Qt's messages on stderr.
# Usage: run-in-image.sh [tag] [page] [screenshot dir]
IMG=${1:-localhost/vanta-os:dev}
PAGE=${2:-setup}
OUTDIR=${3:-/mnt/c/Users/Thomas/Documents/VantaOS}
pkill -f "gdb -q -batch" 2>/dev/null
podman ps -q | xargs -r podman kill >/dev/null 2>&1
podman run --rm --entrypoint /bin/bash -v "$OUTDIR":/shots -e PAGE="$PAGE" "$IMG" -c '
mkdir -p /tmp/h
# No GPU in a container, so the software renderer: shadows and blur are skipped.
export HOME=/tmp/h XDG_RUNTIME_DIR=/tmp QT_QPA_PLATFORM=offscreen QT_QUICK_BACKEND=software LANG=C.UTF-8
export QT_FORCE_STDERR_LOGGING=1 QT_LOGGING_RULES="qml.debug=true" RUST_BACKTRACE=1
export VANTA_PAGE=$PAGE VANTA_SCREENSHOT=/shots/image-$PAGE.png VANTA_SHOT_DELAY=4000
timeout 40 /usr/bin/vanta-shell 2>&1 | grep -v -E "^qt.qpa|^\[|^  |^Input #" | tail -25
echo "status ${PIPESTATUS[0]}"
ls -la /shots/image-$PAGE.png 2>&1
'
