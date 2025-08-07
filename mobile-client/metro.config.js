const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add custom resolver configuration for better compatibility
config.resolver = {
  ...config.resolver,
  // Ensure proper asset resolution
  assetExts: [...config.resolver.assetExts, 'bin'],
  sourceExts: [...config.resolver.sourceExts, 'js', 'jsx', 'ts', 'tsx', 'json'],
};

// Enable inline requires for better performance
config.transformer = {
  ...config.transformer,
  inlineRequires: true,
};

module.exports = config;