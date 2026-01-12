# E2E Tests

This directory contains end-to-end tests using Playwright.

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug
```

## Test Structure

- Tests are located in the `e2e/` directory
- Test files should end with `.spec.ts`
- Tests run against `http://localhost:3000` by default

## Configuration

See `playwright.config.ts` for configuration options.

## Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('example test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Smart Parking/);
});
```

## Browser Support

Tests run on:
- Chromium (Desktop Chrome)
- Firefox (Desktop Firefox)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
