# Vanta OS

A console-style operating system for gaming PCs and handhelds. It starts into a full-screen
interface made for controllers, with Steam games and emulated games in one library. Steam runs
in the background for downloads, cloud saves and launching games.

Vanta OS is built on Bazzite's handheld image (Fedora Atomic), so it gets Bazzite's drivers,
kernel and gaming fixes, and updates as a whole image.

**Status:** early. The image builds and installs, and it boots into the Vanta interface in a
virtual machine. Game mode on real hardware (gamescope, running games) hasn't been tested yet.

## Repository

| Folder | Contents |
|---|---|
| [shell/](shell/) | The interface: Qt 6 / QML with Rust. Home, library, game pages, settings, first-time setup, profiles, Steam sign-in |
| [image/](image/) | The OS image: Containerfile, session files, branding, boot splash, installer settings |
| [brand/](brand/) | The Orbit logo as SVG |
| [tools/](tools/) | Build and test scripts: `wsl/` for building on Windows through WSL, `vm/` for the QEMU test machine |
| [.github/workflows/](.github/workflows/) | Builds and publishes the image |

## Install

Download the installer ISO, write it to a USB drive of 16 GB or more with Fedora Media Writer
(or Rufus in DD mode), and start the PC from it. The installer asks for the disk to install to
and for a user account, then restarts into Vanta OS. Installing erases the chosen disk.

A PC already running Bazzite can switch to Vanta OS instead:

```
sudo bootc switch ghcr.io/hello3928/vanta-os:stable
```

Updates come from `ghcr.io/hello3928/vanta-os:stable`. The device downloads a new image in the
background and uses it after the next restart. Settings shows the state under System updates, and
the previous version stays available to roll back to.

## Build

The shell (Fedora 44 with Rust and Qt 6 development packages):

```
cd shell
QMAKE=qmake6 cargo build --release
```

The image, from the repository root:

```
podman build -f image/Containerfile -t vanta-os .
```

The installer ISO, after building the image, in WSL (bootc-image-builder needs root):

```
sudo bash tools/wsl/make-iso.sh localhost/vanta-os
```

The workflow in `.github/workflows/build-image.yml` builds the image on every change to `shell/`,
`image/` or `brand/`, and weekly for Bazzite's updates. It publishes `:stable` and a dated tag and
signs them with cosign.

## Test machine

`tools/vm/` runs the image in QEMU on Windows with Windows Hypervisor Platform, and can push a new
shell into the running machine without rebuilding the image. See [tools/vm/README.md](tools/vm/README.md).
Game mode needs a Vulkan GPU, which the virtual machine doesn't have, so there the shell runs on
its own without gamescope.

## Credits

- [Bazzite](https://github.com/ublue-os/bazzite) and [Universal Blue](https://universal-blue.org),
  the base image (Apache 2.0)
- [Figtree](https://github.com/erikdkennedy/figtree), the typeface (SIL Open Font License)
- [Phosphor Icons](https://phosphoricons.com) (MIT)
- [gamescope](https://github.com/ValveSoftware/gamescope) and Steam, from Valve

Vanta OS isn't affiliated with Valve or the Bazzite project.
