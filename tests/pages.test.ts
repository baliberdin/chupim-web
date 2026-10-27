import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('pages', () => {
  test.each(['/', '/metrics', '/pipeline/new', '/stage/new', '/errors'])('GET %s renders a page', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
  });

  test('home lists example stages and pipelines', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('Hello World');
    expect(res.text).toContain('Helo World API');
  });

  test('unknown page renders 404', async () => {
    const res = await request(app).get('/does/not/exist');
    expect(res.status).toBe(404);
  });

  test('GET /metrics/api returns series, filtered by key', async () => {
    await request(app).get('/api/v1/helloworld');

    const all = await request(app).get('/metrics/api');
    expect(all.status).toBe(200);
    expect(Object.keys(all.body.series).length).toBeGreaterThan(0);

    const filtered = await request(app).get('/metrics/api').query({key: '/api/v1/helloworld'});
    const metrics = Object.values(filtered.body.series as Record<string, Record<string, {requests: number}>>)
      .flatMap(s => Object.keys(s));
    expect(metrics.length).toBeGreaterThan(0);
    expect(new Set(metrics)).toEqual(new Set(['/api/v1/helloworld']));
  });
});

describe('pipelines', () => {
  test('POST /pipeline without required fields redirects back to editor', async () => {
    const res = await request(app).post('/pipeline').type('form').send({name: 'Incomplete'});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pipeline/new');
  });

  test('POST /pipeline without body redirects back to editor', async () => {
    const res = await request(app).post('/pipeline');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pipeline/new');
  });

  test('POST /pipeline with invalid stages redirects back to editor', async () => {
    const res = await request(app).post('/pipeline').type('form').send({
      path: 'v1/invalid', name: 'Invalid', stages: 'not json',
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pipeline/new');
    expect((await request(app).get('/api/v1/invalid')).status).toBe(404);
  });

  test('POST /pipeline registers a component', async () => {
    const res = await request(app).post('/pipeline').type('form').send({
      path: 'v1/created',
      name: 'Created Pipeline',
      stages: JSON.stringify(['Hello World.sayHello']),
      elements: JSON.stringify({nodes: [], edges: []}),
      methods: ['GET', 'POST'],
      enabled: 'true',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    const get = await request(app).get('/api/v1/created');
    expect(get.status).toBe(200);
    expect(get.body.say).toBe('Hello World!');

    const post = await request(app).post('/api/v1/created');
    expect(post.status).toBe(200);
  });

  test('POST /pipeline with a single method only accepts that method', async () => {
    await request(app).post('/pipeline').type('form').send({
      path: 'v1/single-method',
      name: 'Single Method',
      stages: JSON.stringify(['Hello World.sayHello']),
      elements: JSON.stringify({nodes: [], edges: []}),
      methods: 'POST',
      enabled: 'true',
    });

    expect((await request(app).post('/api/v1/single-method')).status).toBe(200);
    expect((await request(app).get('/api/v1/single-method')).status).toBe(405);
  });

  test('GET /pipeline/edit renders the editor for a component', async () => {
    const res = await request(app).get('/pipeline/edit/v1/helloworld');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Edit Pipeline');
  });

  test('GET /pipeline/edit of unknown component returns 404', async () => {
    const res = await request(app).get('/pipeline/edit/v1/unknown');
    expect(res.status).toBe(404);
  });

  test('GET /pipeline/update enables and disables a component', async () => {
    await request(app).post('/pipeline').type('form').send({
      path: 'v1/toggle', name: 'Toggle', stages: JSON.stringify(['Hello World.sayHello']),
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });

    const disable = await request(app).get('/pipeline/update/v1/toggle').query({enabled: 'false'});
    expect(disable.status).toBe(200);
    expect(disable.body).toEqual({status: 'success'});
    expect((await request(app).get('/api/v1/toggle')).status).toBe(503);

    await request(app).get('/pipeline/update/v1/toggle').query({enabled: 'true'});
    expect((await request(app).get('/api/v1/toggle')).status).toBe(200);
  });

  test('GET /pipeline/update of unknown component returns 404', async () => {
    expect((await request(app).get('/pipeline/update/v1/unknown').query({enabled: 'true'})).status).toBe(404);
  });

  test('GET /pipeline/remove removes a component', async () => {
    await request(app).post('/pipeline').type('form').send({
      path: 'v1/removable', name: 'Removable', stages: JSON.stringify(['Hello World.sayHello']),
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });
    expect((await request(app).get('/api/v1/removable')).status).toBe(200);

    const res = await request(app).get('/pipeline/remove/v1/removable');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect((await request(app).get('/api/v1/removable')).status).toBe(404);
  });
});

describe('stages', () => {
  test('POST /stage registers a stage from source', async () => {
    const res = await request(app).post('/stage').type('form').send({
      prefix: 'Tests',
      name: 'double',
      source: 'async (c) => { c.value = Number(c._chupim_.query.value) * 2; return c; }',
      'circuitBreaker.enabled': 'false',
    });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');

    await request(app).post('/pipeline').type('form').send({
      path: 'v1/double', name: 'Double', stages: JSON.stringify(['Tests.double']),
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });

    const api = await request(app).get('/api/v1/double').query({value: 21});
    expect(api.status).toBe(200);
    expect(api.body.value).toBe(42);
  });

  test('POST /stage with circuit breaker fallback uses the fallback on timeout', async () => {
    await request(app).post('/stage').type('form').send({
      prefix: 'Tests',
      name: 'slow',
      source: 'async (c) => { await new Promise(r => setTimeout(r, 300)); c.slow = true; return c; }',
      'circuitBreaker.enabled': 'true',
      'circuitBreaker.action': '1',
      'circuitBreaker.fn': 'Fallback.Return Context',
      'circuitBreaker.timeout': '50',
    });

    await request(app).post('/pipeline').type('form').send({
      path: 'v1/slow', name: 'Slow', stages: JSON.stringify(['Tests.slow', 'Hello World.sayHello']),
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });

    const api = await request(app).get('/api/v1/slow');
    expect(api.status).toBe(200);
    expect(api.body.slow).toBeUndefined();
    expect(api.body.say).toBe('Hello World!');
  });

  test('POST /stage source can use require', async () => {
    await request(app).post('/stage').type('form').send({
      prefix: 'Tests',
      name: 'withRequire',
      source: 'async (c) => { c.base = require("path").basename("/a/b.txt"); return c; }',
      'circuitBreaker.enabled': 'false',
    });

    await request(app).post('/pipeline').type('form').send({
      path: 'v1/require', name: 'Require', stages: JSON.stringify(['Tests.withRequire']),
      elements: JSON.stringify({nodes: [], edges: []}), methods: ['GET'], enabled: 'true',
    });

    const api = await request(app).get('/api/v1/require');
    expect(api.status).toBe(200);
    expect(api.body.base).toBe('b.txt');
  });

  test('POST /stage with invalid source shows the error and keeps the form values', async () => {
    const res = await request(app).post('/stage').type('form').send({
      prefix: 'Tests', name: 'invalid', source: 'async (c) => { return c',
    });
    expect(res.status).toBe(400);
    expect(res.text).toContain('The stage could not be saved');
    expect(res.text).toContain('value="invalid"');
    expect((await request(app).get('/stage/Tests/invalid')).status).toBe(404);
  });

  test('GET /stage/:prefix/:name renders the stage editor', async () => {
    const res = await request(app).get('/stage/Hello World/sayHello');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Edit Stage');
    expect(res.text).toContain('Hello World!');
  });

  test('GET /stage of unknown stage returns 404', async () => {
    expect((await request(app).get('/stage/Unknown/stage')).status).toBe(404);
  });
});
