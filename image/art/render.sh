#!/usr/bin/bash
# Renders the Vanta logo and wallpaper into the paths where Bazzite keeps its own, so every
# place that showed Bazzite's logo shows Orbit instead. Runs in the image's build stage.
# Usage: render.sh <brand dir> <art dir> <output root>
set -euo pipefail
BRAND=$1
ART=$2
OUT=$3

icons=$OUT/usr/share/icons/hicolor
mkdir -p "$icons/scalable/places" "$icons/scalable/apps"

# The logo named in os-release (LOGO=vanta-logo), and Bazzite's logo names, which desktop mode's
# menus, launcher button (distributor-logo-steamdeck) and About page ask for.
for name in vanta-logo bazzite-logo bazzite-logo-le distributor-logo distributor-logo-steamdeck; do
	cp "$BRAND/vanta-orbit-app-icon.svg" "$icons/scalable/places/$name.svg"
done
for name in vanta-logo-white bazzite-logo-white distributor-logo-white; do
	cp "$BRAND/vanta-orbit-white.svg" "$icons/scalable/places/$name.svg"
done
for size in 16 22 24 32 36 48 96 256; do
	mkdir -p "$icons/${size}x${size}/places"
	for name in vanta-logo-icon bazzite-logo-icon; do
		rsvg-convert -w "$size" -h "$size" "$BRAND/vanta-orbit-app-icon.svg" -o "$icons/${size}x${size}/places/$name.png"
	done
done

# Bazzite's logo and wordmark in Fedora's logo files (its own fedora-logos package): installer,
# login screens and the boot splash read these.
pix=$OUT/usr/share/pixmaps
mkdir -p "$pix"
rsvg-convert -w 128 -h 128 "$BRAND/vanta-orbit-app-icon.svg" -o "$pix/fedora-logo-sprite.png"
cp "$BRAND/vanta-orbit-app-icon.svg" "$pix/fedora-logo-sprite.svg"
rsvg-convert -w 164 -h 164 "$BRAND/vanta-orbit-app-icon.svg" -o "$pix/fedora-logo.png"
rsvg-convert -w 48 -h 48 "$BRAND/vanta-orbit-app-icon.svg" -o "$pix/fedora-logo-small.png"
rsvg-convert -w 252 -h 252 "$BRAND/vanta-orbit-white.svg" -o "$pix/system-logo-white.png"

# Boot splash: Vanta's own Plymouth theme (the Orbit draw-in, then turning rings). debrand.sh
# makes it the default and rebuilds the initramfs, where Plymouth reads it from. Bazzite's bgrt
# and spinner themes stay installed but unused; the spinner's watermark is Orbit too in case
# anything falls back to them.
theme=$OUT/usr/share/plymouth/themes/vanta
mkdir -p "$theme" "$theme/svg"
python3 "$ART/plymouth/frames.py" "$theme/svg"
for f in "$theme"/svg/*.svg; do
	name=$(basename "${f%.svg}")
	rsvg-convert -w 192 -h 192 "$f" -o "$theme/s-$name.png"
	rsvg-convert -w 384 -h 384 "$f" -o "$theme/l-$name.png"
done
rm -r "$theme/svg"
cp "$ART/plymouth/vanta.plymouth" "$ART/plymouth/vanta.script" "$theme/"
splash=$OUT/usr/share/plymouth/themes/spinner
mkdir -p "$splash"
rsvg-convert -w 48 -h 48 "$BRAND/vanta-orbit-white.svg" -o "$splash/watermark.png"

# Desktop mode's login splash (Valve's two Plasma themes).
for theme in com.valve.vapor.desktop com.valve.vgui.desktop; do
	dir=$OUT/usr/share/plasma/look-and-feel/$theme/contents/splash/images
	mkdir -p "$dir"
	gzip -9 -n -c "$BRAND/vanta-orbit-white.svg" > "$dir/bazzite_logo.svgz"
done

# Wallpaper: a KDE wallpaper package, plus Bazzite's wallpaper files replaced with it.
pkg=$OUT/usr/share/wallpapers/Vanta
mkdir -p "$pkg/contents/images"
rsvg-convert -w 3840 -h 2160 "$ART/wallpaper.svg" -o "$pkg/contents/images/3840x2160.png"
cat > "$pkg/metadata.json" <<'EOF'
{
    "KPlugin": {
        "Authors": [{ "Name": "Vanta OS" }],
        "Id": "Vanta",
        "License": "MIT",
        "Name": "Vanta"
    }
}
EOF
for f in bazzite-blue.png bazzite-glass.png convergence.png ublue.png; do
	cp "$pkg/contents/images/3840x2160.png" "$OUT/usr/share/wallpapers/$f"
done
