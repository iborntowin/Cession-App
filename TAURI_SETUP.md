# Tauri Desktop App Setup Guide

This guide will help you build and run your Cession Management App as a standalone desktop application using Tauri.

## Prerequisites

### Required Software
1. **Java 17 or higher** - Required for Spring Boot backend
   - Download from: https://adoptium.net/
   - Verify installation: `java -version`

2. **Node.js 18 or higher** - Required for frontend build
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

3. **Rust** - Required for Tauri
   - Install from: https://rustup.rs/
   - Verify installation: `rustc --version`

4. **Maven** - Required for backend build
   - Usually comes with Java IDEs or install separately
   - Verify installation: `mvn --version`

## Quick Start

### Option 1: Automated Build (Recommended)
```powershell
# Build the complete application
.\build-tauri.ps1

# Or run in development mode
.\dev-tauri.ps1
```

### Option 2: Manual Build Steps

1. **Build the Backend**
   ```powershell
   cd backend
   mvn clean package -DskipTests
   cd ..
   ```

2. **Prepare Tauri Resources**
   ```powershell
   # Copy backend JAR to Tauri directories
   New-Item -ItemType Directory -Force -Path "frontend/src-tauri/backend"
   New-Item -ItemType Directory -Force -Path "frontend/src-tauri/resources/backend"
   
   Copy-Item "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar" "frontend/src-tauri/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
   Copy-Item "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar" "frontend/src-tauri/resources/backend/cession-app-backend-0.0.1-SNAPSHOT.jar"
   ```

3. **Build Frontend and Tauri App**
   ```powershell
   cd frontend
   npm install
   npm run build
   npm run tauri build
   ```

## Development Mode

To run the app in development mode (with hot reload):

```powershell
cd frontend
npm run tauri dev
```

This will:
- Start the Spring Boot backend automatically
- Launch the Svelte frontend with hot reload
- Open the desktop app window

## Build Artifacts

After a successful build, you'll find:

- **Windows Installer**: `frontend/src-tauri/target/release/bundle/msi/`
- **Executable**: `frontend/src-tauri/target/release/cession-app-frontend.exe`

## How It Works

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Tauri Shell   │    │  Svelte Frontend │    │ Spring Boot API │
│   (Rust/WebView)│◄──►│   (Port 5173)    │◄──►│   (Port 8082)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Startup Process
1. Tauri app launches
2. Rust code detects Java installation
3. Spring Boot backend starts automatically on port 8082
4. Svelte frontend connects to backend via HTTP API
5. H2 database initializes in user data directory

### Data Storage
- **Database**: `%APPDATA%/com.electro.cessionapp/db/`
- **Logs**: `%APPDATA%/com.electro.cessionapp/logs/`
- **App Data**: `%APPDATA%/com.electro.cessionapp/`

## Troubleshooting

### Common Issues

#### 1. "Java not found" Error
**Solution**: Install Java 17+ and ensure it's in your PATH
```powershell
java -version  # Should show Java 17 or higher
```

#### 2. Backend JAR Not Found
**Solution**: Ensure the backend is built and JAR is copied
```powershell
# Check if JAR exists
Test-Path "backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar"

# Rebuild if needed
cd backend && mvn clean package -DskipTests
```

#### 3. Frontend Build Fails
**Solution**: Clear node_modules and reinstall
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

#### 4. Tauri Build Fails
**Solution**: Update Rust and clear Tauri cache
```powershell
rustup update
cd frontend/src-tauri
cargo clean
cd ../..
```

#### 5. Backend Connection Issues
**Solution**: Check if backend is starting properly
- Look for logs in the app data directory
- Ensure port 8082 is not blocked by firewall
- Check if H2 database files are accessible

### Debug Mode

To run with detailed logging:

```powershell
# Set environment variable for detailed logs
$env:RUST_LOG="debug"
cd frontend
npm run tauri dev
```

### Manual Backend Testing

To test the backend separately:
```powershell
cd backend
mvn spring-boot:run
# Backend should start on http://localhost:8082
```

## Configuration

### Backend Configuration
- **Port**: 8082 (configured in `application.properties`)
- **Database**: H2 file-based database
- **Data Directory**: User's app data folder

### Frontend Configuration
- **API URL**: `http://localhost:8082` (configured in `config.js`)
- **Development Port**: 5173

### Tauri Configuration
- **Window Size**: 1200x800 (minimum 800x600)
- **Bundle Resources**: Spring Boot JAR included
- **Permissions**: File system, networking, process management

## Customization

### Changing App Icon
Replace icons in `frontend/src-tauri/icons/` with your custom icons.

### Modifying App Metadata
Edit `frontend/src-tauri/tauri.conf.json`:
- `productName`: App display name
- `identifier`: Unique app identifier
- `version`: App version

### Database Configuration
Modify `backend/src/main/resources/application.properties` for database settings.

## Distribution

### Creating Installer
The build process creates a Windows MSI installer in:
`frontend/src-tauri/target/release/bundle/msi/`

### Portable Executable
A standalone executable is created at:
`frontend/src-tauri/target/release/cession-app-frontend.exe`

## Security Notes

- The app runs the Spring Boot backend as a child process
- Database files are stored in the user's app data directory
- Network communication is limited to localhost
- File system access is restricted to app data directories

## Performance Tips

1. **First Launch**: May take longer as the database initializes
2. **Subsequent Launches**: Should be faster with cached data
3. **Memory Usage**: Typical usage ~200-400MB (includes JVM)
4. **Disk Space**: ~50-100MB for app + variable for database

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review logs in the app data directory
3. Test backend and frontend separately
4. Ensure all prerequisites are installed correctly