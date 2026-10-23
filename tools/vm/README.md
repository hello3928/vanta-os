# Test VM

Boots a Vanta OS image in QEMU on Windows, accelerated with WHPX (Windows Hypervisor Platform).
WSL can't run KVM on this PC: Hyper-V doesn't pass AMD-V through to it on Windows 11 Home.

## Make a disk

In WSL, after `tools/wsl/build-image.sh`:

```
tools/wsl/make-disk.sh
```

bootc-image-builder turns `localhost/vanta-os:dev` into a qcow2 with the test account from
`config.toml` and copies it to `C:\Users\Thomas\VantaVM\vanta-os.qcow2`.

## Boot it

Needs QEMU for Windows (`winget install SoftwareFreedomConservancy.QEMU`) and the Windows
Hypervisor Platform feature.

```
.\run-vm.ps1
```

Opens a window with virgl (OpenGL from the host GPU). `-Plain` uses plain virtio-vga,
`-Headless` no window. There's no USB controller by default: with one, the guest hangs about 3 s
into the kernel boot under WHPX. Keyboard and mouse work over PS/2.

## Try changes without rebuilding

```
.\push.ps1
```

Builds the shell in WSL, packs it with `image/files` and the boot splash
(`tools/wsl/pack-vm.sh`), and lays them over the running VM's `/usr` and `/etc` through a
temporary writable `/usr`, then restarts the shell. About two minutes. It lasts until the VM
restarts. Session scripts take effect after `python vmctl.py root "systemctl restart display-manager"`.
The boot splash lives in the initramfs, so it needs an image rebuild; `tools/wsl/splash-preview.sh`
plays its frames in a browser instead.

## Look inside

- `python vmctl.py run "command"` logs in on the serial console and runs a command;
  `python vmctl.py root "command"` runs it as root. The login takes about 20 s.
- `.\window-shot.ps1 out.png` saves what the window shows. QMP's `screendump`
  (`python vmctl.py shot`) only works with `-Plain` or `-Headless`; it can't read the virgl display.
- `serial.log` next to the disk has everything the serial console printed.

## What the VM can't test

Game mode. gamescope needs a Vulkan GPU, and virgl on Windows only offers OpenGL, so Mesa falls back
to llvmpipe, which gamescope rejects. After five quick failures gamescope-session-plus switches to
desktop mode. Game mode needs real hardware (or a passed-through GPU, which Windows 11 Home can't
do). The shell itself does run in the VM's desktop session with GPU OpenGL:

```
python vmctl.py run "(WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1000 setsid vanta-shell >/tmp/shell.log 2>&1 &)"
```
