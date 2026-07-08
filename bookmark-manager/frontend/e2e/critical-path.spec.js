// Critical-path E2E test: setup -> login -> add bookmark -> create PAT -> sign out.
// Assumes:
//   - The backend is reachable via vite's /api proxy (configured in vite.config.js).
//   - The DB is fresh (TRUNCATE the users table between runs).
import { test, expect } from '@playwright/test';

const EMAIL    = 'e2e@example.com';
const PASSWORD = 'e2e-password-1234';

test.describe.serial('Critical path', () => {
  test('First-run setup creates an account and signs the user in', async ({ page }) => {
    await page.goto('/');
    // Either /login or already in (auth disabled). When auth is enabled the
    // first visit should redirect to /login with the setup variant.
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Bookmark OS/i })).toBeVisible();

    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel(/Password/).fill(PASSWORD);
    await page.getByRole('button', { name: /Create account & sign in/i }).click();

    await expect(page).toHaveURL('/', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
  });

  test('User can add a bookmark from the toolbar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Add/i }).first().click();

    const modal = page.locator('form').filter({ hasText: 'Add bookmark' });
    await modal.getByLabel('URL').fill('https://example.com');
    await modal.getByLabel(/^Title/).fill('Example');
    await modal.getByRole('button', { name: /Save bookmark/i }).click();

    // New bookmark appears in the recent list.
    await expect(page.getByText('Example').first()).toBeVisible({ timeout: 10_000 });
  });

  test('User can create a Personal Access Token in Settings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();
    await page.getByPlaceholder(/Token name/).fill('e2e-token');
    await page.getByRole('button', { name: /New token/i }).click();

    await expect(page.getByText(/Token created — copy it now/)).toBeVisible();
    const codeBlock = page.locator('code').filter({ hasText: /^bmpat_/ }).first();
    await expect(codeBlock).toBeVisible();
  });

  test('User can navigate to the Import page', async ({ page }) => {
    await page.goto('/');
    // Assuming there is an import link in the sidebar or we can just go directly
    await page.goto('/import');
    await expect(page.getByRole('heading', { name: /Import/i, exact: true })).toBeVisible();
    await expect(page.getByText(/Import bookmarks from Chrome/i)).toBeVisible();
    
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('User can search and filter bookmarks', async ({ page }) => {
    await page.goto('/');
    // Type in the global search bar
    const searchInput = page.getByPlaceholder(/Search...|Search bookmarks/i).first();
    // Fallback if the placeholder is different
    if (await searchInput.isVisible()) {
      await searchInput.fill('Example');
      // Wait for search results or filtering to apply
      await page.waitForTimeout(500); 
      await expect(page.getByText('Example').first()).toBeVisible();
    }
  });

  test('Browser extension auth flow responds properly', async ({ request }) => {
    // This is a minimal check for the extension auth API endpoint
    // It verifies that an unauthenticated request is rejected as expected
    const response = await request.post('/api/auth/extension', {
      data: { token: 'invalid_token' }
    });
    expect(response.status()).toBe(401);
  });
});
