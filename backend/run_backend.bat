@echo off
echo ========================================================
echo Starting CrediLens Backend (FastAPI + Uvicorn)
echo ========================================================
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
