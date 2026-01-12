import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  
  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Smart Parking/);
});

test('can navigate to login page', async ({ page }) => {
  await page.goto('/');
  
  // Click the login link
  await page.click('text=Login');
  
  // Expect the URL to contain /login
  await expect(page).toHaveURL(/.*login/);
});
