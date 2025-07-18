# Deployment Instructions for Cession Management App

This document provides instructions for deploying the Cession Management App using free-tier cloud services.

## Prerequisites

- GitHub account
- Supabase account
- Vercel or Netlify account (for frontend)
- Render or Railway account (for backend)

## Database Setup (Supabase)

1. Create a new Supabase project
2. Navigate to the SQL Editor and run the database schema from `database/schema.sql`
3. Set up Storage buckets:
   - Create a new bucket called `cession-documents`
   - Set up the following security policies:
     - Allow authenticated users to read, create, update, and delete files
4. Copy your Supabase URL and anon key for configuration

## Backend Deployment (Render/Railway)

### Option 1: Render

1. Create a new Web Service
2. Connect your GitHub repository
3. Select the backend directory
4. Configure the service:
   - Build Command: `./mvnw clean package -DskipTests`
   - Start Command: `java -jar target/cession-app-backend-0.0.1-SNAPSHOT.jar`
5. Add the following environment variables:
   - `SPRING_DATASOURCE_URL`: Your Supabase PostgreSQL connection string
   - `SPRING_DATASOURCE_USERNAME`: Your Supabase PostgreSQL username
   - `SPRING_DATASOURCE_PASSWORD`: Your Supabase PostgreSQL password
   - `JWT_SECRET`: A secure random string for JWT signing
   - `FRONTEND_URL`: Your frontend deployment URL
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
   - `SUPABASE_STORAGE_BUCKET`: `cession-documents`

### Option 2: Railway

1. Create a new project
2. Connect your GitHub repository
3. Select the backend directory
4. Configure the service:
   - Build Command: `./mvnw clean package -DskipTests`
   - Start Command: `java -jar target/cession-app-backend-0.0.1-SNAPSHOT.jar`
5. Add the same environment variables as listed for Render

## Frontend Deployment (Vercel/Netlify)

### Option 1: Vercel

1. Create a new project
2. Connect your GitHub repository
3. Configure the project:
   - Framework Preset: SvelteKit
   - Root Directory: `frontend`
4. Add the following environment variable:
   - `PUBLIC_BACKEND_URL`: Your backend API URL (e.g., `https://your-backend.onrender.com/api/v1`)
5. Deploy the project

### Option 2: Netlify

1. Create a new site
2. Connect your GitHub repository
3. Configure the build settings:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
4. Add the same environment variable as listed for Vercel
5. Deploy the site

## Connecting the Services

1. After deploying the backend, update the `PUBLIC_BACKEND_URL` environment variable in your frontend deployment to point to your backend API URL
2. After deploying the frontend, update the `FRONTEND_URL` environment variable in your backend deployment to point to your frontend URL for CORS

## Testing the Deployment

1. Navigate to your frontend URL
2. Log in with the default credentials:
   - Username: `admin`
   - Password: `admin123`
3. Test the core functionalities:
   - Create a client
   - Upload client documents
   - Create a cession
   - Upload a cession contract
   - Verify calculations and search functionality

## CI/CD Setup (Optional)

The repository includes a GitHub Actions workflow in `.github/workflows/ci-cd.yml` that can be customized for your specific deployment targets.
