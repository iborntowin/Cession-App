# Cession Management App - Production Deployment Guide

## Overview

This guide covers the complete production deployment process for the Cession Management App, a desktop application built with Tauri, Svelte, and Spring Boot.

## System Requirements

### Development Environment
- **Node.js**: 18.x or higher
- **Rust**: Latest stable version
- **Java**: JDK 17 or higher
- **Maven**: 3.8.x or higher
- **PowerShell**: 5.1 or higher (Windows)

### Target System Requirements
- **Windows**: 10 or later (64-bit)
- **macOS**: 10.13 or later
- **Linux**: Ubuntu 18.04+ / CentOS 7+ / Fedora 30+
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Java Runtime**: JRE 17+ (auto-prompted if missing)

## Pre-Build Checklist

### 1. Environment Validation
```powershell
# Check all required tools
java -version          # Should show Java 17+
mvn -version          # Should show Maven 3.8+
node --version        # Should show Node 18+
rustc --version       # Should show latest Rust
npm --version         # Should show npm 8+
```

### 2. Code Quality Checks
```powershell
# Run tests
cd backend && mvn test
cd ../frontend && npm test

# Check code quality
cd frontend && npm run check
```

### 3. Security Review
- [ ] Remove all development keys and secrets
- [ ] Verify CSP (Content Security Policy) settings
- [ ] Check for hardcoded credentials
- [ ] Validate API endpoints and CORS settings

## Production Build Process

### Option 1: Automated Production Build (Recommended)
```powershell
# Run the comprehensive production build script
.\build-production.ps1 -Clean -Target "all"

# For Windows-only build
.\build-production.ps1 -Clean -Target "windows"

# Skip tests for faster build
.\build-production.ps1 -Clean -SkipTests -Target "all"
```

### Option 2: Manual Step-by-Step Build
```powershell
# 1. Build Backend
cd backend
mvn clean package -DskipTests -Dspring.profiles.active=production
cd ..

# 2. Copy JAR to Tauri resources
mkdir -p frontend/src-tauri/backend
copy backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar frontend/src-tauri/backend/

# 3. Build Frontend
cd frontend
npm ci --production=false
npm run build:production

# 4. Build Tauri App
npm run tauri build
cd ..
```

## Build Artifacts

After a successful build, you'll find the following artifacts:

### Windows
- **Executable**: `frontend/src-tauri/target/release/cession-app-frontend.exe`
- **MSI Installer**: `frontend/src-tauri/target/release/bundle/msi/*.msi`
- **NSIS Installer**: `frontend/src-tauri/target/release/bundle/nsis/*.exe`

### macOS
- **App Bundle**: `frontend/src-tauri/target/release/bundle/macos/*.app`
- **DMG**: `frontend/src-tauri/target/release/bundle/dmg/*.dmg`

### Linux
- **AppImage**: `frontend/src-tauri/target/release/bundle/appimage/*.AppImage`
- **DEB Package**: `frontend/src-tauri/target/release/bundle/deb/*.deb`
- **RPM Package**: `frontend/src-tauri/target/release/bundle/rpm/*.rpm`

## Distribution Package

The production build script creates a complete distribution package in `dist-production/` containing:

- Installation files for all platforms
- Documentation and installation instructions
- Checksums for integrity verification
- System requirements and troubleshooting guide

## Deployment Strategies

### 1. Direct Distribution
- Distribute the installer files directly to end users
- Provide installation instructions and system requirements
- Include troubleshooting guide for common issues

### 2. Enterprise Deployment
- Use MSI for Windows domain deployment via Group Policy
- Create custom installation scripts for bulk deployment
- Set up centralized logging and monitoring

### 3. Auto-Update Setup (Future Enhancement)
- Configure Tauri's built-in updater
- Set up update server and signing keys
- Implement delta updates for efficiency

## Installation Process

### Windows Installation
1. **MSI Installer** (Recommended)
   - Double-click the `.msi` file
   - Follow the installation wizard
   - Application installs to `Program Files`
   - Creates Start Menu shortcuts

2. **NSIS Installer**
   - Run the `.exe` installer
   - Choose installation directory
   - Select additional components

3. **Portable Executable**
   - Extract `cession-app-frontend.exe`
   - Run directly (no installation required)
   - Creates data directory in `%APPDATA%`

### First Run Experience
1. Application launches and initializes
2. Backend service starts automatically
3. Health check validates all systems
4. User sees "System Ready" status
5. Login screen becomes available

## Configuration Management

### Application Data Locations
- **Windows**: `%APPDATA%\com.electro.cessionapp\`
- **macOS**: `~/Library/Application Support/com.electro.cessionapp/`
- **Linux**: `~/.local/share/com.electro.cessionapp/`

### Directory Structure
```
com.electro.cessionapp/
├── data/           # Database files
├── logs/           # Application logs
├── backups/        # Database backups
├── temp/           # Temporary files
└── uploads/        # File uploads
```

### Configuration Files
- **Backend Config**: Embedded in JAR, overridable via environment
- **Frontend Config**: Compiled into application
- **User Preferences**: Stored in application data directory

## Monitoring and Logging

### Log Files
- **Application Log**: `logs/app.log`
- **Backend Log**: `logs/backend.log`
- **Error Log**: `logs/errors.log`
- **Structured Log**: `logs/structured.jsonl`

### Health Monitoring
- Built-in health check system
- Real-time status monitoring
- Automatic error recovery
- Diagnostic information collection

### Performance Metrics
- Application startup time
- Memory usage monitoring
- Database performance
- Network connectivity status

## Troubleshooting

### Common Issues

#### Java Not Found
**Symptoms**: Application fails to start, "Java not found" error
**Solution**: 
1. Install Java 17+ from [Adoptium](https://adoptium.net/temurin/releases/)
2. Restart the application
3. Verify installation: `java -version`

#### Port Conflicts
**Symptoms**: "Port already in use" error
**Solution**:
1. Application automatically tries alternative ports
2. Close conflicting applications
3. Restart computer if necessary

#### Database Issues
**Symptoms**: "Database connection failed"
**Solution**:
1. Application attempts automatic repair
2. Check disk space and permissions
3. Use "Repair Database" option in error dialog

#### Permission Errors
**Symptoms**: "Permission denied" errors
**Solution**:
1. Run as administrator (Windows)
2. Check file/folder permissions
3. Temporarily disable antivirus

### Diagnostic Tools
- Built-in error analysis and recovery
- Log export functionality
- System information collection
- Health status monitoring

## Security Considerations

### Application Security
- CSP (Content Security Policy) enabled
- Local-only backend binding
- Secure data directory permissions
- No external network access required

### Data Protection
- Database files encrypted at rest
- Automatic backup creation
- Secure temporary file handling
- User data isolation

### Update Security
- Signed installers (when configured)
- Integrity verification via checksums
- Secure update channels (future)

## Performance Optimization

### Build Optimizations
- Code minification and tree-shaking
- Asset optimization and compression
- Chunk splitting for faster loading
- Production-only dependencies

### Runtime Optimizations
- JVM tuning for desktop usage
- Memory management and garbage collection
- Database connection pooling
- Efficient health monitoring

## Support and Maintenance

### User Support
- Built-in troubleshooting guides
- Automatic error reporting
- Log export for technical support
- Progressive error disclosure

### Maintenance Tasks
- Regular log cleanup
- Database backup management
- Performance monitoring
- Security updates

## Version Management

### Current Version: 1.0.0
- Initial production release
- Full feature set implemented
- Comprehensive error handling
- Production-ready stability

### Future Versions
- Auto-update mechanism
- Enhanced monitoring
- Additional platform support
- Performance improvements

## Contact Information

- **Technical Support**: support@example.com
- **Documentation**: https://docs.example.com
- **Issue Tracking**: https://github.com/example/cession-app/issues

---

*This deployment guide is maintained alongside the application and should be updated with each release.*