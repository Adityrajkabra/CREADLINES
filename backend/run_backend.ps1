Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting CrediLens Backend (FastAPI + Uvicorn on :8000)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
