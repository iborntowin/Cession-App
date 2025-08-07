# 🚀 Cession Manager Mobile App Deployment Guide

This guide covers the complete deployment process for the Cession Manager Mobile App, including icon updates and APK generation.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js** (v18 or later)
- **npm** (latest version)
- **EAS CLI** (will be installed automatically)
- **Expo account** (free at [expo.dev](https://expo.dev))

## 🔧 Quick Setup

Run the setup script to install all prerequisites:

```powershell
.\setup-deployment.ps1
```

This script will:
- ✅ Check Node.js and npm installation
- 📥 Install/update EAS CLI
- 📦 Install project dependencies
- 🔐 Help you login to EAS
- 📱 Update icons from the desktop app

## 🏗️ Deployment Options

### Option 1: Quick APK Build (Recommended for Testing)

For a quick APK build with updated icons:

```powershell
# Preview build (recommended for testing)
.\build-apk.ps1

# Development build
.\build-apk.ps1 -Environment development

# Production build
.\build-apk.ps1 -Environment production
```

### Option 2: Full Deployment Pipeline

For a complete deployment with all options:

```powershell
# Preview build for Android
.\deploy-mobile-app.ps1 -Environment preview -Platform android

# Production build for both platforms
.\deploy-mobile-app.ps1 -Environment production -Platform all

# Production build with store submission
.\deploy-mobile-app.ps1 -Environment production -Platform android -SubmitToStore
```

## 📱 Build Environments

### Development
- **Purpose**: Internal testing and debugging
- **Features**: Development client enabled, debug symbols
- **Output**: APK for sideloading

### Preview
- **Purpose**: Testing and QA
- **Features**: Production-like build, internal distribution
- **Output**: APK for testing

### Production
- **Purpose**: App store release
- **Features**: Optimized, signed for store submission
- **Output**: App bundle for Google Play, IPA for App Store

## 🎨 Icon Management

The deployment scripts automatically update mobile app icons from the desktop app:

- **Source**: `frontend/src-tauri/icons/icon.png`
- **Targets**:
  - `assets/icon.png` (main app icon)
  - `assets/adaptive-icon.png` (Android adaptive icon)
  - `assets/splash-icon.png` (splash screen)
  - `assets/favicon.png` (web favicon)

To skip icon updates:
```powershell
.\deploy-mobile-app.ps1 -UpdateIcons:$false
```

## 📦 Build Process

The deployment process includes:

1. **Icon Update** - Copies icons from desktop app
2. **Dependency Installation** - Ensures all packages are up to date
3. **Testing** - Runs test suite (can be skipped with `-SkipTests`)
4. **Cache Clearing** - Removes old build artifacts
5. **Environment Setup** - Configures build environment
6. **Building** - Creates the app package using EAS Build
7. **Store Submission** - Optionally submits to app stores

## 🔍 Monitoring Builds

After starting a build:

1. **EAS Dashboard**: Visit [expo.dev](https://expo.dev) to monitor progress
2. **Build Logs**: View detailed logs in the EAS dashboard
3. **Download**: Get the APK/IPA when build completes
4. **Testing**: Install on devices for testing

## 📱 Testing the APK

Once your APK is built:

1. **Download** the APK from the EAS dashboard
2. **Enable** "Install unknown apps" on your Android device
3. **Install** the APK file
4. **Test** all functionality, especially:
   - Data loading from Supabase
   - Offline functionality
   - Navigation between screens
   - Search and filtering

## 🏪 Store Submission

### Google Play Store

For production builds:
```powershell
# Build and submit automatically
.\deploy-mobile-app.ps1 -Environment production -Platform android -SubmitToStore

# Or submit manually after build
eas submit --platform android --latest
```

### Apple App Store

For iOS builds:
```powershell
# Build and submit automatically
.\deploy-mobile-app.ps1 -Environment production -Platform ios -SubmitToStore

# Or submit manually after build
eas submit --platform ios --latest
```

## 🛠️ Troubleshooting

### Common Issues

**Build fails with authentication error:**
```powershell
eas login
```

**Icons not updating:**
- Check that `frontend/src-tauri/icons/icon.png` exists
- Ensure you're running from the `mobile-client` directory

**Build takes too long:**
- This is normal for first builds (can take 10-20 minutes)
- Subsequent builds are faster due to caching

**APK not installing:**
- Enable "Install unknown apps" in Android settings
- Check that the APK downloaded completely

### Getting Help

1. **EAS Documentation**: [docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)
2. **Expo Forums**: [forums.expo.dev](https://forums.expo.dev)
3. **Build Logs**: Check the EAS dashboard for detailed error messages

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Test the app thoroughly in preview mode
- [ ] Verify all icons are updated and display correctly
- [ ] Check app functionality on different screen sizes
- [ ] Test offline functionality
- [ ] Verify data synchronization works
- [ ] Update version number in `app.json`
- [ ] Review app store listing information
- [ ] Prepare release notes

## 🚀 Quick Commands Reference

```powershell
# Setup everything
.\setup-deployment.ps1

# Quick APK for testing
.\build-apk.ps1

# Full deployment
.\deploy-mobile-app.ps1

# Production release
.\deploy-mobile-app.ps1 -Environment production -Platform android -SubmitToStore
```

---

**Happy Deploying! 🎉**

For questions or issues, check the troubleshooting section above or refer to the EAS documentation.