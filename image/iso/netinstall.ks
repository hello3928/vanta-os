# Vanta OS network installer (tools/wsl/make-netinstall.sh): Fedora's network installer with these
# settings. It installs ghcr.io/hello3928/vanta-os:stable over the network, so the installer itself
# is small enough to load into memory at start (rd.live.ram=1); after that the USB drive isn't read
# again. It asks for the disk, the account and, on Wi-Fi, the network.

graphical
ostreecontainer --url=ghcr.io/hello3928/vanta-os:stable --transport=registry --no-signature-verification
reboot --eject
