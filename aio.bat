@echo off
if /I "%~1"=="aio"  (
   npm run build:aio && del dist\assets\*.js && del dist\assets\*.css && rmdir dist\assets && del dist\index.html
) else if /I "%~1"=="exe"  (
   npm run build:exe
) else if /I "%~1"=="build"  (
   vite build
) else if /I "%~1"=="install"  (
   npm install
) else (
    npm run build
)