#!/bin/bash
# Lists the logo icons in an image (the names desktop mode, the boot splash and About pages ask
# for), which package owns each, and copies them to a folder to look at.
# Usage: audit-logos.sh [image] [out dir]
IMG=${1:-localhost/vanta-os:dev}
OUT=${2:-/mnt/c/Users/Thomas/Documents/VantaOS/build/logo-audit}
rm -rf "$OUT"; mkdir -p "$OUT"
podman run --rm --entrypoint /bin/bash -v "$OUT":/out "$IMG" -c '
find /usr/share/icons /usr/share/pixmaps /usr/share/plymouth /usr/share/sddm /usr/share/plasma \
	\( -iname "distributor-logo*" -o -iname "fedora-logo*" -o -iname "start-here.*" -o -iname "system-logo*" \
	   -o -iname "*bazzite*" -o -iname "*ublue*" -o -iname "watermark*" -o -iname "*steamdeck*" \) \
	\( -type f -o -type l \) 2>/dev/null | sort | while read -r f; do
	owner=$(rpm -qf --qf "%{NAME}" "$f" 2>/dev/null || echo "-")
	[[ $owner == *"not owned"* ]] && owner="(added by image build)"
	printf "%s  %s  %s\n" "$(readlink -f "$f" | sha256sum | cut -c1-8)" "$owner" "$f"
	cp -L "$f" "/out/$(echo "${f#/usr/share/}" | tr / _)" 2>/dev/null
done
'
echo "copied to $OUT"
