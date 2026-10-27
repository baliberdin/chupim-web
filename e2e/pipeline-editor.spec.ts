import { test, expect } from '@playwright/test';
import { connect, createPipeline, createStage, nodeId } from './helpers';

test.beforeAll(async ({ request }) => {
  await createStage(request, 'Flow', 'first', 'async (c) => { c.order = [...(c.order || []), "first"]; return c; }');
  await createStage(request, 'Flow', 'left', 'async (c) => { c.left = true; return c; }');
  await createStage(request, 'Flow', 'right', 'async (c) => { c.right = true; return c; }');
});

async function save(page: import('@playwright/test').Page, name: string, path: string) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel('Endpoint').fill(path);
  await dialog.getByRole('button', { name: 'Save pipeline' }).click();
  await expect(page).toHaveURL('/');
}

test('builds a serial pipeline by clicking stages', async ({ page, request }) => {
  await page.goto('/pipeline/new');
  await expect(page.getByRole('status')).toContainText('Add stages');

  await page.getByRole('button', { name: 'first' }).click();
  await page.getByRole('button', { name: 'sayHello' }).click();
  await expect(page.getByRole('status')).toContainText('Ready to save · 2 stages');

  await save(page, 'Serial flow', 'e2e/serial');
  await expect(page.getByRole('row', { name: /Serial flow/ })).toBeVisible();

  const response = await request.get('/api/e2e/serial');
  expect(await response.json()).toMatchObject({ order: ['first'], say: 'Hello World!' });
});

test('builds parallel branches by dragging connections', async ({ page, request }) => {
  await page.goto('/pipeline/new');
  await page.getByRole('button', { name: 'first' }).click();

  // Unselect everything, so the next stages are added without connections
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'left' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'right' }).click();
  await page.getByRole('button', { name: 'Auto layout' }).click();
  await page.waitForTimeout(400);

  const first = await nodeId(page, 'Flow.first');
  const left = await nodeId(page, 'Flow.left');
  const right = await nodeId(page, 'Flow.right');

  // first → Output is replaced by first → (left, right) → Output
  await page.evaluate(id => (window as any).cy.getElementById(id).outgoers('edge').remove(), first);
  await connect(page, first, left);
  await connect(page, first, right);
  await connect(page, left, 'Output');
  await connect(page, right, 'Output');
  await expect(page.getByRole('status')).toContainText('Ready to save · 3 stages');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog').locator('[data-stages-preview]'))
    .toHaveText(JSON.stringify(['Flow.first', [['Flow.left'], ['Flow.right']]], null, 2));
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  await save(page, 'Parallel flow', 'e2e/parallel');
  expect(await (await request.get('/api/e2e/parallel')).json()).toMatchObject({ order: ['first'], left: true, right: true });
});

test('deleting a stage keeps the chain connected', async ({ page }) => {
  await page.goto('/pipeline/new');
  await page.getByRole('button', { name: 'first' }).click();
  await page.getByRole('button', { name: 'left' }).click();
  await page.getByRole('button', { name: 'right' }).click();

  // "left" is in the middle: removing it connects first → right
  await page.evaluate(id => { const cy = (window as any).cy; cy.$(':selected').unselect(); cy.getElementById(id).select(); }, await nodeId(page, 'Flow.left'));
  await page.getByRole('button', { name: 'Delete selection' }).click();

  await expect(page.getByRole('status')).toContainText('Ready to save · 2 stages');
});

test('reports an incomplete pipeline and blocks saving', async ({ page }) => {
  await page.goto('/pipeline/new');
  await page.getByRole('button', { name: 'first' }).click();
  await page.evaluate(() => (window as any).cy.edges('[target = "Output"]').remove());
  await page.getByRole('button', { name: 'left' }).click();
  await page.evaluate(() => (window as any).cy.edges('[target = "Output"]').remove());
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Auto layout' }).click();

  // Status is refreshed on the next change
  await page.getByRole('button', { name: 'right' }).click();
  await expect(page.getByRole('status')).toContainText('Connect the last stage to Output.');

  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.getByRole('alert')).toContainText('Connect the last stage to Output.');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('validates the save form', async ({ page }) => {
  await page.goto('/pipeline/new');
  await page.getByRole('button', { name: 'first' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Endpoint').fill('has spaces');
  await dialog.getByText('GET', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Save pipeline' }).click();

  await expect(dialog.getByText('Name is required.')).toBeVisible();
  await expect(dialog.getByText('Use letters, numbers')).toBeVisible();
  await expect(dialog.getByText('Select at least one method.')).toBeVisible();
});

test('opens an existing pipeline with its graph', async ({ page, request }) => {
  await createPipeline(request, 'e2e/existing', 'Existing', ['Flow.first', [['Flow.left'], ['Flow.right']], 'Hello World.sayHello']);
  await page.goto('/pipeline/edit/e2e/existing');

  await expect(page.getByRole('heading', { name: 'Existing' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Ready to save · 4 stages');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog').locator('[data-stages-preview]'))
    .toHaveText(JSON.stringify(['Flow.first', [['Flow.left'], ['Flow.right']], 'Hello World.sayHello'], null, 2));
});
