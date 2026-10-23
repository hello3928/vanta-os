#!/bin/bash
# Packs what changes most often (the shell, its data, image/files and the boot splash) into
# build/push/vanta-push.tgz for tools/vm/push.ps1, laid out as it is in the image.
# Builds the shell first (release, against WSL's Qt, which is the same Fedora and Qt as the image).
set -e
ROOT=/mnt/c/Users/Thomas/Documents/VantaOS
OUT=$ROOT/build/push
STAGE=/tmp/vanta-push
rm -rf "$STAGE" && mkdir -p "$STAGE/usr/bin" "$STAGE/usr/share/vanta" "$OUT"

cd "$ROOT/shell"
export CARGO_TARGET_DIR=$HOME/vanta-target/shell QMAKE=$(command -v qmake6)
cargo build --release 2>&1 | grep -E "^error|^warning: unused|-->|Finished" | grep -v "vanta-shell@" || true
install -m755 "$CARGO_TARGET_DIR/release/vanta-shell" "$STAGE/usr/bin/vanta-shell"
cp -r data/. "$STAGE/usr/share/vanta/"
install -Dm644 data/fonts/Figtree.ttf "$STAGE/usr/share/fonts/vanta/Figtree.ttf"

cp -r "$ROOT/image/files/." "$STAGE/"
chmod 755 "$STAGE/usr/libexec/"vanta-* "$STAGE/usr/share/gamescope-session-plus/sessions.d/ogui-steam"
bash "$ROOT/image/art/render.sh" "$ROOT/brand" "$ROOT/image/art" "$STAGE" >/dev/null

tar czf "$OUT/vanta-push.tgz" -C "$STAGE" .
ls -la "$OUT/vanta-push.tgz"
