# Puts the current shell, session files and boot splash into the running test VM without
# rebuilding the image: packs them in WSL (tools/wsl/pack-vm.sh), serves the archive to the VM,
# lays it over /usr and /etc through a temporary writable /usr, and restarts the shell.
# The overlay lasts until the VM restarts.
#   .\push.ps1            pack and push
#   .\push.ps1 -NoBuild   push the last archive again
param([switch]$NoBuild)

$root = Split-Path (Split-Path $PSScriptRoot)
if (-not $NoBuild) {
    wsl -d FedoraLinux-44 -- bash /mnt/c/Users/Thomas/Documents/VantaOS/tools/wsl/pack-vm.sh
    if ($LASTEXITCODE -ne 0) { throw "pack failed" }
}

# The VM reaches the host's 127.0.0.1 as 10.0.2.2 (QEMU user networking).
$server = Start-Process python -ArgumentList "-I", "-m", "http.server", "8766", "--bind", "127.0.0.1", "--directory", "$root\build\push" -PassThru -WindowStyle Hidden
try {
    Start-Sleep -Seconds 1
    python "$PSScriptRoot\vmctl.py" root ("rpm-ostree usroverlay >/dev/null 2>&1; " +
        "curl -sf http://10.0.2.2:8766/vanta-push.tgz | tar xzf - -C / --no-same-owner --no-overwrite-dir && " +
        "pkill -x vanta-shell; echo pushed") 90
} finally {
    Stop-Process -Id $server.Id -ErrorAction SilentlyContinue
}
