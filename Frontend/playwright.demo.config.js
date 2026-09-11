const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  testMatch: 'demo-recovery.spec.js',
  timeout: 30000,
  workers: 1,
  use: { channel: 'chrome' },
  webServer: {
    command: 'node tests/serve-demo.mjs',
    url: 'http://127.0.0.1:4191',
    reuseExistingServer: false,
  },
});
