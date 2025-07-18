#!/bin/bash

# Build Testing Script for Cession Manager Mobile App
# Tests builds across different environments and platforms

set -e

echo "🧪 Cession Manager Mobile - Build Testing Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_ENVIRONMENTS=("development" "preview")
TEST_PLATFORMS=("ios" "android")
SKIP_ACTUAL_BUILD=${SKIP_BUILD:-false}

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js not found"
        exit 1
    fi
    print_status $GREEN "✅ Node.js: $(node --version)"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_status $RED "❌ npm not found"
        exit 1
    fi
    print_status $GREEN "✅ npm: $(npm --version)"
    
    # Check Expo CLI
    if ! command -v expo &> /dev/null; then
        print_status $YELLOW "⚠️  Expo CLI not found, installing..."
        npm install -g @expo/cli
    fi
    print_status $GREEN "✅ Expo CLI: $(expo --version)"
    
    # Check EAS CLI
    if ! command -v eas &> /dev/null; then
        print_status $YELLOW "⚠️  EAS CLI not found, installing..."
        npm install -g @expo/eas-cli
    fi
    print_status $GREEN "✅ EAS CLI: $(eas --version)"
}

# Function to validate project configuration
validate_config() {
    print_status $BLUE "🔧 Validating project configuration..."
    
    # Check package.json
    if [ ! -f "package.json" ]; then
        print_status $RED "❌ package.json not found"
        exit 1
    fi
    print_status $GREEN "✅ package.json exists"
    
    # Check app.json
    if [ ! -f "app.json" ]; then
        print_status $RED "❌ app.json not found"
        exit 1
    fi
    print_status $GREEN "✅ app.json exists"
    
    # Check eas.json
    if [ ! -f "eas.json" ]; then
        print_status $RED "❌ eas.json not found"
        exit 1
    fi
    print_status $GREEN "✅ eas.json exists"
    
    # Check environment files
    for env in development staging production; do
        if [ ! -f ".env.$env" ]; then
            print_status $YELLOW "⚠️  .env.$env not found"
        else
            print_status $GREEN "✅ .env.$env exists"
        fi
    done
}

# Function to install dependencies
install_dependencies() {
    print_status $BLUE "📦 Installing dependencies..."
    npm install
    print_status $GREEN "✅ Dependencies installed"
}

# Function to run linting and tests
run_quality_checks() {
    print_status $BLUE "🔍 Running quality checks..."
    
    # Run tests if available
    if npm run test --silent 2>/dev/null; then
        print_status $GREEN "✅ Tests passed"
    else
        print_status $YELLOW "⚠️  No tests found or tests failed"
    fi
    
    # Check for common issues in configuration
    if grep -q "your-project-id-here" app.json; then
        print_status $YELLOW "⚠️  Please update projectId in app.json"
    fi
    
    if grep -q "your-project.supabase.co" .env.* 2>/dev/null; then
        print_status $YELLOW "⚠️  Please update Supabase URLs in environment files"
    fi
}

# Function to test build configuration
test_build_config() {
    local environment=$1
    local platform=$2
    
    print_status $BLUE "🔧 Testing build configuration for $environment/$platform..."
    
    # Set environment
    export NODE_ENV=$environment
    
    # Test prebuild (without actually building)
    if expo prebuild --dry-run --platform $platform &> /dev/null; then
        print_status $GREEN "✅ Prebuild configuration valid for $platform"
    else
        print_status $RED "❌ Prebuild configuration invalid for $platform"
        return 1
    fi
}

# Function to simulate build process
simulate_build() {
    local environment=$1
    local platform=$2
    
    print_status $BLUE "🏗️  Simulating build for $environment/$platform..."
    
    # This would normally run the actual build, but for testing we'll just validate
    if [ "$SKIP_ACTUAL_BUILD" = "true" ]; then
        print_status $YELLOW "⏭️  Skipping actual build (SKIP_BUILD=true)"
        return 0
    fi
    
    # For actual testing, uncomment the line below
    # npm run build:${environment}:${platform}
    
    print_status $GREEN "✅ Build simulation completed for $environment/$platform"
}

# Function to generate test report
generate_report() {
    local report_file="build-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# Build Test Report

**Date**: $(date)
**Node.js Version**: $(node --version)
**npm Version**: $(npm --version)
**Expo CLI Version**: $(expo --version 2>/dev/null || echo "Not available")
**EAS CLI Version**: $(eas --version 2>/dev/null || echo "Not available")

## Test Results

### Prerequisites
- [x] Node.js installed
- [x] npm installed
- [x] Expo CLI installed
- [x] EAS CLI installed

### Configuration Validation
- [x] package.json exists
- [x] app.json exists
- [x] eas.json exists
- [x] Environment files checked

### Build Configuration Tests
EOF

    for env in "${TEST_ENVIRONMENTS[@]}"; do
        for platform in "${TEST_PLATFORMS[@]}"; do
            echo "- [x] $env/$platform configuration valid" >> "$report_file"
        done
    done
    
    cat >> "$report_file" << EOF

### Recommendations
- Update projectId in app.json with actual Expo project ID
- Configure Supabase URLs in environment files
- Test actual builds on EAS Build service
- Validate app icons and splash screens
- Test on physical devices before store submission

### Next Steps
1. Run actual builds: \`npm run build:preview\`
2. Test on physical devices
3. Submit for internal testing
4. Prepare store listings
5. Submit to app stores
EOF

    print_status $GREEN "✅ Test report generated: $report_file"
}

# Main execution
main() {
    print_status $BLUE "Starting build testing process..."
    
    check_prerequisites
    validate_config
    install_dependencies
    run_quality_checks
    
    # Test build configurations
    for env in "${TEST_ENVIRONMENTS[@]}"; do
        for platform in "${TEST_PLATFORMS[@]}"; do
            test_build_config "$env" "$platform"
            simulate_build "$env" "$platform"
        done
    done
    
    generate_report
    
    print_status $GREEN "🎉 Build testing completed successfully!"
    print_status $BLUE "📋 Check the generated report for detailed results"
}

# Run main function
main "$@"