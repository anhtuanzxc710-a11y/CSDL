@echo off
title DNT Quant Lab Runner
cls
color 0A

echo ======================================================================
echo             DNT QUANT LAB - BACKEND ^& FRONTEND RUNNER
echo ======================================================================
echo.

cd /d "%~dp0quant-engine\dnt_quant_lab\backend"

rem Detect virtual environment
set VENV_PATH=
if exist "venv\Scripts\activate.bat" (
    set VENV_PATH=venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    set VENV_PATH=.venv\Scripts\activate.bat
)

if not "%VENV_PATH%"=="" (
    echo [INFO] Activating virtual environment: %VENV_PATH%
    call %VENV_PATH%
) else (
    echo [WARNING] Virtual environment not found. Running with global Python.
)

echo.
echo ======================================================================
echo   SERVER IS STARTING! PLEASE CTRL+CLICK OR COPY THE LINK BELOW:
echo   --^> http://127.0.0.1:8001/
echo ======================================================================
echo.

uvicorn main:app --reload --port 8001

pause
