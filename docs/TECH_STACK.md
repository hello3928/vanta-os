# Vanta OS — recommended tech stack

Vanta OS is a console-style gaming OS for x86 PCs and handhelds (AMD/Intel desktops, mini-PCs, Steam Deck, ROG Ally, Legion Go). It boots straight into a controller-first interface, runs Steam and emulated games from one library, and treats the rest of Linux as an implementation detail.

## Stack at a glance

| Layer | Choice | Why |
|---|---|---|
| Base and updates | **Fedora Atomic built with `bootc`**, starting from Universal Blue base images | Image-based and read-only. Atomic A/B updates with one-step rollback, like a console. The OS image is a container built in CI. Bazzite proves this approach on the same hardware. |
| Kernel | Latest stable with gaming patches (Bazzite/CachyOS-style), **ntsync**, **sched_ext + `scx_lavd`** | ntsync speeds up Windows sync calls under Proton. `scx_lavd` is a low-latency scheduler designed for the Steam Deck. |
| Graphics | Latest **Mesa (RADV)** and Vulkan. NVIDIA as a separate image variant with the open kernel modules | Best performance on AMD handhelds. Proton depends on Vulkan. |
| Session compositor | **gamescope** | Valve's micro-compositor: fullscreen, VRR, HDR, FSR upscaling, frame limiter, low latency. |
| Games | **Steam + Proton**, **umu-launcher** for non-Steam games, **Heroic** for Epic/GOG | The largest Windows game library on Linux. |
| Console UI | **Qt 6 / QML** (Qt Quick, GPU scene graph) running as a gamescope client. App logic in **Rust via cxx-qt** | Proven for smooth, animated fullscreen UIs. Rust shares code with the system daemon. Steam Big Picture stays available as a fallback session. |
| System daemon | **`vantad`** (Rust) with a **D-Bus** API | Owns settings, per-game profiles, updates, power and network. Keeps privileged work out of the UI. |
| Input | **InputPlumber** (handheld buttons, gyro, back paddles) and **SDL3** in the UI | One input path across many devices. |
| Haptics | **SDL3** rumble and trigger rumble, DualSense/DualShock features. InputPlumber passes force feedback through on handhelds | Haptics in games and a light tick in menus, with Off/Low/High strength. DualSense audio-driven haptics over USB are a stretch goal. |
| UI sounds | Designed **WAV** assets played with **Qt Multimedia `SoundEffect`** (preloaded, low latency) over PipeWire | Short, dry, quiet sounds (clicks and soft thocks), separate from game volume. The mockup synthesizes stand-ins and can load real files from `assets/sounds/<name>.wav`. |
| Built-in emulation | **RetroArch + libretro cores** for retro systems. Standalone **DuckStation, PCSX2, PPSSPP, Dolphin, Cemu, RPCS3, melonDS, Azahar** for heavier ones. All shipped as Flatpaks | ROMs from `~/Games/roms/<system>` appear in the same library as Steam games, with art and metadata from SteamGridDB/IGDB. Controller mapping, save states and per-system presets are set up ahead of time. Users supply their own BIOS and game files; Vanta OS never ships any. |
| Power and performance | **PowerStation** (TDP and GPU clocks over D-Bus), amd-pstate EPP, **GameMode**, **MangoHud** | Per-game TDP, frame limit and performance overlay, like the Deck's quick access menu. |
| Audio, Bluetooth, network | **PipeWire + WirePlumber**, **BlueZ**, **NetworkManager** | All controllable over D-Bus from the UI. |
| Desktop mode | **KDE Plasma**, optional ("Switch to desktop") | Same pattern as SteamOS. |
| Installer | **bootc-image-builder** (or Titanoboa) makes a live/installer ISO | Built straight from the same OS image. |
| CI and delivery | **GitHub Actions** builds the image, pushes to **GHCR**, signs with **cosign** | Devices update by pulling the newest signed image. |

## Gaming tweaks

- `vm.max_map_count=2147483642` (what SteamOS uses; some games need it)
- `split_lock_detect=off`
- zram swap, transparent huge pages set to `madvise`, `preempt=full`
- Steam shader pre-caching on
- gamescope VRR and HDR on by default where the display supports them
- CPU security mitigations stay on

## Interface direction

The interface follows the Steam Big Picture / Steam Deck model:

- A hero banner for the selected game, with shelves of portrait capsules below it
- A game page with a play bar, the per-game performance profile, compatibility and details
- A main menu on the left (Guide/View button)
- A quick access menu on the right (Start button) with notifications, quick settings and performance

The look is deliberately plain: neutral blue-black surfaces, one UI typeface (Inter), Phosphor icons inlined as SVG, SteamOS corner radii (2–6 px), hairline dividers between list rows, and a white focus outline. Text is short and literal. The game art carries the screen. Art comes from Steam's library assets and, for emulated games, SteamGridDB/libretro-thumbnails.

Motion follows a few strict rules, so it stays smooth on handheld hardware:
- Only transform and opacity animate (no width, height or filters on large areas).
- Nothing overshoots. Entrances use 200–320 ms ease-out; exits are faster (140 ms ease-in).
- Focus on art lifts slightly with a white ring drawn inside the art; rows turn light slate; buttons invert.
- Screens crossfade. The Home trailer expands by widening a clip on a full-height hero, so the video never moves or restarts.

In QML these map to `NumberAnimation` with `Easing.OutCubic` on transform and opacity.

The mockup in `mockup/` is the reference for the QML build. Its components map 1:1 to QML components (see [COMPONENTS.md](COMPONENTS.md)), and `mockup/styles/tokens.css` becomes the `Theme.qml` singleton.

## Roadmap

1. **M0:** OS image builds in CI and boots straight into gamescope + Steam
2. **M1:** Vanta home, library and game page in Qt/QML, with sounds and haptics
3. **M2:** `vantad`, quick access menu (TDP, frame limit, overlay) and per-game profiles
4. **M3:** Built-in emulation library (ROM scanning, art, emulator presets)
5. **M4:** Installer ISO and over-the-air updates with rollback
