#!/bin/bash
IMG=${1:-ghcr.io/ublue-os/bazzite-deck:stable}
podman run --rm --entrypoint /bin/bash "$IMG" -c '
for f in /usr/libexec/os-session-select /usr/bin/return-to-gamemode; do echo "=================== $f"; cat "$f"; done
echo "=================== os-release keys read by scripts"
grep -hno -E "(VARIANT_ID|IMAGE_ID|BUILD_ID|PRETTY_NAME|BOOTLOADER_NAME|DEFAULT_HOSTNAME|VERSION_ID|\bID\b)[^a-zA-Z_]" /usr/libexec/bazzite-* /usr/bin/bazzite-* /usr/libexec/os-* /usr/share/ublue-os/just/*.just 2>/dev/null | sort | uniq -c | sort -rn | head -30
grep -n -E "VARIANT_ID|IMAGE_ID|os-release" /usr/libexec/bazzite-hardware-setup /usr/libexec/bazzite-user-setup /usr/libexec/bazzite-flatpak-manager /usr/bin/bazzite-steam 2>/dev/null | head -30
echo "=================== wallpapers"; ls -la /usr/share/wallpapers /usr/share/wallpapers/bazzite /usr/share/wallpapers/bazzite/contents 2>/dev/null; cat /usr/share/wallpapers/bazzite/metadata.json 2>/dev/null
echo "=================== plasma defaults mentioning wallpaper"; grep -rl -i -E "bazzite-(blue|glass)|wallpapers/bazzite" /usr/share /etc 2>/dev/null | head
echo "=================== splash"; ls /usr/share/plasma/look-and-feel/com.valve.vapor.desktop/contents/splash/; grep -rn bazzite /usr/share/plasma/look-and-feel/com.valve.*/contents/splash/*.qml 2>/dev/null | head
echo "=================== app entries mentioning bazzite"; grep -li bazzite /usr/share/applications/*.desktop
echo "=================== boot video users"; grep -rln "bazzite.webm\|bazzite-oled.webm" /usr/bin /usr/libexec /usr/share/gamescope-session-plus 2>/dev/null
'
