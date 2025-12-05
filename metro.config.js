const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.sourceExts.push('cjs');

// Ensure we handle both web and native platforms
config.resolver.platforms = ['ios', 'android', 'web'];

// Exclude web-only packages from React Native bundles
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== 'web') {
    // List of web-only packages to exclude
    const webOnlyPackages = [
      'pdfjs-dist',
      'react-router',
      'react-router-dom',
    ];
    
    if (webOnlyPackages.some(pkg => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
      return {
        type: 'empty',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
