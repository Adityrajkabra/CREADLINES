@echo off
echo ========================================================
echo Starting CrediLens Backend (FastAPI + Uvicorn)
echo ========================================================
if exist main.py (
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
) else if exist backend\main.py (
    cd backend
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
) else (
    echo Could not locate main.py. Please ensure you are in the project folder.
)
pause
