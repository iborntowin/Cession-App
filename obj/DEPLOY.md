# One-Click Deployment Guide

## Prerequisites
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Ensure ports 8089 (API) and 5173 (Frontend) are free

## Start the Application
```bash
docker-compose up --build -d
```

## Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8089

## Stop the Application
```bash
docker-compose down
```

## Reset Database (remove all data)
```bash
docker-compose down -v
```

## View Logs
```bash
docker-compose logs -f
```

## Update Application
```bash
docker-compose down
git pull origin main
docker-compose up --build -d
```

## Project Structure
```
cession-app/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   ├── src/
│   └── ... (your Spring Boot code)
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── src/
│   └── ... (your Svelte code)
└── DEPLOY.md
```

## Key Features
1. **Self-Contained System**: PostgreSQL, Spring Boot backend, Svelte frontend, Nginx reverse proxy
2. **Automatic Setup**: Database initialization, dependency installation, build process
3. **Health Checks**: Database readiness check, auto-restart on failure
4. **Persistent Storage**: Database data survives container restarts
5. **Production-Ready**: Multi-stage Docker builds, optimized image sizes, environment variable configuration
6. **Portability**: Works on Windows, macOS, and Linux

---

**To deploy on any machine:**
1. Install Docker
2. Clone repository
3. Run `docker-compose up --build -d`
4. Access app at http://localhost:5173

This solution handles all dependencies, configurations, and networking automatically - making your application truly portable across Windows, macOS, and Linux systems. 