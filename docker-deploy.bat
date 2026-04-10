@echo off
REM Reach Ripple Docker Deployment Script
REM This script provides easy Docker management commands

setlocal enabledelayedexpansion

if "%1"=="" (
    echo.
    echo Reach Ripple - Docker Management Tool
    echo.
    echo Usage: docker-deploy.bat [command]
    echo.
    echo Commands:
    echo   build          Build all Docker images
    echo   start          Start all containers (background^)
    echo   stop           Stop all containers
    echo   restart        Restart all containers
    echo   down           Stop and remove all containers
    echo   logs           View logs from all services
    echo   logs-backend   View backend logs
    echo   logs-frontend  View frontend logs
    echo   logs-mongo     View MongoDB logs
    echo   logs-redis     View Redis logs
    echo   ps             List all running containers
    echo   health         Check health status of all services
    echo   clean          Remove all containers, volumes, and images
    echo   bash-backend   Open bash shell in backend container
    echo   bash-mongo     Open MongoDB shell
    echo   bash-redis     Open Redis CLI
    echo.
    goto :end
)

cd /d "%~dp0backend"

if /i "%1"=="build" (
    echo Building all Docker images...
    docker-compose build
    goto :end
)

if /i "%1"=="start" (
    echo Starting all containers...
    docker-compose up -d
    echo.
    echo Waiting for services to be healthy...
    timeout /t 5
    call :health_check
    goto :end
)

if /i "%1"=="stop" (
    echo Stopping all containers...
    docker-compose stop
    goto :end
)

if /i "%1"=="restart" (
    echo Restarting all containers...
    docker-compose restart
    echo.
    echo Waiting for services to be healthy...
    timeout /t 5
    call :health_check
    goto :end
)

if /i "%1"=="down" (
    echo Stopping and removing containers...
    docker-compose down
    goto :end
)

if /i "%1"=="logs" (
    echo Showing logs from all services (Ctrl+C to exit^)...
    docker-compose logs -f
    goto :end
)

if /i "%1"=="logs-backend" (
    echo Showing backend logs (Ctrl+C to exit^)...
    docker-compose logs -f backend
    goto :end
)

if /i "%1"=="logs-frontend" (
    echo Showing frontend logs (Ctrl+C to exit^)...
    docker-compose logs -f frontend
    goto :end
)

if /i "%1"=="logs-mongo" (
    echo Showing MongoDB logs (Ctrl+C to exit^)...
    docker-compose logs -f mongo
    goto :end
)

if /i "%1"=="logs-redis" (
    echo Showing Redis logs (Ctrl+C to exit^)...
    docker-compose logs -f redis
    goto :end
)

if /i "%1"=="ps" (
    echo Running containers:
    docker-compose ps
    goto :end
)

if /i "%1"=="health" (
    call :health_check
    goto :end
)

if /i "%1"=="clean" (
    echo WARNING: This will remove all containers, volumes, and images!
    set /p confirm="Continue? (y/N): "
    if /i "!confirm!"=="y" (
        echo Cleaning up Docker resources...
        docker-compose down -v --rmi all
        echo Cleanup complete!
    ) else (
        echo Cleanup cancelled.
    )
    goto :end
)

if /i "%1"=="bash-backend" (
    echo Opening bash shell in backend container...
    docker-compose exec backend sh
    goto :end
)

if /i "%1"=="bash-mongo" (
    echo Opening MongoDB shell...
    docker-compose exec mongo mongosh -u admin -p password123 --authenticationDatabase admin
    goto :end
)

if /i "%1"=="bash-redis" (
    echo Opening Redis CLI...
    docker-compose exec redis redis-cli -a redis123
    goto :end
)

echo Unknown command: %1
goto :end

:health_check
echo.
echo Checking service health...
docker-compose ps
echo.
for /f "tokens=2" %%i in ('docker-compose ps ^| find "unhealthy"') do (
    echo WARNING: Some services are unhealthy!
    goto :end
)
echo All services appear healthy!
exit /b 0

:end
endlocal
