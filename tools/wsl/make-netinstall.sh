#!/bin/bash
# Builds the Vanta OS network installer from Fedora's network install ISO and
# image/iso/netinstall.ks, with mkksiso (lorax). About 1 GB; it loads into memory when it starts
# and downloads the image from ghcr.io/hello3928/vanta-os:stable, which must be public.
#   make-netinstall.sh          vanta-os-netinstall.iso: asks for disk, account and network
#   make-netinstall.sh --test   vanta-os-netinstall-test.iso: installs onto the first disk without
#                               asking, with the test account from tools/vm/config.toml (VMs only)
set -e
ROOT=/mnt/c/Users/Thomas/Documents/VantaOS
WINDIR=/mnt/c/Users/Thomas/VantaVM
WORK=/root/vanta-net
BASE=https://download.fedoraproject.org/pub/fedora/linux/releases/44/Everything/x86_64/iso
SRC=Fedora-Everything-netinst-x86_64-44-1.7.iso
mkdir -p "$WORK" "$WINDIR"
cd "$WORK"
command -v mkksiso >/dev/null || dnf -y install lorax
if [ ! -f "$SRC" ]; then
	curl -sSL -o "$SRC" "$BASE/$SRC"
	curl -sSL -o CHECKSUM "$BASE/Fedora-Everything-44-1.7-x86_64-CHECKSUM"
	curl -sSL -o fedora.gpg https://fedoraproject.org/fedora.gpg
	gpgv --keyring ./fedora.gpg CHECKSUM
	sha256sum --ignore-missing -c CHECKSUM
fi

ks=$WORK/vanta.ks
cp "$ROOT/image/iso/netinstall.ks" "$ks"
# A short volume label: FAT32 keeps 11 characters, so the installer still finds itself when a tool
# copies the files instead of writing the image. mkksiso keeps only one -c.
cmdline="rd.live.ram=1"
out=vanta-os-netinstall.iso
if [[ ${1:-} == --test ]]; then
	cfg=$ROOT/tools/vm/config.toml
	user=$(sed -n 's/^name = "\(.*\)"/\1/p' "$cfg" | head -1)
	pass=$(sed -n 's/^password = "\(.*\)"/\1/p' "$cfg" | head -1)
	sed -i 's/^graphical$/text/' "$ks"
	# Commands go before the %post section.
	post=$(grep -n '^%post' "$ks" | cut -d: -f1)
	{
		head -n $((post - 1)) "$ks"
		cat <<EOF
lang en_US.UTF-8
keyboard us
timezone UTC
network --bootproto=dhcp
zerombr
clearpart --all --initlabel
autopart
rootpw --lock
user --name=$user --groups=wheel --password=$pass --plaintext

EOF
		tail -n +"$post" "$ks"
	} > "$ks.new" && mv "$ks.new" "$ks"
	cmdline="$cmdline console=tty0 console=ttyS0,115200"
	out=vanta-os-netinstall-test.iso
fi

rm -f "$out"
mkksiso --ks "$ks" -V VANTA-NET -c "$cmdline" "$SRC" "$out" 2>&1 | grep -v "^$" | tail -5
rm -f "$ks"
cp "$out" "$WINDIR/$out"
ls -la "$WINDIR/$out"
