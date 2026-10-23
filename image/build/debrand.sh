#!/usr/bin/bash
# Replaces Bazzite's name and logo everywhere a user can see them: boot menu, os-release (desktop
# mode's About page, hostnamectl, fastfetch), hostname, desktop mode's apps, autostart pop-ups,
# docs, terminal banners and wallpapers. The logo files themselves are replaced by
# image/art/render.sh in the build stage.
# Internal names stay: ID and VARIANT_ID in os-release, script, unit and package names. Bazzite's
# own services read them, and they're never shown.
set -euo pipefail

# Not VERSION: os-release, sourced below, defines its own.
VANTA_VER=${VANTA_VERSION:-0.1.0}
IMAGE_REF=${VANTA_IMAGE_REF:-ghcr.io/hello3928/vanta-os}

# ---- os-release ----
# shellcheck disable=SC1091
. /usr/lib/os-release
cat > /usr/lib/os-release <<EOF
NAME="Vanta OS"
VERSION="${VANTA_VER}"
ID=${ID}
ID_LIKE="${ID_LIKE}"
VERSION_ID=${VERSION_ID}
PRETTY_NAME="Vanta OS"
ANSI_COLOR="0;38;2;26;159;255"
LOGO=vanta-logo
CPE_NAME="cpe:/o:vanta:vanta-os:${VANTA_VER}"
DEFAULT_HOSTNAME="vanta"
HOME_URL="https://github.com/hello3928/vanta-os"
DOCUMENTATION_URL="https://github.com/hello3928/vanta-os"
SUPPORT_URL="https://github.com/hello3928/vanta-os/issues"
BUG_REPORT_URL="https://github.com/hello3928/vanta-os/issues"
SUPPORT_END=${SUPPORT_END}
VARIANT="Vanta OS"
VARIANT_ID=${VARIANT_ID}
OSTREE_VERSION='${VANTA_VER}'
IMAGE_VERSION=${VANTA_VER}
BUILD_ID="${VANTA_VER}"
BOOTLOADER_NAME="Vanta OS ${VANTA_VER}"
IMAGE_ID="vanta-os-${VANTA_VER}"
EOF

# fedora-release (also /etc/system-release): bootupd names the firmware boot entry from it, which is
# what a PC's or the Steam Deck's boot menu shows. "release <n>" stays for tools that read the
# Fedora version from it.
echo "Vanta OS release ${VERSION_ID}" > /usr/lib/fedora-release

# ---- image info (read by Bazzite's update and session scripts) ----
info=/usr/share/ublue-os/image-info.json
# image-name and image-vendor stay: Bazzite's scripts check image-name for "deck" (autologin into
# game mode, hardware setup, return-to-gamemode) and treat any other name as a desktop image.
# Unverified until the image carries a signing policy for its own key (CI signs with keyless cosign).
jq --arg ver "$VANTA_VER" --arg ref "ostree-unverified-registry:${IMAGE_REF}" \
	'.["image-ref"] = $ref | .["version"] = $ver | .["version-pretty"] = ("Vanta OS " + $ver)' \
	"$info" > "$info.new"
mv "$info.new" "$info"

# ---- hostname ----
if [[ -f /etc/hostname ]] && grep -qi bazzite /etc/hostname; then
	echo vanta > /etc/hostname
fi

# ---- desktop mode: pop-ups, apps and docs ----
rm -f /etc/xdg/autostart/bazzite-announcement.desktop \
	/etc/skel/.config/autostart/bazzite-portal.desktop \
	/usr/share/applications/bazzite-documentation.desktop \
	/usr/share/applications/discourse.desktop
rm -rf /usr/share/ublue-os/docs /usr/share/ublue-os/announcements
# Bazzite's updater and portal stay installed (other scripts call them) but leave the menus.
for app in io.github.rfrench3.bazzite-updater.desktop io.github.ublue_os.yafti_gtk.desktop; do
	f=/usr/share/applications/$app
	[[ -f $f ]] && sed -i '0,/^\[Desktop Entry\]/s//[Desktop Entry]\nNoDisplay=true/' "$f"
done

# Discover lists installed apps from their metainfo, menu entry or not.
rm -f /usr/share/metainfo/io.github.rfrench3.bazzite-updater.metainfo.xml \
	/usr/share/metainfo/io.github.ublue_os.yafti_gtk.metainfo.xml

# Password prompts show the action's vendor and messages. Action IDs (org.bazzite.*) stay.
for f in /usr/share/polkit-1/actions/org.bazzite.*.policy; do
	[[ -f $f ]] || continue
	sed -i -E 's#<vendor_url>[^<]*</vendor_url>#<vendor_url>https://github.com/hello3928/vanta-os</vendor_url>#; s/Bazzite/Vanta OS/g' "$f"
done

# ---- terminal: fetch logo and tips ----
rm -f /etc/profile.d/bazzite-neofetch.sh /usr/share/fish/vendor_conf.d/bazzite-neofetch.fish
rm -f /usr/share/ublue-os/motd/tips/*bazzite* /usr/share/ublue-os/motd/tips/*/*bazzite*

# ---- wallpapers ----
# Valve's desktop themes start on Bazzite's wallpaper; point them at Vanta's.
for theme in com.valve.vapor.desktop com.valve.vgui.desktop; do
	js=/usr/share/plasma/look-and-feel/$theme/contents/plasmoidsetupscripts/org.kde.plasma.folder.js
	[[ -f $js ]] && sed -i -E "s#(file://)?/usr/share/wallpapers/[^\"']*convergence[^\"']*#/usr/share/wallpapers/Vanta/contents/images/3840x2160.png#g" "$js"
done
rm -rf /usr/share/wallpapers/bazzite
rm -f /usr/share/wallpapers/convergence.jxl /usr/share/wallpapers/giants.jxl

# ---- session files copied from image/files ----
chmod 755 /usr/libexec/vanta-session /usr/libexec/vanta-kiosk /usr/libexec/vanta-boot-message /usr/libexec/vanta-factory-reset /usr/libexec/vanta-boot-menu /usr/share/gamescope-session-plus/sessions.d/ogui-steam

# Bazzite's hardware setup puts its own line under the splash part way through; keep Vanta's.
sed -i 's/plymouth display-message --text="Preparing System - Please wait, this may take a while"/plymouth display-message --text="Running first boot hardware setup"/' /usr/libexec/bazzite-hardware-setup

# ---- factory reset (Settings > System > Reset system) ----
systemctl enable vanta-factory-reset-apply.service

# ---- no GRUB menu (vanta-boot-menu) ----
systemctl enable vanta-boot-menu.service

# ---- boot splash ----
# Vanta's Plymouth theme (image/art/plymouth) instead of the firmware logo and Fedora's spinner.
sed -i 's/^Theme=.*/Theme=vanta/' /usr/share/plymouth/plymouthd.defaults
plymouth-set-default-theme vanta

# ---- initramfs ----
# Bazzite's initramfs carries its os-release (the hostname set at boot, which systemd keeps after
# switching root) and its boot splash watermark. Rebuilt the way Bazzite builds it.
kver=$(ls /usr/lib/modules)
dracut --no-hostonly --kver "$kver" --reproducible --zstd --add ostree -f "/usr/lib/modules/$kver/initramfs.img"
