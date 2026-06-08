@echo off
title NVT Workspace Launcher
chcp 65001 > nul
cls
color 0B

echo ======================================================================
echo             NVT WORKSPACE - HỆ THỐNG PHÂN TÍCH TÀI CHÍNH
echo ======================================================================
echo.
echo Vui lòng chọn ứng dụng bạn muốn khởi chạy:
echo.
echo [1] NVT Portfolio Website (Trang chủ ^& Trợ lý ảo AI)
echo [2] VN Stocks Quant Analyzer (Dashboard phân tích Streamlit)
echo [3] NVT Quant Lab (Hệ thống tối ưu hóa danh mục chuyên sâu)
echo [4] Chạy TẤT CẢ các hệ thống cùng lúc (Khuyên dùng)
echo [5] Thoát
echo.
echo ======================================================================
set /p opt="Nhập lựa chọn của bạn (1-5): "

if "%opt%"=="1" goto PORTFOLIO
if "%opt%"=="2" goto QUANT_ANALYZER
if "%opt%"=="3" goto QUANT_LAB
if "%opt%"=="4" goto RUN_ALL
if "%opt%"=="5" goto EXIT
goto INVALID

:PORTFOLIO
cls
echo [INFO] Đang khởi chạy NVT Portfolio Website...
cd /d "%~dp0docs"
start "NVT Portfolio Server" cmd /k "python -m http.server 8080"
timeout /t 2 > nul
start http://localhost:8080
goto EXIT

:QUANT_ANALYZER
cls
echo [INFO] Đang khởi chạy VN Stocks Quant Analyzer...
cd /d "%~dp0quant-engine\vn_stocks_quant"
echo [INFO] Đang kiểm tra thư viện và chạy Streamlit...
start "VN Stocks Quant" cmd /k "python -m pip install -r requirements.txt && python -m streamlit run app.py"
goto EXIT

:QUANT_LAB
cls
echo [INFO] Đang khởi chạy NVT Quant Lab...
cd /d "%~dp0quant-engine\nvt_quant_lab\backend"

:: Phát hiện môi trường ảo (venv/.venv)
set VENV_PATH=
if exist "venv\Scripts\activate.bat" (
    set VENV_PATH=venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    set VENV_PATH=.venv\Scripts\activate.bat
)

if not "%VENV_PATH%"=="" (
    echo [INFO] Đã phát hiện môi trường ảo tại %VENV_PATH%. Đang kích hoạt...
    start "NVT Quant Lab Backend" cmd /k "call %VENV_PATH% && python -m pip install -r requirements.txt && python -m alembic upgrade head && python -m uvicorn main:app --reload"
) else (
    echo [WARNING] Không tìm thấy venv. Đang chạy bằng Python hệ thống...
    start "NVT Quant Lab Backend" cmd /k "python -m pip install -r requirements.txt && python -m alembic upgrade head && python -m uvicorn main:app --reload"
)

timeout /t 4 > nul
start http://localhost:8000
goto EXIT

:RUN_ALL
cls
echo [INFO] Đang khởi chạy tất cả các phân hệ hệ thống...

:: 1. Portfolio
echo [INFO] Đang chạy NVT Portfolio Website (Cổng 8080)...
cd /d "%~dp0docs"
start "NVT Portfolio Server" cmd /k "python -m http.server 8080"

:: 2. Streamlit
echo [INFO] Đang chạy VN Stocks Quant Analyzer (Cổng 8501)...
cd /d "%~dp0quant-engine\vn_stocks_quant"
start "VN Stocks Quant" cmd /k "python -m pip install -r requirements.txt && python -m streamlit run app.py"

:: 3. Quant Lab
echo [INFO] Đang chạy NVT Quant Lab Backend (Cổng 8000)...
cd /d "%~dp0quant-engine\nvt_quant_lab\backend"
set VENV_PATH=
if exist "venv\Scripts\activate.bat" (
    set VENV_PATH=venv\Scripts\activate.bat
) else if exist ".venv\Scripts\activate.bat" (
    set VENV_PATH=.venv\Scripts\activate.bat
)

if not "%VENV_PATH%"=="" (
    start "NVT Quant Lab Backend" cmd /k "call %VENV_PATH% && python -m pip install -r requirements.txt && python -m alembic upgrade head && python -m uvicorn main:app --reload"
) else (
    start "NVT Quant Lab Backend" cmd /k "python -m pip install -r requirements.txt && python -m alembic upgrade head && python -m uvicorn main:app --reload"
)

echo [INFO] Đang đợi các máy chủ khởi động trong giây lát...
timeout /t 5 > nul
start http://localhost:8080
start http://localhost:8501
start http://localhost:8000
goto EXIT

:INVALID
echo [ERROR] Lựa chọn không hợp lệ. Vui lòng khởi động lại tệp!
pause
goto EXIT

:EXIT
echo.
echo ======================================================================
echo Khởi chạy hoàn tất. Cửa sổ này sẽ tự động đóng sau 3 giây...
echo ======================================================================
timeout /t 3 > nul
exit
