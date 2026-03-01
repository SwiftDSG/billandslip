#Requires -Version 5.1
$Host.UI.RawUI.WindowTitle = "BillAndSlip - Installer"
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Step($n, $total, $msg) {
    Write-Host ""
    Write-Host "[$n/$total] $msg" -ForegroundColor Yellow
}

function Refresh-Path {
    $machine = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
    $user    = [System.Environment]::GetEnvironmentVariable("PATH", "User")
    $env:PATH = "$machine;$user"
    # cargo is placed here by rustup and may not be in the registry PATH yet
    $cargoBin = "$env:USERPROFILE\.cargo\bin"
    if (Test-Path $cargoBin) { $env:PATH += ";$cargoBin" }
}

function Check-Command($cmd) {
    return [bool](Get-Command $cmd -ErrorAction SilentlyContinue)
}

# ── Banner ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   BillAndSlip - Installation Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will install Node.js, Rust, and build" -ForegroundColor Gray
Write-Host "the application. It may take 10-20 minutes." -ForegroundColor Gray

# ── Step 1: Check winget ───────────────────────────────────────────────────
Write-Step 1 5 "Checking winget (Windows Package Manager)..."
$wgVer = winget --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: winget is not available on this PC." -ForegroundColor Red
    Write-Host "  Please install 'App Installer' from the Microsoft Store," -ForegroundColor Red
    Write-Host "  then run install.bat again." -ForegroundColor Red
    Write-Host ""
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  OK: winget $wgVer found." -ForegroundColor Green

# ── Step 2: Visual C++ Build Tools (Rust linker on Windows) ───────────────
Write-Step 2 5 "Installing Visual C++ Build Tools (required by Rust)..."
Write-Host "  This is a large download and may take 10+ minutes." -ForegroundColor Gray
Write-Host "  If already installed, this step will finish quickly." -ForegroundColor Gray
winget install --id Microsoft.VisualStudio.2022.BuildTools `
    -e --accept-source-agreements --accept-package-agreements `
    --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
Write-Host "  Done." -ForegroundColor Green

# ── Step 3: Node.js ────────────────────────────────────────────────────────
Write-Step 3 5 "Installing Node.js LTS..."
winget install --id OpenJS.NodeJS.LTS `
    -e --accept-source-agreements --accept-package-agreements --silent
Write-Host "  Done." -ForegroundColor Green

# ── Step 4: Rust ───────────────────────────────────────────────────────────
Write-Step 4 5 "Installing Rust..."
# --override "-y" passes the -y (no-prompts) flag to rustup-init.exe
winget install --id Rustlang.Rustup `
    -e --accept-source-agreements --accept-package-agreements `
    --override "-y"
Write-Host "  Done." -ForegroundColor Green

# Refresh PATH so npm and cargo are visible in this session
Write-Host ""
Write-Host "  Refreshing PATH..." -ForegroundColor Gray
Refresh-Path

# Ensure the stable toolchain is present (rustup may need a first-run)
if (Check-Command "rustup") {
    Write-Host "  Initialising Rust stable toolchain..." -ForegroundColor Gray
    rustup toolchain install stable --no-self-update 2>&1 | Out-Null
    rustup default stable 2>&1 | Out-Null
}

# ── Step 5a: Frontend dependencies ────────────────────────────────────────
Write-Step 5 5 "Installing frontend dependencies..."
Set-Location "$root\web"

if (-not (Check-Command "npm")) {
    Write-Host ""
    Write-Host "  ERROR: npm not found. Node.js installation may need a system restart." -ForegroundColor Red
    Write-Host "  Please restart your computer and run install.bat again." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: npm install failed." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  Done." -ForegroundColor Green

# ── Step 5b: Backend build ─────────────────────────────────────────────────
Write-Host ""
Write-Host "  Building backend (first build may take a few minutes)..." -ForegroundColor Yellow
Set-Location "$root\server"

if (-not (Check-Command "cargo")) {
    Write-Host ""
    Write-Host "  ERROR: cargo not found. Rust installation may need a system restart." -ForegroundColor Red
    Write-Host "  Please restart your computer and run install.bat again." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "  ERROR: cargo build failed." -ForegroundColor Red
    Write-Host "  If this is the first install, try restarting your computer" -ForegroundColor Yellow
    Write-Host "  and running install.bat again (the C++ Build Tools sometimes" -ForegroundColor Yellow
    Write-Host "  need a restart before Rust can use them)." -ForegroundColor Yellow
    Read-Host "  Press Enter to exit"
    exit 1
}
Write-Host "  Done." -ForegroundColor Green

# ── Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   Installation complete!" -ForegroundColor Green
Write-Host "   Double-click run.bat to start the app." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to close"
