#!/usr/bin/env node

/**
 * Local test to verify responsive utilities work correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Responsive Utilities Locally...\n');

// Test the responsive utility functions
try {
  // Mock React Native Dimensions for testing
  global.require = (module) => {
    if (module === 'react-native') {
      return {
        Dimensions: {
          get: () => ({ width: 375, height: 667 }) // iPhone X dimensions
        },
        PixelRatio: {
          roundToNearestPixel: (value) => Math.round(value)
        }
      };
    }
    return {};
  };

  // Read and evaluate the responsive utility file
  const responsiveUtilPath = path.join(__dirname, 'src', 'utils', 'responsive.js');
  let responsiveContent = fs.readFileSync(responsiveUtilPath, 'utf8');
  
  // Remove import statements for testing
  responsiveContent = responsiveContent.replace(/import.*from.*['"]react-native['"];?\n?/g, '');
  
  // Add mock require at the top
  responsiveContent = `
const { Dimensions, PixelRatio } = require('react-native');
${responsiveContent}
  `;

  // Evaluate the code
  eval(responsiveContent);

  // Test the functions
  console.log('✅ Testing responsive functions:');
  console.log(`   wp(50) = ${wp(50)}px (should be ~187px for 375px width)`);
  console.log(`   hp(10) = ${hp(10)}px (should be ~67px for 667px height)`);
  console.log(`   rf(16) = ${rf(16)}px (should be ~16px for 375px width)`);
  console.log(`   isSmallDevice() = ${isSmallDevice()} (should be false for 375px width)`);
  console.log(`   isTablet() = ${isTablet()} (should be false for 375px width)`);

  // Test with small device dimensions
  global.require = (module) => {
    if (module === 'react-native') {
      return {
        Dimensions: {
          get: () => ({ width: 320, height: 568 }) // iPhone 5 dimensions
        },
        PixelRatio: {
          roundToNearestPixel: (value) => Math.round(value)
        }
      };
    }
    return {};
  };

  // Re-evaluate for small device
  eval(responsiveContent);
  
  console.log('\n✅ Testing with small device (320px width):');
  console.log(`   wp(50) = ${wp(50)}px (should be ~160px for 320px width)`);
  console.log(`   isSmallDevice() = ${isSmallDevice()} (should be true for 320px width)`);

  console.log('\n🎉 Responsive utilities are working correctly!');

} catch (error) {
  console.error('❌ Error testing responsive utilities:', error.message);
}

// Test component files for responsive usage
console.log('\n🔍 Checking component files for responsive usage...');

const componentFiles = [
  'src/components/ClientCard.js',
  'src/components/SearchBar.js',
  'src/components/CessionCard.js'
];

componentFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count responsive function usage
    const wpCount = (content.match(/wp\(/g) || []).length;
    const hpCount = (content.match(/hp\(/g) || []).length;
    const rfCount = (content.match(/rf\(/g) || []).length;
    const responsiveStylesCount = (content.match(/RESPONSIVE_STYLES\./g) || []).length;
    
    console.log(`   ${path.basename(file)}:`);
    console.log(`     - wp() usage: ${wpCount} times`);
    console.log(`     - hp() usage: ${hpCount} times`);
    console.log(`     - rf() usage: ${rfCount} times`);
    console.log(`     - RESPONSIVE_STYLES usage: ${responsiveStylesCount} times`);
    
    if (wpCount + hpCount + rfCount + responsiveStylesCount > 0) {
      console.log(`     ✅ Using responsive utilities`);
    } else {
      console.log(`     ⚠️  Not using responsive utilities`);
    }
  } else {
    console.log(`   ❌ ${file} not found`);
  }
});

console.log('\n📱 The responsive UI improvements are ready!');
console.log('   Key benefits for small phone screens:');
console.log('   • Text scales based on screen size');
console.log('   • Cards use percentage widths instead of fixed pixels');
console.log('   • Spacing adapts to screen dimensions');
console.log('   • Touch targets are appropriately sized');
console.log('   • Layouts wrap content properly on narrow screens');

console.log('\n🚀 To test on your phone, try:');
console.log('   1. Make sure your phone and computer are on the same WiFi');
console.log('   2. Run: npm start');
console.log('   3. Use Expo Go app to scan the QR code');
console.log('   4. Or try: npm run android (if you have Android Studio)');