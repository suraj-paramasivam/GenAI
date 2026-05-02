const { test, expect } = require('@playwright/test');

test.describe('End-to-End Workflow', () => {
  test('Full Journey: Login, Task Management, and AI Chat', async ({ page }) => {
    // 1. Redirect to login
    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);

    // 2. Login with valid credentials (mocked in server if running in test mode)
    // For E2E, we assume the server is running with the test credentials
    await page.fill('#username', 'admin');
    await page.fill('#password', 'KekronMekron@2026');
    await page.click('#login-btn');
    await expect(page).toHaveURL(/.*\/$/); // Redirect back to home

    // 3. Add a new task
    await page.click('[data-column="backlog"].add-card-btn');
    await page.fill('#task-title', 'Test Task from E2E');
    await page.fill('#task-desc', 'This task was created by Playwright');
    await page.click('#task-save');
    await expect(page.locator('.task-card:has-text("Test Task from E2E")')).toBeVisible();

    // 4. Open Chat and select AI channel
    await page.click('#btn-chat');
    await expect(page.locator('#chat-panel')).toHaveClass(/open/);
    await page.click('.channel-btn[data-channel="agent"]');
    await expect(page.locator('.channel-btn[data-channel="agent"]')).toHaveClass(/active/);

    // 5. Interact with AI Agent
    await page.fill('#chat-input', 'Summarize my tasks');
    await page.click('#chat-send');
    
    // Verify typing indicator appears
    await expect(page.locator('#ai-typing-indicator')).toBeVisible();
    
    // Verify AI response eventually appears
    await expect(page.locator('.chat-msg.ai .chat-msg-text').last()).not.toBeEmpty({ timeout: 10000 });
  });

  test('Edge Case: Invalid Login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpass');
    await page.click('#login-btn');
    await expect(page.locator('#error-msg')).toBeVisible();
    await expect(page.locator('#error-msg')).toContainText('Invalid');
  });
});
