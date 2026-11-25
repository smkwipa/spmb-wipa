@echo off
chcp 65001 >nul
title Push ke smkwipa/spmb-wipa

cd /d "%~dp0"

set "REPO_URL=https://github.com/smkwipa/spmb-wipa.git"

where git >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git belum terinstal atau belum masuk PATH Windows.
    pause
    exit /b 1
)

if exist ".git\rebase-merge" (
    git rebase --abort >nul 2>&1
)

if not exist ".git" (
    git init
    git branch -M main
    git remote add origin "%REPO_URL%"
)

set /p MSG="Pesan commit (kosongkan = update otomatis): "
if "%MSG%"=="" set MSG=update: %date% %time%

git add -A
git diff --cached --quiet
if %errorlevel% neq 0 (
    git commit -m "%MSG%"
    if errorlevel 1 (
        echo [ERROR] Gagal melakukan commit.
        pause
        exit /b 1
    )
)

git pull origin main --rebase
if errorlevel 1 (
    echo [ERROR] Ada konflik. Selesaikan lalu jalankan ulang.
    pause
    exit /b 1
)

git push -u origin main
if errorlevel 1 (
    echo [ERROR] Gagal push.
    pause
    exit /b 1
)

echo.
echo [SUKSES] Semua file berhasil di-push ke %REPO_URL% !
pause