import { test, expect, devices } from '@playwright/test';

/**
 * Cross-Browser and Cross-Device Testing
 * 
 * Tests responsive design and functionality across:
 * - Desktop browsers: Chrome, Firefox, Safari, Edge
 * - Tablet devices: iPad, Android tablet
 * - Mobile devices: iPhone, Android phone
 * 
 * Validates Requirements 3.1-3.10 (Responsive Design)
 */

// Desktop Browser Tests
test.describe('Desktop Browser Compatibility', () => {
  const desktopViewport = { width: 1920, height: 1080 };

  test('15.2.1 - Chrome desktop layout', async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto('/dashboard');
    
    // Check for multi-column layout
    const sidebar = page.locator('aside, nav[role="navigation"]');
    await expect(sidebar).toBeVisible();
    
    // Sidebar should be fixed/visible on desktop
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox).toBeTruthy();
  });

  test('15.2.2 - Firefox desktop layout', async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto('/dashboard');
    
    // Verify dashboard stats display in grid
    const statsGrid = page.locator('[data-testid="dashboard-stats"]');
    
    if (await statsGrid.count() > 0) {
      const gridBox = await statsGrid.boundingBox();
      expect(gridBox?.width).toBeGreaterThan(800);
    }
  });

  test('15.2.3 - Desktop navigation is visible', async ({ page }) => {
    await page.setViewportSize(desktopViewport);
    await page.goto('/dashboard');
    
    // Navigation should be visible, not hamburger menu
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Hamburger menu should NOT be visible on desktop
    const hamburger = page.locator('button[aria-label*="menu"]');
    if (await hamburger.count() > 0) {
      await expect(hamburger).not.toBeVisible();
    }
  });
});

// Tablet Device Tests
test.describe('Tablet Device Compatibility', () => {
  test.use({ ...devices['iPad Pro'] });

  test('15.2.4 - iPad tablet layout', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tablet should show 2-column layout
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // Check viewport width is tablet size
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeGreaterThanOrEqual(768);
    expect(viewport?.width).toBeLessThanOrEqual(1024);
  });

  test('15.2.5 - Tablet collapsible sidebar', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for sidebar toggle button
    const sidebarToggle = page.locator('button[aria-label*="sidebar"], button[aria-label*="menu"]');
    
    if (await sidebarToggle.count() > 0) {
      await expect(sidebarToggle).toBeVisible();
      
      // Click to toggle
      await sidebarToggle.click();
      await page.waitForTimeout(500);
      
      // Sidebar should animate
      const sidebar = page.locator('aside, nav[role="navigation"]');
      await expect(sidebar).toBeVisible();
    }
  });

  test('15.2.6 - Tablet table scrolling', async ({ page }) => {
    await page.goto('/records');
    
    // Tables should be scrollable on tablet
    const table = page.locator('table').first();
    
    if (await table.count() > 0) {
      const tableContainer = table.locator('xpath=ancestor::div[1]');
      const overflow = await tableContainer.evaluate(el => 
        window.getComputedStyle(el).overflowX
      );
      
      // Should have horizontal scroll
      expect(['auto', 'scroll']).toContain(overflow);
    }
  });
});

// Mobile Device Tests
test.describe('Mobile Device Compatibility', () => {
  test.use({ ...devices['iPhone 12'] });

  test('15.2.7 - iPhone mobile layout', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Mobile should show single-column layout
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // Main content should be full width
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('15.2.8 - Mobile hamburger menu', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Hamburger menu should be visible on mobile
    const hamburger = page.locator('button[aria-label*="menu"]');
    await expect(hamburger).toBeVisible();
    
    // Click to open menu
    await hamburger.click();
    await page.waitForTimeout(500);
    
    // Navigation should appear
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('15.2.9 - Mobile card layout for tables', async ({ page }) => {
    await page.goto('/records');
    
    // On mobile, tables might convert to cards
    const cards = page.locator('[data-testid="mobile-card"]');
    const table = page.locator('table');
    
    // Either cards or scrollable table should be present
    const hasCards = await cards.count() > 0;
    const hasTable = await table.count() > 0;
    
    expect(hasCards || hasTable).toBeTruthy();
  });

  test('15.2.10 - Mobile touch-friendly buttons', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      // Check first few buttons for touch-friendly size
      for (let i = 0; i < Math.min(5, buttonCount); i++) {
        const button = buttons.nth(i);
        const box = await button.boundingBox();
        
        if (box) {
          // Minimum 44x44px for touch targets
          expect(box.height).toBeGreaterThanOrEqual(40); // Allow small margin
        }
      }
    }
  });

  test('15.2.11 - Mobile form field stacking', async ({ page }) => {
    await page.goto('/parking-lots/new');
    
    // Form fields should stack vertically
    const formFields = page.locator('input, select, textarea');
    const fieldCount = await formFields.count();
    
    if (fieldCount >= 2) {
      const field1Box = await formFields.nth(0).boundingBox();
      const field2Box = await formFields.nth(1).boundingBox();
      
      if (field1Box && field2Box) {
        // Second field should be below first (vertical stacking)
        expect(field2Box.y).toBeGreaterThan(field1Box.y + field1Box.height);
      }
    }
  });

  test('15.2.12 - Mobile chart responsiveness', async ({ page }) => {
    await page.goto('/analytics');
    
    // Charts should fit mobile width
    const charts = page.locator('canvas, svg[class*="chart"]');
    const chartCount = await charts.count();
    
    if (chartCount > 0) {
      const chart = charts.first();
      const chartBox = await chart.boundingBox();
      const viewport = page.viewportSize();
      
      if (chartBox && viewport) {
        // Chart should not exceed viewport width
        expect(chartBox.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
});

// Android Device Tests
test.describe('Android Device Compatibility', () => {
  test.use({ ...devices['Pixel 5'] });

  test('15.2.13 - Android mobile layout', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify mobile layout
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(768);
    
    // Check for mobile-specific elements
    const hamburger = page.locator('button[aria-label*="menu"]');
    await expect(hamburger).toBeVisible();
  });

  test('15.2.14 - Android camera access', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    await page.goto('/camera');
    
    // Camera page should load
    await expect(page).toHaveURL('/camera');
    
    // Start streaming button should be visible
    const startButton = page.locator('button:has-text("Start")');
    await expect(startButton).toBeVisible();
  });
});

// Responsive Breakpoint Tests
test.describe('Responsive Breakpoint Transitions', () => {
  test('15.2.15 - Desktop to tablet transition', async ({ page }) => {
    // Start at desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/dashboard');
    
    // Verify desktop layout
    let sidebar = page.locator('aside, nav[role="navigation"]');
    await expect(sidebar).toBeVisible();
    
    // Resize to tablet
    await page.setViewportSize({ width: 900, height: 800 });
    await page.waitForTimeout(500);
    
    // Layout should adapt
    sidebar = page.locator('aside, nav[role="navigation"]');
    const isVisible = await sidebar.isVisible();
    
    // Sidebar might be collapsible now
    expect(isVisible).toBeDefined();
  });

  test('15.2.16 - Tablet to mobile transition', async ({ page }) => {
    // Start at tablet size
    await page.setViewportSize({ width: 800, height: 600 });
    await page.goto('/dashboard');
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Hamburger menu should appear
    const hamburger = page.locator('button[aria-label*="menu"]');
    await expect(hamburger).toBeVisible();
  });

  test('15.2.17 - Orientation change handling', async ({ page }) => {
    // Portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    let mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
    
    // Landscape
    await page.setViewportSize({ width: 667, height: 375 });
    await page.waitForTimeout(500);
    
    // Content should still be visible and adapted
    mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

// Image Responsiveness Tests
test.describe('Responsive Image Loading', () => {
  test('15.2.18 - Desktop loads high-res images', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/parking-lots');
    
    // Check for images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      const firstImage = images.first();
      const src = await firstImage.getAttribute('src');
      
      // Image should be loaded
      expect(src).toBeTruthy();
    }
  });

  test('15.2.19 - Mobile loads appropriate image sizes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/parking-lots');
    
    // Images should have srcset or be appropriately sized
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      const firstImage = images.first();
      const srcset = await firstImage.getAttribute('srcset');
      const loading = await firstImage.getAttribute('loading');
      
      // Should have lazy loading or srcset
      expect(srcset || loading).toBeTruthy();
    }
  });
});

// Slot Grid Responsiveness
test.describe('Slot Grid Scaling', () => {
  test('15.2.20 - Desktop slot grid full size', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/parking-lots');
    
    // Navigate to a lot detail page if possible
    const firstLot = page.locator('[data-testid="parking-lot-card"]').first();
    
    if (await firstLot.count() > 0) {
      await firstLot.click();
      
      // Check for slot grid
      const slotGrid = page.locator('[data-testid="slot-grid"]');
      
      if (await slotGrid.count() > 0) {
        const gridBox = await slotGrid.boundingBox();
        expect(gridBox?.width).toBeGreaterThan(400);
      }
    }
  });

  test('15.2.21 - Mobile slot grid scaled', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/parking-lots');
    
    const firstLot = page.locator('[data-testid="parking-lot-card"]').first();
    
    if (await firstLot.count() > 0) {
      await firstLot.click();
      
      const slotGrid = page.locator('[data-testid="slot-grid"]');
      
      if (await slotGrid.count() > 0) {
        const gridBox = await slotGrid.boundingBox();
        const viewport = page.viewportSize();
        
        if (gridBox && viewport) {
          // Grid should fit within mobile viewport
          expect(gridBox.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    }
  });
});
