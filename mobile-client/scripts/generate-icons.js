#!/usr/bin/env node

/**
 * Icon Generation Script for Cession Manager Mobile App
 * This script creates placeholder icons for development and testing
 * Replace with actual branded icons for production
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon as a placeholder
const createSVGIcon = (size, backgroundColor = '#2563eb', textColor = '#ffffff') => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${backgroundColor}" rx="${size * 0.1}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" 
        text-anchor="middle" dominant-baseline="central" fill="${textColor}">CM</text>
  <text x="50%" y="75%" font-family="Arial, sans-serif" font-size="${size * 0.08}" 
        text-anchor="middle" dominant-baseline="central" fill="${textColor}">Cession Manager</text>
</svg>`;
};

// Create splash screen SVG
const createSplashSVG = (width, height) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <g transform="translate(${width/2}, ${height/2})">
    <circle r="80" fill="#2563eb" opacity="0.1"/>
    <circle r="60" fill="#2563eb" opacity="0.2"/>
    <circle r="40" fill="#2563eb" opacity="0.3"/>
    <text x="0" y="-10" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
          text-anchor="middle" dominant-baseline="central" fill="#2563eb">CM</text>
    <text x="0" y="20" font-family="Arial, sans-serif" font-size="14" 
          text-anchor="middle" dominant-baseline="central" fill="#64748b">Cession Manager</text>
    <text x="0" y="40" font-family="Arial, sans-serif" font-size="12" 
          text-anchor="middle" dominant-baseline="central" fill="#94a3b8">Mobile Client</text>
  </g>
</svg>`;
};

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

console.log('🎨 Generating app icons and splash screens...');

// Generate main app icon (1024x1024 for iOS, will be resized)
const mainIcon = createSVGIcon(1024);
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), mainIcon);

// Generate adaptive icon (Android)
const adaptiveIcon = createSVGIcon(1024, '#2563eb', '#ffffff');
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.svg'), adaptiveIcon);

// Generate splash screen
const splash = createSplashSVG(1242, 2688); // iPhone X/11/12 Pro Max size
fs.writeFileSync(path.join(assetsDir, 'splash.svg'), splash);

// Generate favicon
const favicon = createSVGIcon(512);
fs.writeFileSync(path.join(assetsDir, 'favicon.svg'), favicon);

console.log('✅ Generated SVG assets:');
console.log('  - icon.svg (1024x1024)');
console.log('  - adaptive-icon.svg (1024x1024)');
console.log('  - splash.svg (1242x2688)');
console.log('  - favicon.svg (512x512)');
console.log('');
console.log('📝 Note: These are placeholder SVG files.');
console.log('   For production, convert to PNG and replace with branded assets.');
console.log('   Use tools like Figma, Sketch, or online converters.');
console.log('');
console.log('📐 Required sizes:');
console.log('  - iOS App Icon: 1024x1024 PNG');
console.log('  - Android Adaptive Icon: 1024x1024 PNG');
console.log('  - Splash Screen: 1242x2688 PNG (or larger)');
console.log('  - Favicon: 512x512 PNG');