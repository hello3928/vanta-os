# Saves a PNG of the QEMU window, even when other windows cover it. QMP's screendump can't read
# the virgl (3D) display, so this is how tests see the screen in the default mode.
#   .\window-shot.ps1 out.png
param([Parameter(Mandatory)][string]$Out)

Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
}
"@

$proc = Get-Process qemu-system-x86_64 -ErrorAction Stop | Where-Object MainWindowHandle -ne 0 | Select-Object -First 1
if (-not $proc) { throw "No QEMU window (started with -Headless?)" }
$r = New-Object Win+RECT
[void][Win]::GetClientRect($proc.MainWindowHandle, [ref]$r)
$bmp = New-Object System.Drawing.Bitmap ($r.R - $r.L), ($r.B - $r.T)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$dc = $g.GetHdc()
# 1 = client area only, 2 = PW_RENDERFULLCONTENT (needed for GPU-drawn windows).
[void][Win]::PrintWindow($proc.MainWindowHandle, $dc, 3)
$g.ReleaseHdc($dc)
$path = if ([IO.Path]::IsPathRooted($Out)) { $Out } else { Join-Path (Get-Location) $Out }
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$path
