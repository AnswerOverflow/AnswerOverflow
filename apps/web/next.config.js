const withTM = require("next-transpile-modules")(["ui"]);

module.exports = withTM({
  webpack: (config) => {
    // Solve compiling problem via vagrant
    config.watchOptions = {
      poll: 1000,   // Check for changes every second
      aggregateTimeout: 300,   // delay before rebuilding
    };
    return config;
  },
  reactStrictMode: true,  
});
