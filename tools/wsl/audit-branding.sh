#!/bin/bash
# Lists where an image shows Bazzite's name or logo. Usage: audit-branding.sh [image]
IMG=${1:-ghcr.io/ublue-os/bazzite-deck:stable}
podman run --rm --entrypoint /bin/bash "$IMG" -c '
echo "=== os-release"; cat /usr/lib/os-release
echo "=== image-info"; cat /usr/share/ublue-os/image-info.json 2>/dev/null
echo "=== files named *bazzite*"; find / -xdev \( -path /proc -o -path /sys -o -path /var/cache \) -prune -o -iname "*bazzite*" -print 2>/dev/null | head -200
echo "=== text files mentioning bazzite (by folder)"; grep -rIli bazzite /etc /usr/share /usr/lib /usr/libexec /usr/bin 2>/dev/null | sed "s|/[^/]*$||" | sort | uniq -c | sort -rn | head -80
echo "=== plymouth"; ls /usr/share/plymouth/themes; grep -h Theme /etc/plymouth/plymouthd.conf /usr/share/plymouth/plymouthd.defaults 2>/dev/null
echo "=== sessions"; ls /usr/share/wayland-sessions /usr/share/xsessions 2>/dev/null
echo "=== sddm"; ls /etc/sddm.conf.d /usr/lib/sddm/sddm.conf.d 2>/dev/null; cat /etc/sddm.conf.d/* 2>/dev/null | head -40
echo "=== gamescope-session"; ls /usr/share/gamescope-session-plus /usr/share/gamescope-session-plus/sessions.d 2>/dev/null; ls /usr/bin | grep -i -E "gamescope|steamos|session" 
echo "=== qt"; rpm -q qt6-qtbase qt6-qtdeclarative qt6-qtmultimedia qt6-qtsvg 2>&1
echo "=== tools"; for t in nmcli timedatectl localectl wpctl powerprofilesctl rpm-ostree bootc bluetoothctl flatpak steam steamos-session-select busctl; do printf "%s: " $t; command -v $t || echo missing; done
echo "=== powerstation/inputplumber"; rpm -qa | grep -i -E "powerstation|inputplumber|gamescope|mangohud" 
'
