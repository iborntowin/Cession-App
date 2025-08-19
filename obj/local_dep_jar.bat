@echo off
setlocal enabledelayedexpansion

REM 1. Build the Svelte frontend
cd frontend
call npm install
call npm run build

REM 2. Copy frontend build output to backend static folder
cd ..
if exist backend\src\main\resources\static rmdir /s /q backend\src\main\resources\static
mkdir backend\src\main\resources\static
xcopy /E /I /Y frontend\dist\* backend\src\main\resources\static\

REM 3. Build the Spring Boot backend
cd backend
call mvn clean package

REM 4. Run the JAR
for %%f in (target\cession-app-backend-*.jar) do (
    if not "%%~nxf"=="cession-app-backend-0.0.1-SNAPSHOT.jar.original" set JAR_NAME=%%f
)
echo Running %JAR_NAME% ...
java -jar target\%JAR_NAME% 