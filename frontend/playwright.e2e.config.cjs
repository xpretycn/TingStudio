const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '../test',
  testMatch: ['e2e-auth.spec.js', 'e2e-combined.spec.js'],
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    headless: true,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ]
});
