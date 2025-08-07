# Tauri Android APK Build Guide

This guide provides step-by-step instructions to build Android APKs from your Tauri project.

## 🚀 Quick Start

1. **Install Android Studio** (if not already installed)
2. **Set up environment**: `.\setup-android-env.ps1` (run as Administrator)
3. **Restart your terminal**
4. **Validate setup**: `.\validate-android-setup.ps1`
5. **Build APK**: `.\final-android-build.ps1`

## 📋 Prerequisites

### Required Software
- ✅ **Java 21** (already installed)
- ✅ **Tauri CLI 2.5.0** (already installed)
- ✅ **Rust & Cargo** (already installed)
- ❓ **Android Studio** (needs installation)
- ❓ **Android SDK** (comes with Android Studio)

### Environment Variables
After installing Android Studio, these must be set:
- `ANDROID_HOME` - Path to Android SDK
- `JAVA_HOME` - Path to Java installation (already set)
- `PATH` - Must include Android SDK tools

## 🛠️ Detailed Setup

### 1. Install Android Studio
1. Download from: https://developer.android.com/studio
2. Install with default settings
3. Complete the setup wizard
4. Install these SDK components:
   - Android SDK Platform-Tools
   - Android SDK Build-Tools (latest)
   - Android SDK Platform (API 33+)
   - Android NDK (optional but recommended)

### 2. Set Environment Variables
Run as Administrator:
```powershell
.\setup-android-env.ps1
```

### 3. Validate Setup
```powershell
.\validate-android-setup.ps1
```

## 🏗️ Building APKs

### Debug Build (for testing)
```powershell
.\final-android-build.ps1 -Debug
```

### Release Build (for distribution)
```powershell
.\final-android-build.ps1
```

### Clean Build (removes previous builds)
```powershell
.\final-android-build.ps1 -Clean
```

### Build and Install
```powershell
.\final-android-build.ps1 -Install
```

### Build and Test
```powershell
.\final-android-build.ps1 -Test
```

## 📱 Testing APKs

### Install APK on Device
```powershell
.\test-android-apk.ps1 -Install
```

### Launch App
```powershell
.\test-android-apk.ps1 -Launch
```

### View Logs
```powershell
.\test-android-apk.ps1 -Logs
```

### Uninstall App
```powershell
.\test-android-apk.ps1 -Uninstall
```

## 🔧 Development Mode

For active development with hot reload:
```powershell
.\dev-android.ps1
```

This will:
- Start the frontend dev server
- Build and install the app on your device
- Enable hot reload for rapid development

## 📁 File Locations

After a successful build, you'll find:
- **APK files**: `frontend/src-tauri/gen/android/app/build/outputs/apk/`
- **Android project**: `frontend/src-tauri/gen/android/`
- **Build logs**: Terminal output and Android Studio logs

## 🐛 Troubleshooting

### Common Issues

#### "ANDROID_HOME not set"
- Install Android Studio
- Run `.\setup-android-env.ps1` as Administrator
- Restart terminal

#### "No devices found"
- Connect Android device via USB
- Enable Developer Options and USB Debugging
- Or start Android emulator

#### "Build failed"
- Check `.\validate-android-setup.ps1` output
- Ensure all SDK components are installed
- Verify device is connected: `adb devices`

#### "Permission denied"
- Enable USB Debugging on device
- Accept RSA key fingerprint prompt
- Check device is in Developer Mode

### Getting Help

1. Run validation: `.\validate-android-setup.ps1`
2. Check logs: `.\test-android-apk.ps1 -Logs`
3. Verify environment variables are set correctly
4. Ensure Android device is properly connected

## 📊 Build Configuration

### Current Settings
- **Package Name**: `com.nassimmaaoui.cessionapp`
- **Min SDK**: 24 (Android 7.0)
- **Target SDK**: 34 (Android 14)
- **Compile SDK**: 34

### Permissions
- Internet access
- Network state access
- External storage (read/write)

## 🎯 Next Steps

After successful APK generation:

1. **Test thoroughly** on different devices
2. **Optimize performance** for mobile
3. **Sign APK** for Play Store distribution
4. **Generate AAB** for Play Store upload
5. **Set up CI/CD** for automated builds

## 📚 Additional Resources

- [Tauri Mobile Guide](https://tauri.app/v1/guides/building/mobile)
- [Android Developer Documentation](https://developer.android.com/docs)
- [Tauri Configuration](https://tauri.app/v1/api/config)