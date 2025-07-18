# Cession Manager Mobile App - Deployment Guide

## Overview

This guide covers the deployment process for the Cession Manager Mobile App built with React Native and Expo.

## Prerequisites

### Required Tools
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g @expo/eas-cli`)

### Accounts Required
- Expo account (free tier available)
- Apple Developer Account (for iOS builds - $99/year)
- Google Play Console Account (for Android builds - $25 one-time fee)

## Environment Setup

### 1. Environment Variables

Copy the appropriate environment file for your target environment:

```bash
# For development
cp .env.development .env

# For staging
cp .env.staging .env

# For production
cp .env.production .env
```

Update the environment variables with your actual values:

- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_BUCKET_NAME`: Storage bucket name for exports
- `EXPO_PUBLIC_API_BASE_URL`: Backend API URL

### 2. EAS Configuration

1. Login to EAS:
```bash
eas login
```

2. Configure your project:
```bash
eas build:configure
```

3. Update `app.json` with your project ID:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

## Build Process

### Development Builds

Development builds include debugging tools and are suitable for testing:

```bash
# All platforms
npm run build:dev

# iOS only
npm run build:dev:ios

# Android only
npm run build:dev:android
```

### Preview Builds

Preview builds are optimized but still include some debugging capabilities:

```bash
# All platforms
npm run build:preview

# iOS only
npm run build:preview:ios

# Android only
npm run build:preview:android
```

### Production Builds

Production builds are fully optimized for app store submission:

```bash
# All platforms
npm run build:prod

# iOS only
npm run build:prod:ios

# Android only
npm run build:prod:android
```

### Using Build Scripts

For convenience, use the provided build scripts:

**Linux/macOS:**
```bash
chmod +x scripts/build.sh
./scripts/build.sh production ios
```

**Windows:**
```cmd
scripts\build.bat production ios
```

## App Store Submission

### iOS App Store

1. Build for production:
```bash
npm run build:prod:ios
```

2. Submit to App Store:
```bash
npm run submit:ios
```

3. Follow the prompts to upload to App Store Connect

### Google Play Store

1. Build for production:
```bash
npm run build:prod:android
```

2. Submit to Google Play:
```bash
npm run submit:android
```

3. Follow the prompts to upload to Google Play Console

## Build Profiles

### Development Profile
- **Purpose**: Internal testing and development
- **Output**: APK (Android), Development build (iOS)
- **Features**: Debugging enabled, development client

### Preview Profile
- **Purpose**: Beta testing and stakeholder review
- **Output**: APK (Android), Ad-hoc distribution (iOS)
- **Features**: Optimized but with some debugging

### Production Profile
- **Purpose**: App store submission
- **Output**: AAB (Android), App Store build (iOS)
- **Features**: Fully optimized, no debugging

## Environment-Specific Configurations

### Development
- Local backend API
- Debug logging enabled
- Shorter cache expiry
- Development Supabase project

### Staging
- Staging backend API
- Info-level logging
- Medium cache expiry
- Staging Supabase project

### Production
- Production backend API
- Error-only logging
- Full cache expiry
- Production Supabase project

## Troubleshooting

### Common Issues

1. **Build fails with "Project not configured"**
   - Run `eas build:configure`
   - Ensure `projectId` is set in `app.json`

2. **Environment variables not loading**
   - Ensure variables start with `EXPO_PUBLIC_`
   - Check `.env` file is in the correct location
   - Restart the development server

3. **iOS build fails with provisioning profile errors**
   - Ensure Apple Developer account is active
   - Check bundle identifier matches your Apple Developer account
   - Run `eas credentials` to manage certificates

4. **Android build fails with signing errors**
   - EAS handles Android signing automatically
   - Check if Google Play Console account is properly configured

### Getting Help

- Check build logs in EAS dashboard
- Review Expo documentation: https://docs.expo.dev/
- Check EAS Build documentation: https://docs.expo.dev/build/introduction/

## Monitoring and Updates

### Over-the-Air Updates

For non-native changes, use Expo Updates:

```bash
# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

### Build Monitoring

Monitor builds through:
- EAS Dashboard: https://expo.dev/
- Build notifications via email
- Slack/Discord webhooks (configurable)

## Security Considerations

- Never commit `.env` files with real credentials
- Use different Supabase projects for each environment
- Regularly rotate API keys and certificates
- Enable two-factor authentication on all accounts

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Monitor build success rates
- Review crash reports
- Update certificates before expiry
- Test on latest iOS/Android versions

### Version Management
- Follow semantic versioning (1.0.0)
- Update `version` in `app.json`
- Update `versionCode` (Android) and `buildNumber` (iOS)
- Tag releases in version control