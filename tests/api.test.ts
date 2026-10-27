import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app';

import * as chupim from 'chupim';

chupim.registerStage({
  prefix: 'ApiTests',
  name: 'fails',
  fn: async () => { throw new Error('stage failure'); }
});

chupim.registerComponent({
  id: 'v1/failing',
  name: 'Failing API',
  stages: ['ApiTests.fails'],
  enabled: true,
  methods: ['GET']
});

describe('api', () => {
  test('GET /api lists the registered resources', async () => {
    const res = await request(app).get('/api').set('Host', 'localhost:3000');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.body.links.self).toBe('http://localhost:3000/api');
    expect(res.body.resources).toContainEqual({
      name: 'Helo World API',
      uri: 'v1/helloworld',
      link: 'http://localhost:3000/api/v1/helloworld',
      state: 'enabled'
    });
  });

  test('GET executes the pipeline and hides chupim metadata', async () => {
    const res = await request(app).get('/api/v1/helloworld');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.body.say).toBe('Hello World!');
    expect(res.body._chupim_).toBeUndefined();
  });

  test('pipeline without result returns 500', async () => {
    // "HTTP Filters.Get?" returns nothing for POST requests
    const res = await request(app).post('/api/v1/helloworld');
    expect(res.status).toBe(500);
  });

  test('method not configured returns 405', async () => {
    expect((await request(app).delete('/api/v1/helloworld')).status).toBe(405);
  });

  test('unknown component returns 404', async () => {
    expect((await request(app).get('/api/v1/unknown')).status).toBe(404);
  });

  test('failing pipeline returns 500 and is logged', async () => {
    const res = await request(app).get('/api/v1/failing');
    expect(res.status).toBe(500);

    const errors = await request(app).get('/errors/api').query({key: '/api/v1/failing'});
    expect(errors.status).toBe(200);
    expect(errors.body.errors.length).toBeGreaterThan(0);
    expect(errors.body.errors.every((e: {key: string}) => e.key == '/api/v1/failing')).toBe(true);

    const all = await request(app).get('/errors/api');
    expect(all.body.errors.map((e: {key: string}) => e.key)).toContain('ApiTests.fails');

    const page = await request(app).get('/errors').query({key: '/api/v1/failing'});
    expect(page.status).toBe(200);
    expect(page.text).toContain('stage failure');
  });
});
