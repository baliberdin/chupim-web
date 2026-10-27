import { test, expect, type Page } from '@playwright/test';

async function replaceSource(page: Page, source: string) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  // insertText avoids the editor auto-closing brackets while typing
  await page.keyboard.insertText(source);
}

test('creates a stage', async ({ page, request }) => {
  await page.goto('/stage/new');
  await page.getByLabel('Prefix').fill('E2E');
  await page.getByLabel('Name').fill('greet');
  await expect(page.locator('[data-full-name]').first()).toHaveText('E2E.greet');
  await replaceSource(page, 'async (context) => {\n  context.greeting = "hi";\n  return context;\n}');

  await page.getByRole('button', { name: 'Save stage' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'greet' })).toBeVisible();

  const editPage = await request.get('/stage/E2E/greet');
  expect(await editPage.text()).toContain('context.greeting');
});

test('validates required fields and the source', async ({ page }) => {
  await page.goto('/stage/new');
  await replaceSource(page, 'function notAsync() {}');
  await page.getByRole('button', { name: 'Save stage' }).click();

  await expect(page.getByText('Prefix is required.')).toBeVisible();
  await expect(page.getByText('Name is required.')).toBeVisible();
  await expect(page.getByText('The source must be an async function')).toBeVisible();
  await expect(page).toHaveURL('/stage/new');
});

test('shows server errors and keeps what was typed', async ({ page }) => {
  await page.goto('/stage/new');
  await page.getByLabel('Prefix').fill('E2E');
  await page.getByLabel('Name').fill('broken');
  await replaceSource(page, 'async (context) => { return context');

  await page.getByRole('button', { name: 'Save stage' }).click();
  await expect(page.getByRole('alert')).toContainText('The stage could not be saved');
  await expect(page.getByLabel('Name')).toHaveValue('broken');
  await expect(page.locator('.cm-content')).toContainText('return context');
});

test('configures a circuit breaker with fallback', async ({ page, request }) => {
  await page.goto('/stage/new');
  await page.getByLabel('Prefix').fill('E2E');
  await page.getByLabel('Name').fill('slow');
  await replaceSource(page, 'async (context) => {\n  await new Promise(r => setTimeout(r, 500));\n  context.slow = true;\n  return context;\n}');

  await expect(page.getByLabel('Timeout')).toBeHidden();
  await page.getByRole('checkbox', { name: 'Enable circuit breaker' }).check();
  await page.getByLabel('Timeout').fill('50');
  await page.getByText('Run a fallback stage').click();
  await page.getByRole('button', { name: 'Save stage' }).click();
  await expect(page.getByText('Select the stage to run instead.')).toBeVisible();

  await page.getByLabel('Fallback stage', { exact: true }).selectOption('Fallback.Return Context');
  await page.getByRole('button', { name: 'Save stage' }).click();
  await expect(page).toHaveURL('/');

  const editor = await request.get('/stage/E2E/slow');
  const html = await editor.text();
  expect(html).toContain('value="50"');
  expect(html).toMatch(/<option value="Fallback.Return Context" selected/);
});

test('saves with the keyboard shortcut', async ({ page }) => {
  await page.goto('/stage/new');
  await page.getByLabel('Prefix').fill('E2E');
  await page.getByLabel('Name').fill('shortcut');
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: 'shortcut' })).toBeVisible();
});
