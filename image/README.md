# Vanta OS image

A bootc image built on Bazzite's deck image (`ghcr.io/ublue-os/bazzite-deck:stable`), with:

- **The Vanta shell as game mode.** steamos-manager always starts the `ogui-steam` gamescope
  session, so `files/usr/share/gamescope-session-plus/sessions.d/ogui-steam` is replaced: Steam's
  session settings stay (VRR, HDR, frame limiter, mangoapp), and the client is
  `/usr/libexec/vanta-session`, which starts Steam in the background (`steam -silent`) and runs
  the shell on screen. Logging in, "Return to Gaming Mode" and the session switcher all land here.
- **Bazzite's name and logo replaced** (`build/debrand.sh`, `art/render.sh`): os-release (boot
  menu, About, hostnamectl, fastfetch), hostname, image info, logo icons, desktop mode's login
  splash, wallpapers, the Portal and announcement pop-ups, docs, terminal banners. Internal names
  (`ID`, `VARIANT_ID`, script, unit and package names) stay, because Bazzite's services read them
  and they're never shown.
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

## Not done yet

- Signed updates: the image doesn't yet carry a policy that checks Vanta's signature, so updates
  come from the unverified registry. Needs a cosign key pair and a policy file.
- Steam's own startup videos (`/usr/share/ublue-os/bazzite/*.webm`) still have Bazzite's logo.
  Vanta's session never shows them; Steam Big Picture in desktop mode could.
- `ujust` recipes and polkit prompts in desktop mode still say Bazzite in places.
- An installer ISO.
