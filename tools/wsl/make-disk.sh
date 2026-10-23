#!/bin/bash
# Turns the built image into a bootable qcow2 for test VMs, then copies it to Windows for QEMU.
# Usage: make-disk.sh [image] [windows folder]
set -e
IMG=${1:-localhost/vanta-os:dev}
WINDIR=${2:-/mnt/c/Users/Thomas/VantaVM}
OUT=/root/vanta-vm
mkdir -p "$OUT" "$WINDIR"
podman run --rm --privileged --pull=newer --security-opt label=type:unconfined_t \
  -v /mnt/c/Users/Thomas/Documents/VantaOS/tools/vm/config.toml:/config.toml:ro \
  -v "$OUT":/output \
  -v /var/lib/containers/storage:/var/lib/containers/storage \
  quay.io/centos-bootc/bootc-image-builder:latest \
  --type qcow2 --rootfs btrfs --use-librepo=True "$IMG" 2>&1 | grep -v -E "^\s*$|Downloading|^#" | tail -25
ls -la "$OUT"/qcow2/
qemu-img convert -p -O qcow2 "$OUT/qcow2/disk.qcow2" "$WINDIR/vanta-os.qcow2"
ls -la "$WINDIR"
