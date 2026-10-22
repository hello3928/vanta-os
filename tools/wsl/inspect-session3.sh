#!/bin/bash
IMG=${1:-ghcr.io/ublue-os/bazzite-deck:stable}
podman run --rm --entrypoint /bin/bash "$IMG" -c '
echo "== steamos-manager files"; rpm -ql steamos-manager-powerstation 2>/dev/null | grep -v -E "\.so|/doc/|licenses" | head -30
echo "== session names in steamos-manager config"; grep -rn -i -E "gamescope-session|session" /usr/share/steamos-manager /etc/steamos-manager 2>/dev/null | head -20
echo "== binary strings"; strings $(command -v steamos-manager 2>/dev/null || echo /usr/lib/steamos-manager) 2>/dev/null | grep -E "gamescope-.*\.desktop|zz-.*autologin|sddm.conf" | sort -u | head -20
echo "== convergence refs"; grep -rl "convergence" /usr/share/plasma /etc/xdg /usr/share/kservices* /usr/bin/bazzite-desktop-bootstrap 2>/dev/null | head
echo "== steam.desktop"; grep -n -i bazzite /usr/share/applications/steam.desktop
echo "== steam-tweaks"; grep -n -i -B2 -A4 "webm" /usr/bin/steam-tweaks | head -40
'
