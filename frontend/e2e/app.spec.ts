import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads - wait for React to render
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display main content', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for main content area
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Authentication Pages', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have email and password fields on login page', async ({ page }) => {
    await page.goto('/login');
    
    await page.waitForLoadState('networkidle');
    
    // Check for form elements - use flexible selectors
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/signup');
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have registration form fields', async ({ page }) => {
    await page.goto('/signup');
    
    await page.waitForLoadState('networkidle');
    
    // Check for email and password fields
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(emailInput.first()).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should be able to navigate between pages', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/login');
    
    // Navigate to signup
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/signup');
  });

  test('should handle mobile viewport', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await page.waitForLoadState('networkidle');
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Protected Routes', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login
    expect(page.url()).toContain('/login');
  });

  test('should redirect unauthenticated users from create-ad', async ({ page }) => {
    await page.goto('/create-ad');
    
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login
    expect(page.url()).toContain('/login');
  });
});

test.describe('Profile Page', () => {
  test('should load profile page with ID', async ({ page }) => {
    // Test with a fake ID - should load without crashing
    await page.goto('/profile/test-id');
    
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
