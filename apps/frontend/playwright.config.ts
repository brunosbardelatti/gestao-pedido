import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  'postgresql://postgres:postgres@127.0.0.1:55432/gestao_pedidos_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm --prefix ../backend run dev',
      url: 'http://127.0.0.1:3001/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        FRONTEND_URL: 'http://127.0.0.1:3000',
        NODE_ENV: 'test',
        PORT: '3001',
        SESSION_TTL_SECONDS: '28800',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://127.0.0.1:3000/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3001',
      },
    },
  ],
});
