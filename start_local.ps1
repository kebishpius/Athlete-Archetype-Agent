# ─────────────────────────────────────────────────────────────────────────────
# start_local.ps1  –  Launch all three services for local development
#
# Services started:
#   Port 8000  → ADK backend (main agent API)
#   Port 8001  → Image generation service
#   Port 5173  → Vite frontend dev server (proxies /apps /run → 8000)
# ─────────────────────────────────────────────────────────────────────────────

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

Write-Host "==> Loading environment from .env" -ForegroundColor Cyan
if (Test-Path "$ROOT\.env") {
    Get-Content "$ROOT\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
}

Write-Host ""
Write-Host "==> Starting ADK backend on port 8000..." -ForegroundColor Green
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$ROOT'; python -m uvicorn app.fast_api_app:app --host 0.0.0.0 --port 8000 --reload" `
    -PassThru

Write-Host "==> Starting Image Gen service on port 8001..." -ForegroundColor Green
$imageGen = Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$ROOT'; python -m app.image_gen_app" `
    -PassThru

Write-Host "==> Starting Vite frontend on port 5173..." -ForegroundColor Green
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Set-Location '$ROOT\frontend'; npm run dev" `
    -PassThru

Write-Host ""
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Backend:   http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  Image Gen: http://localhost:8001/docs" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Yellow
Write-Host ""
Write-Host "Close the individual terminal windows to stop each service." -ForegroundColor Gray
