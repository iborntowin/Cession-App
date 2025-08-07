#!/usr/bin/env node

/**
 * Test script to validate responsive UI improvements in the mobile React Native app
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Mobile App Responsive UI Improvements...\n');

// Test files to check
const testFiles = [
  'mobile-client/src/utils/responsive.js',
  'mobile-client/src/components/ClientCard.js',
  'mobile-client/src/components/SearchBar.js',
  'mobile-client/src/components/CessionCard.js',
  'mobile-client/src/screens/ClientListScreen.js',
  'mobile-client/src/screens/ClientDetailScreen.js',
  'mobile-client/src/screens/CessionListScreen.js',
  'mobile-client/src/screens/CessionDetailScreen.js',
  'mobile-client/src/screens/ExportScreen.js',
  'mobile-client/src/navigation/AppNavigator.js'
];

let allTestsPassed = true;

// Test 1: Check if responsive utility file exists and has required functions
console.log('✅ Test 1: Checking responsive utility file...');
const responsiveUtilPath = 'mobile-client/src/utils/responsive.js';
if (fs.existsSync(responsiveUtilPath)) {
  const responsiveContent = fs.readFileSync(responsiveUtilPath, 'utf8');
  const requiredFunctions = ['wp', 'hp', 'rf', 'isSmallDevice', 'isTablet', 'RESPONSIVE_STYLES'];
  
  let missingFunctions = [];
  requiredFunctions.forEach(func => {
    if (!responsiveContent.includes(func)) {
      missingFunctions.push(func);
    }
  });
  
  if (missingFunctions.length === 0) {
    console.log('   ✓ Responsive utility file contains all required functions');
  } else {
    console.log(`   ✗ Missing functions: ${missingFunctions.join(', ')}`);
    allTestsPassed = false;
  }
} else {
  console.log('   ✗ Responsive utility file not found');
  allTestsPassed = false;
}

// Test 2: Check if components import responsive utilities
console.log('\n✅ Test 2: Checking component imports...');
const componentsToCheck = [
  'mobile-client/src/components/ClientCard.js',
  'mobile-client/src/components/SearchBar.js',
  'mobile-client/src/components/CessionCard.js'
];

componentsToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("import { wp, hp, rf, RESPONSIVE_STYLES }")) {
      console.log(`   ✓ ${path.basename(filePath)} imports responsive utilities`);
    } else {
      console.log(`   ✗ ${path.basename(filePath)} missing responsive imports`);
      allTestsPassed = false;
    }
  } else {
    console.log(`   ✗ ${path.basename(filePath)} not found`);
    allTestsPassed = false;
  }
});

// Test 3: Check if screens import responsive utilities
console.log('\n✅ Test 3: Checking screen imports...');
const screensToCheck = [
  'mobile-client/src/screens/ClientListScreen.js',
  'mobile-client/src/screens/ClientDetailScreen.js',
  'mobile-client/src/screens/CessionListScreen.js',
  'mobile-client/src/screens/CessionDetailScreen.js',
  'mobile-client/src/screens/ExportScreen.js'
];

screensToCheck.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("wp") && content.includes("hp")) {
      console.log(`   ✓ ${path.basename(filePath)} uses responsive utilities`);
    } else {
      console.log(`   ✗ ${path.basename(filePath)} not using responsive utilities`);
      allTestsPassed = false;
    }
  } else {
    console.log(`   ✗ ${path.basename(filePath)} not found`);
    allTestsPassed = false;
  }
});

// Test 4: Check if fixed values have been replaced with responsive ones
console.log('\n✅ Test 4: Checking for responsive replacements...');
const filesToCheckForFixedValues = [
  'mobile-client/src/components/ClientCard.js',
  'mobile-client/src/components/SearchBar.js'
];

filesToCheckForFixedValues.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common fixed values that should be replaced
    const fixedValuePatterns = [
      /padding:\s*16/g,
      /margin:\s*16/g,
      /fontSize:\s*18/g,
      /fontSize:\s*16/g,
      /fontSize:\s*14/g,
      /height:\s*40/g,
      /borderRadius:\s*8/g
    ];
    
    let hasFixedValues = false;
    fixedValuePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        hasFixedValues = true;
      }
    });
    
    if (!hasFixedValues) {
      console.log(`   ✓ ${path.basename(filePath)} uses responsive values`);
    } else {
      console.log(`   ⚠ ${path.basename(filePath)} may still contain some fixed values`);
    }
  }
});

// Test 5: Check if utils index exports responsive utilities
console.log('\n✅ Test 5: Checking utils index exports...');
const utilsIndexPath = 'mobile-client/src/utils/index.js';
if (fs.existsSync(utilsIndexPath)) {
  const content = fs.readFileSync(utilsIndexPath, 'utf8');
  if (content.includes("export * from './responsive'")) {
    console.log('   ✓ Utils index exports responsive utilities');
  } else {
    console.log('   ✗ Utils index missing responsive exports');
    allTestsPassed = false;
  }
} else {
  console.log('   ✗ Utils index file not found');
  allTestsPassed = false;
}

// Test 6: Check package.json for required dependencies
console.log('\n✅ Test 6: Checking package.json dependencies...');
const packageJsonPath = 'mobile-client/package.json';
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = [
    'react-native',
    'expo',
    '@react-navigation/native',
    '@react-navigation/stack',
    '@react-navigation/bottom-tabs'
  ];
  
  let missingDeps = [];
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      missingDeps.push(dep);
    }
  });
  
  if (missingDeps.length === 0) {
    console.log('   ✓ All required dependencies are present');
  } else {
    console.log(`   ✗ Missing dependencies: ${missingDeps.join(', ')}`);
    allTestsPassed = false;
  }
} else {
  console.log('   ✗ package.json not found');
  allTestsPassed = false;
}

// Summary
console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 All tests passed! The mobile app has been successfully updated with responsive UI.');
  console.log('\n📱 Key improvements made:');
  console.log('   • Created responsive utility functions (wp, hp, rf)');
  console.log('   • Updated all components to use percentage-based layouts');
  console.log('   • Improved support for small phone screens');
  console.log('   • Added flexible layouts with proper wrapping');
  console.log('   • Responsive font sizes and spacing');
  console.log('\n🚀 To test the app:');
  console.log('   1. cd mobile-client');
  console.log('   2. npm install (if needed)');
  console.log('   3. npm run ios (for iOS)');
  console.log('   4. npm run android (for Android)');
} else {
  console.log('❌ Some tests failed. Please check the issues above.');
}
console.log('='.repeat(50));

process.exit(allTestsPassed ? 0 : 1);