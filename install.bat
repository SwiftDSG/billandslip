@echo off
:: Launches the PowerShell install script with execution-policy bypass
:: so the user doesn't need to configure anything first.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
