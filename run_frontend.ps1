Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting CrediLens Frontend (Vite + React on :5173)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\frontend"
npm run dev
