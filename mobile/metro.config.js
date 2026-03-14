const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configure Metro to listen on all network interfaces
config.server = {
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Add CORS headers for mobile
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return middleware(req, res, next);
    };
  },
};

// Ensure we watch all files
config.watchFolders = [__dirname];

module.exports = config;
