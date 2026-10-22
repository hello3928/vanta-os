# Vanta shell

The console UI: Qt 6 / QML with Rust (cxx-qt 0.10). Layouts follow `mockup/`.

## Build (WSL, Fedora 44)

```
wsl -d FedoraLinux-44 -- bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/build-shell.sh
```

Build output goes to `~/vanta-target/shell` inside WSL, not the Windows disk.

## Screenshot without a display

```
wsl -d FedoraLinux-44 -- bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/shot-shell.sh /tmp/home.png
```

Renders offscreen at 1280×800 through OpenGL (Mesa llvmpipe) and saves one frame after 4 s. QML `console.log` output is shown.

## Environment

| Variable | Use |
|---|---|
| `VANTA_DATA` | Folder with `icons/` and `fonts/`. Default `/usr/share/vanta`. |
| `VANTA_SCREENSHOT` | Save one frame to this path and quit. |

Pass `--window` to run in a window instead of fullscreen.

## Notes

- QML is compiled into the binary. Rebuild after editing any `.qml` file.
- Qt's software renderer skips shader effects (the logo shadow). Use the GL path for screenshots.
- Property names starting with `on` are read as signal handlers in QML.
