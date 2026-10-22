#!/bin/bash
# Builds the Vanta OS image locally: tools/wsl/build-image.sh [tag]
# The shell compiles inside the build (against the base image's Qt), so the first run takes a while.
set -e
cd /mnt/c/Users/Thomas/Documents/VantaOS
TAG=${1:-localhost/vanta-os:dev}
podman build --pull=never -f image/Containerfile -t "$TAG" . 2>&1 | tail -n ${LINES_OUT:-80}
podman images "$TAG"
