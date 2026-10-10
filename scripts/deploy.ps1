# Copies the mod into the Civilization VII Mods folder on Windows. Run from a clone of this repository:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 [-E5] [-ModsFolder <path>]
# -E5 also copies the throwaway experiment mod from experiments\ (see experiments\README.md).
# Remove the copy before testing the Workshop subscription; two copies of one mod break screens.
param(
    [string]$ModsFolder = "$env:LOCALAPPDATA\Firaxis Games\Sid Meier's Civilization VII\Mods",
    [switch]$E5
)
$ErrorActionPreference = "Stop"
$sources = @(Join-Path $PSScriptRoot "..\mod\settlement-gifting")
if ($E5) { $sources += Join-Path $PSScriptRoot "..\experiments\sg-e5-transfer-test" }
New-Item -ItemType Directory -Force -Path $ModsFolder | Out-Null
foreach ($source in $sources) {
    $target = Join-Path $ModsFolder (Split-Path $source -Leaf)
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Copy-Item -Recurse $source $target
    Write-Host "Copied to $target"
}
