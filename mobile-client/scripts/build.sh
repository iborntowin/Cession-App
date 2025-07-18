#!/bin/bash

# Mobile App Build Script
# Usage: ./scripts/build.sh [environment] [platform]
# Example: ./scripts/build.sh production ios

set -e

ENVIRONMENT=${1:-development}
PLATFORM=${2:-all}

echo "🚀 Building Cession Manager Mobile App"
echo "Environment: $ENVIRONMENT"
echo "Platform: $PLATFORM"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|preview|production)$ ]]; then
    echo "❌ Invalid environment. Use: development, preview, or production"
    exit 1
fi

# Validate platform
if [[ ! "$PLATFORM" =~ ^(ios|android|all)$ ]]; then
    echo "❌ Invalid platform. Use: ios, android, or all"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Login check
echo "🔐 Checking EAS authentication..."
if ! eas whoami &> /dev/null; then
    echo "Please login to EAS:"
    eas login
fi

# Set environment variables based on environment
case $ENVIRONMENT in
    development)
        export NODE_ENV=development
        ;;
    preview)
        export NODE_ENV=staging
        ;;
    production)
        export NODE_ENV=production
        ;;
esac

# Start build
echo "🔨 Starting build process..."
npm run build:${ENVIRONMENT}:${PLATFORM}

echo "✅ Build completed successfully!"
echo "📱 Check your EAS dashboard for build status: https://expo.dev"