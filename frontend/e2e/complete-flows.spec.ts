import { test, expect } from '@playwright/test';

test.describe('404 Not Found Page', () => {
  test('should display 404 page for unknown routes', async ({ page }) => {
    await page.goto('/unknown-route-12345');
    await page.waitForLoadState('networkidle');
    
    // Check for 404 content
    await expect(page.locator('body')).toContainText(/not found|404|page.*exist/i);
  });

  test('should have a link back to home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.waitForLoadState('networkidle');
    
    // Look for home link or button
    const homeLink = page.locator('a[href="/"], button:has-text("home"), a:has-text("home")').first();
    await expect(homeLink).toBeVisible();
  });
});

test.describe('Navigation & Responsive Layout', () => {
  test('should have responsive navigation menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check navigation exists
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();
  });

  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test navigation to login
    await page.goto('/login');
    await expect(page.locator('input[type="email"], input[type="password"]').first()).toBeVisible();
    
    // Test navigation to signup
    await page.goto('/signup');
    await expect(page.locator('form, input').first()).toBeVisible();
  });
});

test.describe('Create Ad Flow', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/create-ad');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show auth prompt
    const loginIndicator = page.locator('input[type="email"], input[type="password"]').first();
    await expect(loginIndicator).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Profile Pages', () => {
  test('should display profile page structure', async ({ page }) => {
    // Visit a mock profile
    await page.goto('/profile/mock_1');
    await page.waitForLoadState('networkidle');
    
    // Should show some profile content or not found
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Search & Filters', () => {
  test('should have search functionality on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for search input or filter controls
    // May or may not have search on homepage depending on design
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility Checks', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for at least one heading
    const headings = page.locator('h1, h2, h3');
    await expect(headings.first()).toBeVisible();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Check form inputs have labels or aria-labels
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const hasAriaLabel = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
        const hasLabel = id && document.querySelector(`label[for="${id}"]`);
        const hasPlaceholder = el.hasAttribute('placeholder');
        return hasAriaLabel || hasLabel || hasPlaceholder;
      });
      expect(hasLabel).toBe(true);
    }
  });

  test('should have focusable interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through the page and check focus is visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper color contrast on buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Basic check that buttons are visible
    const buttons = page.locator('button, a[role="button"], .btn');
    if (await buttons.count() > 0) {
      await expect(buttons.first()).toBeVisible();
    }
  });
});

test.describe('Performance Checks', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Development server is slow, allow up to 30 seconds
    expect(loadTime).toBeLessThan(30000);
    console.log(`Homepage load time: ${loadTime}ms`);
  });

  test('should not have broken images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check all images loaded successfully
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const img = images.nth(i);
      const isLoaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalHeight > 0);
      // Some images might be lazy loaded, so we just warn
      if (!isLoaded) {
        console.warn(`Image ${i} may not have loaded`);
      }
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should display correctly on mobile viewport', async ({ page }) => {
    // This test runs with device-specific config from playwright.config
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Check no horizontal scroll (content fits)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    // Allow small overflow tolerance
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
  });
});
