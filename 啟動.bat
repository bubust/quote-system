@echo off
chcp 65001 >nul
title 報價系統

cd /d "%~dp0"

if not exist node_modules (
    echo 第一次執行，安裝套件中...
    npm install
)

echo 啟動報價系統...
start "" "http://localhost:5173/quote-system/"
npm run dev
