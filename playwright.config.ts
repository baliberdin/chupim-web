import { defineConfig, devices } from '@playwright/test';

const port = 3100;

// End-to-end tests run against the built app: run `npm run build` first (make e2e does it)
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'node dist/start.js',
    url: `http://localhost:${port}/`,
    env: { PORT: String(port), CHUPIM_EXAMPLES: '1', CHUPIM_ENV: 'development' },
    reuseExistingServer: false,
    stdout: 'ignore',
  },
});
