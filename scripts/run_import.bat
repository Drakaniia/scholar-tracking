@echo off
setlocal enabledelayedexpansion

echo.
echo ======================================================
echo  Scholarship Tracking System - Excel Data Importer
echo ======================================================
echo.

REM --- Default mode ---
set DRY_RUN=true

REM --- Parse command line arguments ---
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--live" set DRY_RUN=false
if /i "%~1"=="-l" set DRY_RUN=false
if /i "%~1"=="--dry-run" set DRY_RUN=true
if /i "%~1"=="-d" set DRY_RUN=true
if /i "%~1"=="/?" goto usage
if /i "%~1"=="--help" goto usage
shift
goto parse_args
:args_done

if "%DRY_RUN%"=="true" (
    echo Mode: DRY RUN - no data will be written
) else (
    echo Mode: LIVE IMPORT - WARNING: data WILL be written to the database
    echo.
    echo Press Ctrl+C within 5 seconds to cancel...
    timeout /t 5 /nobreak >nul
)
echo.

REM --- Check if Python is installed ---
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM --- Check if virtual environment exists ---
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM --- Activate virtual environment ---
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM --- Install dependencies ---
echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM --- Set UTF-8 encoding for emoji-safe console output ---
set PYTHONIOENCODING=utf-8

REM --- Run the importer ---
echo.
if "%DRY_RUN%"=="true" (
    echo Starting Excel data import - DRY RUN mode...
) else (
    echo Starting Excel data import - LIVE IMPORT mode...
)
echo.

REM Redirect output to both console and log file
if "%DRY_RUN%"=="true" (
    python excel_data_importer.py --dry-run 2>&1
) else (
    python excel_data_importer.py --live 2>&1
)
set EXIT_CODE=%errorlevel%

echo.
if %EXIT_CODE% equ 0 (
    echo ======================================================
    echo Import process completed successfully!
    echo ======================================================
) else (
    echo ======================================================
    echo Import process FAILED with exit code %EXIT_CODE%
    echo ======================================================
)

REM --- Show path to saved report ---
echo.
echo Report file: scripts\import_report.json

pause
exit /b %EXIT_CODE%

:usage
echo Usage: run_import.bat [options]
echo.
echo Options:
echo   --dry-run  -d   Preview what would be imported - DEFAULT
echo   --live     -l   Perform actual database import
echo   --help     /?   Show this help message
echo.
pause
exit /b 0
