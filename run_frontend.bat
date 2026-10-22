@echo off
echo ========================================================
echo Starting CrediLens Frontend (Vite + React)
echo ========================================================
if exist package.json (
    npm run dev
) else if exist frontend\package.json (
    cd frontend
    npm run dev
) else (
    echo Could not locate package.json. Please ensure you are in the project folder.
)
pause
