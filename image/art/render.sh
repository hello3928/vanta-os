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
# menus and About page still ask for.
for name in vanta-logo bazzite-logo bazzite-logo-le; do
	cp "$BRAND/vanta-orbit-app-icon.svg" "$icons/scalable/places/$name.svg"
done
cp "$BRAND/vanta-orbit-white.svg" "$icons/scalable/places/vanta-logo-white.svg"
cp "$BRAND/vanta-orbit-white.svg" "$icons/scalable/places/bazzite-logo-white.svg"
for size in 16 22 24 32 36 48 96 256; do
	mkdir -p "$icons/${size}x${size}"
	rsvg-convert -w "$size" -h "$size" "$BRAND/vanta-orbit-app-icon.svg" -o "$icons/${size}x${size}/bazzite-logo-icon.png"
	cp "$icons/${size}x${size}/bazzite-logo-icon.png" "$icons/${size}x${size}/vanta-logo-icon.png"
done

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
