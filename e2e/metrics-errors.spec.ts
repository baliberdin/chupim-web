import { test, expect } from '@playwright/test';
import { createPipeline, createStage } from './helpers';

test('charts the selected resources and remembers the selection', async ({ page, request }) => {
  await request.get('/api/v1/helloworld');
  await page.goto('/metrics');
  await expect(page.getByText('Nothing selected')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Helo World API' }).check();
  await expect(page.getByRole('heading', { name: 'Helo World API', level: 3 })).toBeVisible();
  await expect(page.locator('[data-charts] canvas')).toHaveCount(1);

  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Helo World API' })).toBeChecked();
  await expect(page.locator('[data-charts] canvas')).toHaveCount(1);

  await page.getByRole('button', { name: 'Remove chart' }).click();
  await expect(page.getByText('Nothing selected')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Helo World API' })).not.toBeChecked();
});

test('lists errors with stack trace and filters by source', async ({ page, request }) => {
  await createStage(request, 'Broken', 'boom', 'async () => { throw new Error("e2e boom"); }');
  await createPipeline(request, 'e2e/boom', 'Boom', ['Broken.boom']);
  await request.get('/api/e2e/boom');

  await page.goto('/errors');
  const entry = page.locator('details').filter({ hasText: 'e2e boom' }).first();
  await expect(entry).toBeVisible();
  await entry.locator('summary').click();
  await expect(entry.locator('pre')).toContainText('Error: e2e boom');

  await page.getByLabel('Source').selectOption('Broken.boom');
  await expect(page).toHaveURL(/key=Broken.boom/);
  await expect(page.locator('details')).not.toHaveCount(0);
  for (const badge of await page.locator('details .badge.font-mono').allTextContents()) {
    expect(badge).toBe('Broken.boom');
  }
});
