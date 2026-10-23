# Vanta OS image

A bootc image built on Bazzite's deck image (`ghcr.io/ublue-os/bazzite-deck:stable`), with:

- **The Vanta shell as game mode.** steamos-manager always starts the `ogui-steam` gamescope
  session, so `files/usr/share/gamescope-session-plus/sessions.d/ogui-steam` is replaced: Steam's
  session settings stay (VRR, HDR, frame limiter, mangoapp), and the client is
  `/usr/libexec/vanta-session`, which starts Steam in the background (`steam -silent`) and runs
  the shell on screen. Logging in, "Return to Gaming Mode" and the session switcher all land here.
  The shell is restarted if it ever closes; after five failures in a minute, desktop mode opens.
- **The shell alone when gamescope can't run** (`files/usr/libexec/vanta-kiosk`): with no Vulkan
  GPU, or after gamescope fails five times, the shell runs full screen in cage, a kiosk
  compositor. Bazzite's own recovery (wipe Steam back to its bootstrap, switch to desktop mode)
  is replaced.
- **Boot splash** (`art/plymouth/`): a Plymouth script theme on black. The Orbit logo draws in as
  on the welcome screen, then its rings turn until the system has started. Boot messages are off
  (`files/usr/lib/bootc/kargs.d/10-vanta-splash.toml`).
- **Bazzite's name and logo replaced** (`build/debrand.sh`, `art/render.sh`): os-release (boot
  menu, About, hostnamectl, fastfetch), hostname, image info, logo icons (including desktop mode's
  launcher button), Fedora's logo files that Bazzite fills with its own, the boot splash
  watermark, desktop mode's login splash, wallpapers, the Portal and announcement pop-ups, docs,
  terminal banners (the login banner is Vanta's own, `files/usr/share/ublue-os/motd`). The initramfs is rebuilt so the hostname and boot splash come from Vanta's
  files. Internal names (`ID`, `VARIANT_ID`, `image-name`, script, unit and package names) stay,
  because Bazzite's services read them and they're never shown. `image-name` in particular must
  keep "deck": Bazzite's autologin and hardware setup treat any other name as a desktop image.
- **The shell built against the image's own Qt**, in a build stage, installed to
  `/usr/bin/vanta-shell` with its data in `/usr/share/vanta`.

## Build

```
podman build -f image/Containerfile -t vanta-os .
```

From the repo root. In WSL: `tools/wsl/build-image.sh`, then `tools/wsl/verify-image.sh`.
CI (`.github/workflows/build-image.yml`) builds on pushes to `image/`, `shell/` and `brand/`,
weekly, and by hand; pushes `ghcr.io/hello3928/vanta-os:stable` and `:<version>`; and signs with
keyless cosign.

## Install

On a machine running Bazzite (or any Fedora Atomic / bootc system):

```
sudo bootc switch ghcr.io/hello3928/vanta-os:stable
```

The package is private while the repo is; the machine needs a GHCR login
(`/etc/ostree/auth.json`) until it's public.

## Test VM

`tools/vm/` boots the image in QEMU on Windows. It covers boot, debranding, autologin and the
shell in desktop mode, but not game mode itself (gamescope needs Vulkan, which the VM's GPU
doesn't have). See `tools/vm/README.md`.

## Not done yet

- Game mode on real hardware: gamescope, the shell as the session client and Steam in the
  background are untested outside containers and the VM.

- Signed updates: the image doesn't yet carry a policy that checks Vanta's signature, so updates
  come from the unverified registry. Needs a cosign key pair and a policy file.
- Steam's own startup videos (`/usr/share/ublue-os/bazzite/*.webm`) still have Bazzite's logo.
  Vanta's session never shows them; Steam Big Picture in desktop mode could.
- `ujust` recipes and polkit prompts in desktop mode still say Bazzite in places.
- An installer ISO.
