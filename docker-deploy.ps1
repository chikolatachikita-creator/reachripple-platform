# Reach Ripple Docker Deployment PowerShell Script
# This script provides easy Docker management commands

param(
    [string]$Command = ""
)

function Show-Help {
    Write-Host "`nReach Ripple - Docker Management Tool`n" -ForegroundColor Cyan
    Write-Host "Usage: ./docker-deploy.ps1 -Command [command]`n" -ForegroundColor White
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  build              Build all Docker images"
    Write-Host "  start              Start all containers (background)"
    Write-Host "  stop               Stop all containers"
    Write-Host "  restart            Restart all containers"
    Write-Host "  down               Stop and remove all containers"
    Write-Host "  logs               View logs from all services"
    Write-Host "  logs-backend       View backend logs"
    Write-Host "  logs-frontend      View frontend logs"
    Write-Host "  logs-mongo         View MongoDB logs"
    Write-Host "  logs-redis         View Redis logs"
    Write-Host "  ps                 List all running containers"
    Write-Host "  health             Check health status of all services"
    Write-Host "  clean              Remove all containers, volumes, and images"
    Write-Host "  bash-backend       Open bash shell in backend container"
    Write-Host "  bash-mongo         Open MongoDB shell"
    Write-Host "  bash-redis         Open Redis CLI`n"
}

function Check-Docker {
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Host "ERROR: Docker is not installed or not in PATH" -ForegroundColor Red
        exit 1
    }
}

function Check-Health {
    Write-Host "`nChecking service health..." -ForegroundColor Yellow
    docker-compose ps
    
    $unhealthy = docker-compose ps | Select-String "unhealthy"
    if ($unhealthy) {
        Write-Host "WARNING: Some services are unhealthy!" -ForegroundColor Red
    } else {
        Write-Host "All services appear healthy!" -ForegroundColor Green
    }
}

function Navigate-Backend {
    Set-Location -Path (Join-Path $PSScriptRoot "backend") -ErrorAction Stop
}

# Check if Docker is installed
Check-Docker

# If no command provided, show help
if ([string]::IsNullOrEmpty($Command)) {
    Show-Help
    exit 0
}

# Navigate to backend directory
Navigate-Backend

# Execute command
switch ($Command.ToLower()) {
    "build" {
        Write-Host "Building all Docker images..." -ForegroundColor Cyan
        docker-compose build
    }
    
    "start" {
        Write-Host "Starting all containers..." -ForegroundColor Cyan
        docker-compose up -d
        Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Check-Health
    }
    
    "stop" {
        Write-Host "Stopping all containers..." -ForegroundColor Cyan
        docker-compose stop
    }
    
    "restart" {
        Write-Host "Restarting all containers..." -ForegroundColor Cyan
        docker-compose restart
        Write-Host "`nWaiting for services to be healthy..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Check-Health
    }
    
    "down" {
        Write-Host "Stopping and removing containers..." -ForegroundColor Cyan
        docker-compose down
    }
    
    "logs" {
        Write-Host "Showing logs from all services (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f
    }
    
    "logs-backend" {
        Write-Host "Showing backend logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f backend
    }
    
    "logs-frontend" {
        Write-Host "Showing frontend logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f frontend
    }
    
    "logs-mongo" {
        Write-Host "Showing MongoDB logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f mongo
    }
    
    "logs-redis" {
        Write-Host "Showing Redis logs (Ctrl+C to exit)..." -ForegroundColor Cyan
        docker-compose logs -f redis
    }
    
    "ps" {
        Write-Host "Running containers:" -ForegroundColor Cyan
        docker-compose ps
    }
    
    "health" {
        Check-Health
    }
    
    "clean" {
        Write-Host "WARNING: This will remove all containers, volumes, and images!" -ForegroundColor Red
        $confirm = Read-Host "Continue? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Write-Host "Cleaning up Docker resources..." -ForegroundColor Cyan
            docker-compose down -v --rmi all
            Write-Host "Cleanup complete!" -ForegroundColor Green
        } else {
            Write-Host "Cleanup cancelled." -ForegroundColor Yellow
        }
    }
    
    "bash-backend" {
        Write-Host "Opening bash shell in backend container..." -ForegroundColor Cyan
        docker-compose exec backend sh
    }
    
    "bash-mongo" {
        Write-Host "Opening MongoDB shell..." -ForegroundColor Cyan
        docker-compose exec mongo mongosh -u admin -p password123 --authenticationDatabase admin
    }
    
    "bash-redis" {
        Write-Host "Opening Redis CLI..." -ForegroundColor Cyan
        docker-compose exec redis redis-cli -a redis123
    }
    
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "`nRun 'docker-deploy.ps1' with no arguments to see all available commands." -ForegroundColor Yellow
    }
}
