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
echo "=== launcher and About logos are Orbit"; grep -c "Vanta OS" /usr/share/icons/hicolor/scalable/places/distributor-logo*.svg
echo "=== image-name still says deck (Bazzite autologin and hardware setup check it)"; jq -r ".[\"image-name\"]" /usr/share/ublue-os/image-info.json
echo "=== initramfs: os-release"
kver=$(ls /usr/lib/modules); img=/usr/lib/modules/$kver/initramfs.img
lsinitrd -f usr/lib/initrd-release "$img" | grep -E "^(NAME|PRETTY_NAME|DEFAULT_HOSTNAME)="
lsinitrd -f etc/hostname "$img" 2>/dev/null
echo "=== boot splash"; grep -h "^Theme" /usr/share/plymouth/plymouthd.defaults /etc/plymouth/plymouthd.conf; ls /usr/share/plymouth/themes/vanta | wc -l; ls /usr/lib64/plymouth/script.so
lsinitrd "$img" | grep -c "plymouth/themes/vanta/"; cat /usr/lib/bootc/kargs.d/*.toml
echo "=== KDE About page"; cat /etc/xdg/kcm-about-distrorc; grep -c Bazzite /usr/share/polkit-1/actions/org.bazzite.*.policy
echo "=== terminal banner"; head -1 /usr/share/ublue-os/motd/template.md
echo "=== session"; ls -la /usr/libexec/vanta-kiosk; command -v cage vulkaninfo; cat /usr/share/wayland-sessions/gamescope-session-ogui-steam.desktop; ls -la /usr/libexec/vanta-session /usr/share/gamescope-session-plus/sessions.d/ogui-steam
grep -h Session /usr/lib/sddm/sddm.conf.d/holo.conf
echo "=== shell"; ls -la /usr/bin/vanta-shell; du -sh /usr/share/vanta; ldd /usr/bin/vanta-shell | grep -c "not found"
echo "=== shell: run tools/wsl/run-in-image.sh for a screenshot (software renderer; containers have no GPU)"
'
