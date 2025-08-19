#!/bin/bash
set -e

# 1. Build the Svelte frontend
cd frontend
npm install
npm run build

# 2. Copy frontend build output to backend static folder
rm -rf ../backend/src/main/resources/static/*
cp -r dist/* ../backend/src/main/resources/static/

# 3. Build the Spring Boot backend
cd ../backend
mvn clean package

# 4. Run the JAR
JAR_NAME=$(ls target | grep 'cession-app-backend.*\.jar$' | grep -v 'original' | head -n 1)
echo "Running $JAR_NAME..."
java -jar target/$JAR_NAME 