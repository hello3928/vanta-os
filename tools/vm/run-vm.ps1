# Boots a Vanta OS test disk in QEMU on Windows, accelerated with WHPX (Windows Hypervisor
# Platform). WSL can't run KVM on this PC (Hyper-V doesn't pass AMD-V through to it).
#   .\run-vm.ps1                        window with virgl 3D (the host GPU through OpenGL)
#   .\run-vm.ps1 -Plain                 plain virtio-vga, no 3D
#   .\run-vm.ps1 -Headless              no window; screenshots through tools/vm/vmctl.py
# The serial console is on TCP 127.0.0.1:4555 (and logged to serial.log next to the disk), QEMU's
# control socket (QMP) on 4556, and the guest's SSH port on 127.0.0.1:2222.
param(
    [string]$Disk = "$env:USERPROFILE\VantaVM\vanta-os.qcow2",
    [int]$MemoryGB = 8,
    [int]$Cpus = 6,
    [string]$Cpu = "max",
    [string]$IrqChip = "off",
    [switch]$Usb,
    [switch]$Plain,
    [switch]$Headless
)

$qemu = "C:\Program Files\qemu"
$vmDir = Split-Path $Disk
$vars = Join-Path $vmDir "efivars.fd"
if (-not (Test-Path $vars)) { Copy-Item "$qemu\share\edk2-i386-vars.fd" $vars }

$display = if ($Headless) { @("-display", "none", "-device", "virtio-vga") }
           elseif ($Plain) { @("-display", "sdl", "-device", "virtio-vga") }
           else { @("-display", "sdl,gl=on", "-device", "virtio-vga-gl") }

$usbDevices = if ($Usb) { @("-device", "qemu-xhci", "-device", "usb-tablet", "-device", "usb-kbd") } else { @() }

$qemuArgs = @(
    "-name", "Vanta OS",
    "-accel", "whpx,kernel-irqchip=$IrqChip",
    "-machine", "q35",
    "-cpu", "$Cpu",
    "-smp", "$Cpus",
    "-m", "$($MemoryGB)G",
    "-drive", "if=pflash,format=raw,readonly=on,file=$qemu\share\edk2-x86_64-code.fd",
    "-drive", "if=pflash,format=raw,file=$vars",
    "-drive", "file=$Disk,if=virtio,format=qcow2,cache=writeback,discard=unmap",
    "-nic", "user,model=virtio-net-pci,hostfwd=tcp:127.0.0.1:2222-:22",
    "-audiodev", "dsound,id=snd", "-device", "intel-hda", "-device", "hda-duplex,audiodev=snd",
    "-chardev", "socket,id=ser0,host=127.0.0.1,port=4555,server=on,wait=off,logfile=$vmDir\serial.log,logappend=on",
    "-serial", "chardev:ser0",
    "-qmp", "tcp:127.0.0.1:4556,server,nowait",
    "-no-reboot"
) + $usbDevices + $display

# WHPX can't reset a running guest ("failed to get xsave state"), so QEMU exits when the guest
# reboots and starts again here. A shutdown ends the loop.
do {
    & "$qemu\qemu-system-x86_64.exe" @qemuArgs
    $log = Join-Path $vmDir "serial.log"
    $tail = if (Test-Path $log) { Get-Content $log -Tail 5 -ErrorAction SilentlyContinue | Out-String } else { "" }
} while ($tail -match "reboot: Restarting system")
