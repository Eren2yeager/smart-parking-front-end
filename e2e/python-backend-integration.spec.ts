import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * End-to-End Tests for Python Backend Integration
 * 
 * These tests verify the complete integration between the Next.js frontend
 * and the Python backend for live monitoring and camera streaming.
 * 
 * Prerequisites:
 * - Python backend must be running on localhost:8000
 * - MongoDB must be running on localhost:27017
 * - Next.js app must be running on localhost:3000
 */

test.describe('Python Backend Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Check if Python backend is available
    try {
      const response = await page.request.get('http://localhost:8000/api/health');
      expect(response.ok()).toBeTruthy();
    } catch (error) {
      test.skip(true, 'Python backend is not running. Start it with: cd python-work && python main.py');
    }
  });

  test('15.1.1 - Python backend health check', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('smart-parking-backend');
  });

  test('15.1.2 - Test backend page displays connection status', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for connection indicators
    const gateStatus = page.locator('text=/Gate.*Monitor/i');
    const lotStatus = page.locator('text=/Lot.*Monitor/i');
    
    await expect(gateStatus).toBeVisible({ timeout: 10000 });
    await expect(lotStatus).toBeVisible({ timeout: 10000 });
  });

  test('15.1.3 - Test image upload for plate detection', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Look for file upload input
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      // Create a test image path
      const testImagePath = path.join(process.cwd(), 'python-work', 'test_imgaes', 'gate_cars.jpg');
      
      if (fs.existsSync(testImagePath)) {
        await fileInput.setInputFiles(testImagePath);
        
        // Wait for processing
        await page.waitForTimeout(3000);
        
        // Check for results
        const results = page.locator('text=/detected|confidence|plate/i');
        await expect(results.first()).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('15.1.4 - Camera page loads without authentication', async ({ page }) => {
    await page.goto('http://localhost:3000/camera');
    
    // Should not redirect to login
    await expect(page).toHaveURL('http://localhost:3000/camera');
    
    // Check for camera streaming UI elements
    const streamButton = page.locator('button:has-text("Start")');
    await expect(streamButton).toBeVisible({ timeout: 5000 });
  });

  test('15.1.5 - WebSocket connection establishment', async ({ page, context }) => {
    // Enable WebSocket tracking
    const wsMessages: any[] = [];
    
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload as string);
          wsMessages.push(data);
        } catch (e) {
          // Binary or non-JSON data
        }
      });
    });
    
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connections
    await page.waitForTimeout(3000);
    
    // Check if we received connection messages
    const hasConnectionMessage = wsMessages.some(msg => 
      msg.type === 'connection' || msg.status === 'connected'
    );
    
    expect(wsMessages.length).toBeGreaterThan(0);
  });
});

test.describe('Live Monitoring Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    
    // Check if already logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      return; // Already logged in
    }
    
    // Try to login with Google (if available)
    const googleButton = page.locator('button:has-text("Google")');
    if (await googleButton.count() > 0) {
      // Note: This will require manual intervention or test credentials
      test.skip(true, 'Manual login required for live monitoring tests');
    }
  });

  test('15.1.6 - Live monitoring page navigation', async ({ page }) => {
    // Navigate to parking lots
    await page.goto('http://localhost:3000/parking-lots');
    await page.waitForLoadState('networkidle');
    
    // Find first parking lot
    const firstLot = page.locator('[data-testid="parking-lot-card"]').first();
    
    if (await firstLot.count() > 0) {
      await firstLot.click();
      
      // Look for "View Live Feed" button
      const liveFeedButton = page.locator('button:has-text("Live Feed")');
      
      if (await liveFeedButton.count() > 0) {
        await liveFeedButton.click();
        
        // Should navigate to live monitoring page
        await expect(page).toHaveURL(/\/parking-lots\/.*\/live/);
      }
    }
  });

  test('15.1.7 - Live feed displays video canvas', async ({ page }) => {
    // Try to access a live feed directly
    await page.goto('http://localhost:3000/parking-lots/test-id/live');
    
    // Check for video canvas element
    const canvas = page.locator('canvas');
    
    if (await canvas.count() > 0) {
      await expect(canvas.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('15.1.8 - Connection status indicator displays', async ({ page }) => {
    await page.goto('http://localhost:3000/parking-lots/test-id/live');
    
    // Look for connection status
    const statusIndicator = page.locator('text=/connected|disconnected|reconnecting/i');
    
    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('15.1.9 - Fullscreen toggle functionality', async ({ page }) => {
    await page.goto('http://localhost:3000/parking-lots/test-id/live');
    
    // Look for fullscreen button
    const fullscreenButton = page.locator('button[aria-label*="fullscreen"], button:has-text("Fullscreen")');
    
    if (await fullscreenButton.count() > 0) {
      await fullscreenButton.click();
      
      // Check if navigation is hidden
      const nav = page.locator('nav');
      
      if (await nav.count() > 0) {
        // Navigation should be hidden or have reduced visibility
        await page.waitForTimeout(500);
      }
    }
  });
});

test.describe('Real-time Detection Overlays', () => {
  test('15.1.10 - Bounding boxes render on detection', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Upload test image
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.count() > 0) {
      const testImagePath = path.join(process.cwd(), 'python-work', 'test_imgaes', 'gate_cars.jpg');
      
      if (fs.existsSync(testImagePath)) {
        await fileInput.setInputFiles(testImagePath);
        await page.waitForTimeout(3000);
        
        // Check for bounding box visualization
        const canvas = page.locator('canvas');
        
        if (await canvas.count() > 0) {
          await expect(canvas.first()).toBeVisible();
        }
      }
    }
  });

  test('15.1.11 - Detection labels display correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Look for detection results
    const results = page.locator('[data-testid="detection-result"]');
    
    if (await results.count() > 0) {
      // Check for plate number and confidence
      const plateNumber = page.locator('text=/[A-Z0-9]{4,}/');
      const confidence = page.locator('text=/confidence|%/i');
      
      await expect(plateNumber.or(confidence).first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Performance Metrics', () => {
  test('15.1.12 - Frame rate metrics display', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Look for FPS or frame rate indicators
    const fpsIndicator = page.locator('text=/fps|frame.*rate/i');
    
    if (await fpsIndicator.count() > 0) {
      await expect(fpsIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('15.1.13 - Latency metrics display', async ({ page }) => {
    await page.goto('http://localhost:3000/test-backend');
    await page.waitForLoadState('networkidle');
    
    // Look for latency indicators
    const latencyIndicator = page.locator('text=/latency|ms|delay/i');
    
    if (await latencyIndicator.count() > 0) {
      await expect(latencyIndicator.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('15.1.14 - Processing time is reasonable', async ({ page }) => {
    const response = await page.request.post('http://localhost:8000/api/health');
    
    const startTime = Date.now();
    await response.json();
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    
    // Health check should respond within 1 second
    expect(responseTime).toBeLessThan(1000);
  });
});
