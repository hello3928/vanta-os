#!/bin/bash
# Builds the Vanta OS installer ISO from the local image with bootc-image-builder.
# Usage: make-iso.sh [image] [windows folder]
# The image is tagged as ghcr.io/hello3928/vanta-os:stable first, so installed systems update from
# there (the package must be public for that). Settings: image/iso/config.toml.
set -e
IMG=${1:-localhost/vanta-os:dev}
WINDIR=${2:-/mnt/c/Users/Thomas/VantaVM}
REF=ghcr.io/hello3928/vanta-os:stable
OUT=/root/vanta-iso
mkdir -p "$OUT" "$WINDIR"
podman tag "$IMG" "$REF"
podman run --rm --privileged --pull=newer --security-opt label=type:unconfined_t \
  -v /mnt/c/Users/Thomas/Documents/VantaOS/image/iso/config.toml:/config.toml:ro \
  -v "$OUT":/output \
  -v /var/lib/containers/storage:/var/lib/containers/storage \
  quay.io/centos-bootc/bootc-image-builder:latest \
  --type anaconda-iso --rootfs btrfs --use-librepo=True "$REF" 2>&1 | grep -v -E "^\s*$|Downloading|^#" | tail -25
ls -la "$OUT"/bootiso/
cp "$OUT/bootiso/install.iso" "$WINDIR/vanta-os-installer.iso"
ls -la "$WINDIR/vanta-os-installer.iso"
