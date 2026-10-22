#!/bin/bash
# Prints how the Bazzite deck image starts its gaming session.
IMG=${1:-ghcr.io/ublue-os/bazzite-deck:stable}
podman run --rm --entrypoint /bin/bash "$IMG" -c '
for f in /usr/share/wayland-sessions/gamescope-session-steam.desktop /usr/share/gamescope-session-plus/sessions.d/steam /usr/lib/sddm/sddm.conf.d/holo.conf /usr/libexec/bazzite-autologin /usr/lib/systemd/system/bazzite-autologin.service /usr/bin/steamos-session-select; do echo "=================== $f"; cat "$f"; done
echo "=================== gamescope-session-plus (head)"; sed -n 1,200p /usr/share/gamescope-session-plus/gamescope-session-plus
echo "=================== os-release users"; grep -rl -E "os-release|image-info.json" /usr/libexec /usr/bin /usr/share/ublue-os/just 2>/dev/null | head -40
echo "=================== ID checks"; grep -rhn -E "ID(_LIKE)?\" *== *\"?bazzite|ID=bazzite|\\$ID|VARIANT_ID" /usr/libexec /usr/bin /usr/share/ublue-os/just 2>/dev/null | head -30
echo "=================== tuned/ppd"; rpm -qa | grep -i -E "tuned|power-profiles"; ls /usr/share/dbus-1/system-services | grep -i -E "power|tuned"
'
