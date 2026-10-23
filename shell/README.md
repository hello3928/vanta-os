# Vanta shell

The console UI: Qt 6 / QML with Rust (cxx-qt 0.10). Every page, panel and control is a port of
`mockup/`, with the same names (`VTile.js` → `VTile.qml`).

## Layout

| Folder | What's in it |
|---|---|
| `src/` | Rust: `sys.rs` (files, commands, /proc), `gamepad.rs` (controllers and rumble through gilrs), `library.rs` (Steam's files and ROM folders) |
| `qml/core/` | Singletons: `App` (router, overlays, power), `Nav` (spatial focus), `Settings`, `Profiles`, `I18n`, `Region`, `Games`, `System` (device and system settings), `Sound`, `Haptics`, `Music` (game music), `Notifications`, `Theme` |
| `qml/components/` | The mockup's components: `VButton`, `VTile`, `VRow`, `VTabs`, `VListItem`, `VToggle`, `VSlider`, `VDropdown`, `VTextField`, `VPanel`, `VDialog`, `VTopBar`, `VHintBar`, `Glyph`, `Logo`, ... |
| `qml/screens/` | Home, Library, Game, Settings, Users ("Who's playing?"), Setup |
| `qml/overlays/` | Main menu, Quick access, dropdown menu, keyboard, launch, welcome, tour, screenshot viewer, profile editor, photo picker and crop, sign-in, game properties |
| `data/` | Icons, Figtree, UI sounds, translations, the sample library |

Assets come from the mockup so the two can't drift:

| Asset | Made by |
|---|---|
| `data/icons` | `node tools/export-icons.mjs` |
| `data/i18n` | `node tools/export-i18n.mjs` (shell-only strings in `tools/i18n-shell.json`) |
| `data/sample-library.json` | `node tools/export-sample-library.mjs` |
| `data/sounds` | `tools/render-sounds.js` in the mockup page, saved by `tools/sound-sink.mjs` |

## Build (WSL, Fedora 44)

```
wsl -d FedoraLinux-44 -- bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/build-shell.sh
```

Build output goes to `~/vanta-target/shell` inside WSL. Needs Qt 6 (base, declarative, svg,
multimedia), libudev (`systemd-devel`) and Rust.

## Screenshots without a display

```
wsl -d FedoraLinux-44 -- bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/shot-shell.sh /tmp/home.png home
```

Renders offscreen at 1280×800 through OpenGL (Mesa llvmpipe), starting from a copy of
`tools/wsl/dev-config` (setup done, one profile). `tools/wsl/shots.sh` renders several at once.

## Environment

| Variable | Use |
|---|---|
| `VANTA_SESSION=1` | Set by the Vanta session. Without it, commands that change the machine (power, Wi-Fi, time zone, language, updates) are printed instead of run. What's shown is always real either way: Wi-Fi networks, the Steam library and account, storage, updates. |
| `VANTA_SAMPLE=1` | Show the mockup's sample library, networks and simulated sign-ins instead of this machine's. Set by the screenshot tools (`tools/wsl/shot-shell.sh`; `VANTA_SAMPLE=0` there shows the real machine). |
| `VANTA_KIOSK=1` | Set by `vanta-kiosk` (no gamescope): Steam isn't started. |
| `VANTA_DATA` | Folder with `icons/`, `fonts/`, `sounds/`, `i18n/`. Default `/usr/share/vanta`. |
| `VANTA_CONFIG` | Settings and profiles. Default `~/.config/vanta`. |
| `VANTA_ROMS` | An extra ROM folder (besides `~/Games/roms` and `~/Emulation/roms`). |
| `VANTA_ACCOUNT_URL` | Vanta account service. Not running yet, so the Vanta account option is hidden. |
| `VANTA_SCREENSHOT` | Save one frame to this path and quit (`VANTA_SHOT_DELAY` ms, default 5000). |
| `VANTA_PAGE`, `VANTA_GAME`, `VANTA_STEP`, `VANTA_OVERLAY` | Open on a page (`home`, `library`, `game`, `settings`, `users`, `setup`), game, setup step or overlay. |
| `VANTA_KEYS` | Console actions to play, for testing: `"down down accept wait:800 back"`. |
| `VANTA_PAD` | Show a controller's prompts: `xbox`, `ps`, `nintendo`, `deck`. |

Pass `--window` to run in a window instead of fullscreen.

## Steam

Sign-in is Steam's own QR flow through its Web API (`qml/core/Steam.qml`): Vanta shows the QR
code, the Steam Mobile App approves it, and the refresh token is kept in
`~/.config/vanta/steam/<steamid>.json` (mode 600). Vanta lists every owned game with
`IPlayerService/GetOwnedGames`, merged with what's installed (`src/library.rs`). The Steam client
signs in separately, in its own window, before the first download.

## Notes

- QML is compiled into the binary. Rebuild after editing any `.qml` file.
- Qt's software renderer skips shader effects (shadows, blur, masks). Use the GL path.
- Figtree is a variable font whose default is Light; `VText` sets the weight axis directly.
- Positioners lay out lazily. `Nav.settle()` forces it before choosing focus by position.
- Property names starting with `on` are read as signal handlers. A horizontal ListView sets its
  delegates' `y`. `GradientStop` and `ShapePath` children can't use `parent`.
- Trailers: FFmpeg's Vulkan video decoding is skipped (`QT_FFMPEG_DECODING_HW_DEVICE_TYPES=vaapi`),
  so AV1 falls back to software where VA-API can't decode it.
