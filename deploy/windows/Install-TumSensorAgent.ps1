# ==============================================================================
# TUM Sovereign CyberMesh — Windows Sensor Agent Installer
# Installs tum-sensor-agent as a native Windows Background Service
# ==============================================================================
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$Endpoint = "http://127.0.0.1:7799",

    [Parameter(Mandatory = $false)]
    [int]$IntervalMs = 5000,

    [Parameter(Mandatory = $false)]
    [string]$TenantId = "tum-sovereign-tenant",

    [Parameter(Mandatory = $false)]
    [string]$InstallDir = "C:\Program Files\TUM\CyberMesh\SensorAgent"
)

$ErrorActionPreference = "Stop"

Write-Host "[INSTALLER] TUM Sovereign CyberMesh Windows Sensor Agent" -ForegroundColor Cyan
Write-Host "[INSTALLER] Checking administrative privileges..."

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "Administrator privileges are required to install Windows Services. Please run PowerShell as Administrator."
    exit 1
}

# 1. Create installation directory
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "[INSTALLER] Created directory: $InstallDir"
}

# 2. Check Node.js
$nodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source
if (-not $nodePath) {
    Write-Error "Node.js (>=20.0.0) is not found in PATH. Please install Node.js before proceeding."
    exit 1
}
Write-Host "[INSTALLER] Detected Node.js runtime: $nodePath"

# 3. Create run wrapper script
$scriptPath = Join-Path $InstallDir "Run-SensorAgent.cmd"
$repoAgentJs = Join-Path $PSScriptRoot "..\..\dist\presentation\sensor\sensor-agent-cli.js"
$resolvedAgentJs = [System.IO.Path]::GetFullPath($repoAgentJs)

$cmdContent = @"
@echo off
set CYBERMESH_ENDPOINT=$Endpoint
set CYBERMESH_INTERVAL_MS=$IntervalMs
set CYBERMESH_TENANT_ID=$TenantId
"$nodePath" "$resolvedAgentJs"
"@

Set-Content -Path $scriptPath -Value $cmdContent -Encoding ASCII
Write-Host "[INSTALLER] Generated service wrapper: $scriptPath"

# 4. Register or recreate Windows Service via sc.exe
$serviceName = "TumCyberMeshSensor"
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

if ($existingService) {
    Write-Host "[INSTALLER] Stopping existing service $serviceName..."
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    & sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
}

Write-Host "[INSTALLER] Registering Windows Service: $serviceName..."
& sc.exe create $serviceName binPath= "cmd.exe /c `"$scriptPath`"" start= auto DisplayName= "TUM CyberMesh eBPF Socket Sensor" | Out-Null
& sc.exe description $serviceName "TUM Sovereign CyberMesh live socket telemetry agent forwarder" | Out-Null

# 5. Start service
Write-Host "[INSTALLER] Starting $serviceName..."
Start-Service -Name $serviceName

$status = (Get-Service -Name $serviceName).Status
Write-Host "[INSTALLER] Service status: $status" -ForegroundColor Green
Write-Host "[INSTALLER] Installation completed successfully."
