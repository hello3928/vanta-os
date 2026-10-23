#!/bin/bash
# Renders setup and Home with what this machine really has (VANTA_SAMPLE=0): the network step,
# Steam sign-in (a live QR code from Steam) and Home. Usage: real-shots.sh out_dir
OUT=${1:-/mnt/c/Users/Thomas/Documents/VantaOS/build/real}
mkdir -p "$OUT"
cd /mnt/c/Users/Thomas/Documents/VantaOS
shot() {
	local name=$1; shift
	rm -rf /tmp/vanta-real && mkdir -p /tmp/vanta-real
	echo "== $name"
	env VANTA_SAMPLE=0 VANTA_CONFIG=/tmp/vanta-real "$@" bash tools/wsl/shot-shell.sh "$OUT/$name.png" setup | grep -v "^-rw" | tail -8
}
shot network VANTA_STEP=1 VANTA_SHOT_DELAY=5000
shot steam VANTA_STEP=4 VANTA_KEYS="wait:800 accept" VANTA_SHOT_DELAY=8000
echo "== home"
rm -rf /tmp/vanta-real && cp -r tools/wsl/dev-config /tmp/vanta-real
VANTA_SAMPLE=0 VANTA_CONFIG=/tmp/vanta-real VANTA_SHOT_DELAY=5000 bash tools/wsl/shot-shell.sh "$OUT/home.png" home | grep -v "^-rw" | tail -8
ls "$OUT"
