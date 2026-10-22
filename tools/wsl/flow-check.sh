#!/bin/bash
# Finishes setup from the last step with an empty config, then prints what was saved.
rm -rf /tmp/vanta-flow && mkdir -p /tmp/vanta-flow
cd /mnt/c/Users/Thomas/Documents/VantaOS
VANTA_CONFIG=/tmp/vanta-flow VANTA_STEP=7 VANTA_KEYS="accept wait:3500 accept" VANTA_SHOT_DELAY=7000 \
  bash tools/wsl/shot-shell.sh "$1" setup | grep -v "^-rw"
echo "--- settings.json"; cat /tmp/vanta-flow/settings.json
echo "--- profiles.json"; cat /tmp/vanta-flow/profiles.json
