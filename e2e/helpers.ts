import { expect, type APIRequestContext, type Page } from '@playwright/test';

export async function createStage(request: APIRequestContext, prefix: string, name: string, source: string) {
  const response = await request.post('/stage', { form: { prefix, name, source }, maxRedirects: 0 });
  expect(response.status()).toBe(302);
}

export async function createPipeline(request: APIRequestContext, path: string, name: string, stages: unknown, methods = ['GET']) {
  const form = new URLSearchParams({ path, name, stages: JSON.stringify(stages), elements: '{}', enabled: 'true' });
  for (const m of methods) form.append('methods', m);
  const response = await request.post('/pipeline', {
    data: form.toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(302);
}

/** Position of a graph node on the page, from the cytoscape instance exposed by the editor. */
export async function nodePosition(page: Page, id: string) {
  const rendered = await page.evaluate(nodeId => {
    const cy = (window as any).cy;
    const node = cy.getElementById(nodeId);
    return node.renderedPosition();
  }, id);
  const canvas = await page.locator('#canvas').boundingBox();
  return { x: canvas!.x + rendered.x, y: canvas!.y + rendered.y };
}

/** Id of the graph node of a stage, by its prefix.name */
export async function nodeId(page: Page, configName: string): Promise<string> {
  return page.evaluate(name => (window as any).cy.nodes().filter((n: any) => n.data('configName') == name)[0].id(), configName);
}

/** Connects two graph nodes by dragging the edge handle, as a user would. */
export async function connect(page: Page, sourceId: string, targetId: string) {
  const source = await nodePosition(page, sourceId);
  await page.mouse.move(source.x, source.y);
  const handle = page.locator('[data-edge-handle]');
  await expect(handle).toBeVisible();
  const box = (await handle.boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const target = await nodePosition(page, targetId);
  await page.mouse.move(target.x, target.y, { steps: 10 });
  await page.waitForTimeout(250);
  await page.mouse.up();
}
