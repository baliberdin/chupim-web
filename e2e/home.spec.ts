import { test, expect } from '@playwright/test';
import { createPipeline } from './helpers';

test('lists resources and stages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Resources', level: 1 })).toBeVisible();
  await expect(page.getByRole('row', { name: /Helo World API/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'sayHello' })).toBeVisible();
});

test('filters stages by search', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search stages').fill('post');
  await expect(page.getByRole('link', { name: 'Post?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'sayHello' })).toBeHidden();

  await page.getByPlaceholder('Search stages').fill('nothing like this');
  await expect(page.getByText('No stages found.')).toBeVisible();
});

test('disables and enables a resource', async ({ page, request }) => {
  await createPipeline(request, 'e2e/toggle', 'Toggle me', ['Hello World.sayHello']);
  await page.goto('/');

  const toggle = page.getByRole('checkbox', { name: 'Enable Toggle me' });
  await toggle.uncheck();
  await expect(page.getByRole('status').filter({ hasText: '/api/e2e/toggle disabled' })).toBeVisible();
  expect((await request.get('/api/e2e/toggle')).status()).toBe(503);

  await toggle.check();
  await expect(page.getByRole('status').filter({ hasText: '/api/e2e/toggle enabled' })).toBeVisible();
  expect((await request.get('/api/e2e/toggle')).status()).toBe(200);
});

test('deletes a resource after confirmation', async ({ page, request }) => {
  await createPipeline(request, 'e2e/delete', 'Delete me', ['Hello World.sayHello']);
  await page.goto('/');

  await page.getByRole('button', { name: 'Delete Delete me' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete "Delete me"?');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('row', { name: /Delete me/ })).toBeVisible();

  await page.getByRole('button', { name: 'Delete Delete me' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('row', { name: /Delete me/ })).toBeHidden();
  expect((await request.get('/api/e2e/delete')).status()).toBe(404);
});
