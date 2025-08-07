# Android APK Build Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Issue: "ADB not found" or "Build-tools not found"

**Cause**: Android SDK components are missing or not properly installed.

**Solutions** (try in order):

1. **Quick Fix**:
   ```powershell
   .\fix-android-sdk.ps1
   ```

2. **Complete Setup**:
   ```powershell
   .\install-android-sdk.ps1
   ```

3. **Manual Installation**:
   - Open Android Studio
   - Go to `Tools > SDK Manager`
   - Install these components:
     - ✅ Android SDK Platform-Tools
     - ✅ Android SDK Build-Tools (34.0.0 or latest)
     - ✅ Android 14 (API 34)
     - ✅ Android 13 (API 33)

### Issue: "ANDROID_HOME not set"

**Cause**: Environment variables not configured.

**Solution**:
```powershell
# Run as Administrator
.\setup-android-env.ps1
# Then restart your terminal
```

**Manual Setup**:
1. Find your Android SDK path (usually `%LOCALAPPDATA%\Android\Sdk`)
2. Set environment variables:
   - `ANDROID_HOME` = SDK path
   - `ANDROID_SDK_ROOT` = SDK path
   - Add to `PATH`: `%ANDROID_HOME%\platform-tools`

### Issue: "No devices found"

**Cause**: No Android device connected or emulator running.

**Solutions**:

1. **Physical Device**:
   - Enable Developer Options on your Android device
   - Enable USB Debugging
   - Connect via USB
   - Accept RSA key fingerprint when prompted

2. **Android Emulator**:
   - Open Android Studio
   - Go to `Tools > AVD Manager`
   - Create a new Virtual Device
   - Start the emulator

3. **Verify Connection**:
   ```powershell
   adb devices
   ```

### Issue: "Build failed" or "Compilation errors"

**Cause**: Various build-related issues.

**Solutions**:

1. **Clean Build**:
   ```powershell
   .\final-android-build.ps1 -Clean
   ```

2. **Check Dependencies**:
   ```powershell
   cd frontend
   npm install
   ```

3. **Update Rust Targets**:
   ```powershell
   rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
   ```

4. **Verify Tauri Version**:
   ```powershell
   cd frontend
   tauri --version
   # Should be 2.5.0 or higher
   ```

### Issue: "Permission denied" or "Access denied"

**Cause**: Insufficient permissions or device security settings.

**Solutions**:

1. **Run as Administrator**:
   - Right-click PowerShell
   - Select "Run as Administrator"

2. **Device Settings**:
   - Enable Developer Options
   - Enable USB Debugging
   - Disable USB verification if present

3. **Windows Security**:
   - Add exclusions for your project folder in Windows Defender
   - Temporarily disable antivirus during build

### Issue: "Java not found" or Java version issues

**Cause**: Java not installed or wrong version.

**Current Status**: ✅ Java 21 is already installed

**If issues persist**:
```powershell
java -version
echo $env:JAVA_HOME
```

### Issue: "Rust compilation errors"

**Cause**: Missing Rust targets or outdated toolchain.

**Solutions**:

1. **Add Android Targets**:
   ```powershell
   rustup target add aarch64-linux-android
   rustup target add armv7-linux-androideabi
   rustup target add i686-linux-android
   rustup target add x86_64-linux-android
   ```

2. **Update Rust**:
   ```powershell
   rustup update
   ```

3. **Check Rust Version**:
   ```powershell
   rustc --version
   # Should be 1.77.2 or higher
   ```

### Issue: "Frontend build failed"

**Cause**: Frontend dependencies or build configuration issues.

**Solutions**:

1. **Clean Install**:
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

2. **Check Node Version**:
   ```powershell
   node --version
   npm --version
   ```

3. **Build Frontend Separately**:
   ```powershell
   cd frontend
   npm run build
   ```

### Issue: "Backend JAR not found"

**Cause**: Backend not built or JAR not copied correctly.

**Solutions**:

1. **Build Backend**:
   ```powershell
   cd backend
   mvn clean package -DskipTests
   ```

2. **Copy JAR Manually**:
   ```powershell
   Copy-Item backend/target/cession-app-backend-0.0.1-SNAPSHOT.jar frontend/src-tauri/backend/
   ```

## 🔍 Diagnostic Commands

Run these to gather information for troubleshooting:

```powershell
# Environment check
.\validate-android-setup.ps1

# Check versions
java -version
rustc --version
node --version
cd frontend && tauri --version

# Check environment variables
echo $env:ANDROID_HOME
echo $env:JAVA_HOME
echo $env:PATH

# Check connected devices
adb devices

# Check Android SDK components
dir "$env:ANDROID_HOME\platform-tools"
dir "$env:ANDROID_HOME\build-tools"
dir "$env:ANDROID_HOME\platforms"
```

## 🆘 Getting Help

If you're still having issues:

1. **Run full validation**:
   ```powershell
   .\validate-android-setup.ps1 > validation-report.txt
   ```

2. **Check build logs** in the terminal output

3. **Common solutions summary**:
   - Install Android Studio with SDK components
   - Set environment variables correctly
   - Connect Android device or start emulator
   - Run scripts as Administrator when needed
   - Restart terminal after environment changes

## 📱 Device-Specific Issues

### Samsung Devices
- May require Samsung USB drivers
- Enable "USB Debugging" in Developer Options
- Disable "USB verification" if present

### Xiaomi/MIUI Devices
- Enable "USB Debugging (Security Settings)"
- Turn off MIUI optimization
- Enable "Install via USB"

### Huawei Devices
- Install HiSuite for drivers
- Enable "USB Debugging" and "Allow ADB debugging in charge only mode"

## 🔄 Reset Everything

If all else fails, complete reset:

```powershell
# 1. Uninstall Android Studio
# 2. Delete SDK folder: %LOCALAPPDATA%\Android
# 3. Clear environment variables
# 4. Restart computer
# 5. Run: .\install-android-sdk.ps1
```