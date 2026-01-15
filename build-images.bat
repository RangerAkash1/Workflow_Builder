@echo off
REM Build Docker images for the workflow application

echo ================================
echo Building Workflow Docker Images
echo ================================

REM Set image tag (default to latest)
set TAG=%1
if "%TAG%"=="" set TAG=latest
echo Using tag: %TAG%

REM Build backend image
echo.
echo Building backend image...
docker build -t workflow-backend:%TAG% .\backend
if %errorlevel% neq 0 (
    echo Failed to build backend image
    exit /b 1
)
echo Backend image built successfully

REM Build frontend image
echo.
echo Building frontend image...
docker build -t workflow-frontend:%TAG% .\frontend
if %errorlevel% neq 0 (
    echo Failed to build frontend image
    exit /b 1
)
echo Frontend image built successfully

echo.
echo ================================
echo All images built successfully!
echo ================================
echo.
echo Images created:
docker images | findstr "workflow-"

echo.
echo To push to a registry, tag and push:
echo   docker tag workflow-backend:%TAG% your-registry/workflow-backend:%TAG%
echo   docker tag workflow-frontend:%TAG% your-registry/workflow-frontend:%TAG%
echo   docker push your-registry/workflow-backend:%TAG%
echo   docker push your-registry/workflow-frontend:%TAG%
