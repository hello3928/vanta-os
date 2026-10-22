#!/bin/bash
# Checks a built Vanta OS image: debranding, session wiring, and the shell running inside it.
# Usage: verify-image.sh [tag] [screenshot path]
IMG=${1:-localhost/vanta-os:dev}
SHOT=${2:-/mnt/c/Users/Thomas/Documents/VantaOS/image-shell.png}
podman run --rm --entrypoint /bin/bash -v "$(dirname "$SHOT")":/shots:z "$IMG" -c '
echo "=== os-release"; cat /etc/os-release
echo "=== image-info"; cat /usr/share/ublue-os/image-info.json
echo "=== hostname"; cat /etc/hostname 2>/dev/null || echo "(none, DEFAULT_HOSTNAME applies)"
echo "=== menu apps still saying Bazzite (visible)"
for f in /usr/share/applications/*.desktop; do
  grep -q "^NoDisplay=true" "$f" && continue
  grep -l -i -E "^(Name|GenericName|Comment)(\[.*\])?=.*bazzite" "$f"
done
echo "=== autostart mentioning bazzite"; grep -li bazzite /etc/xdg/autostart/*.desktop /etc/skel/.config/autostart/*.desktop 2>/dev/null
echo "=== wallpapers"; ls /usr/share/wallpapers | grep -i -E "bazzite|vanta|convergence|ublue"
grep -h -o "/usr/share/wallpapers/[^\"]*" /usr/share/plasma/look-and-feel/com.valve.*/contents/plasmoidsetupscripts/org.kde.plasma.folder.js
echo "=== splash logo is Orbit"; zcat /usr/share/plasma/look-and-feel/com.valve.vapor.desktop/contents/splash/images/bazzite_logo.svgz | grep -c "Vanta OS"
echo "=== logo icon is Orbit"; grep -c "Vanta OS" /usr/share/icons/hicolor/scalable/places/vanta-logo.svg /usr/share/icons/hicolor/scalable/places/bazzite-logo.svg
echo "=== session"; cat /usr/share/wayland-sessions/gamescope-session-ogui-steam.desktop; ls -la /usr/libexec/vanta-session /usr/share/gamescope-session-plus/sessions.d/ogui-steam
grep -h Session /usr/lib/sddm/sddm.conf.d/holo.conf
echo "=== shell"; ls -la /usr/bin/vanta-shell; du -sh /usr/share/vanta; ldd /usr/bin/vanta-shell | grep -c "not found"
echo "=== shell: run tools/wsl/run-in-image.sh for a screenshot (software renderer; containers have no GPU)"
'
