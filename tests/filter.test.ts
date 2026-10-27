import { describe, test, expect, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/app';

describe('production environment', () => {
  afterEach(() => {
    process.env['CHUPIM_ENV'] = 'development';
  });

  test.each([
    ['get', '/pipeline/new'],
    ['get', '/pipeline/update/v1/helloworld'],
    ['get', '/pipeline/remove/v1/helloworld'],
    ['get', '/stage/new'],
    ['post', '/pipeline'],
    ['post', '/stage'],
  ] as const)('%s %s is forbidden', async (method, path) => {
    process.env['CHUPIM_ENV'] = 'production';
    const res = await request(app)[method](path);
    expect(res.status).toBe(403);
  });

  test.each(['/', '/metrics', '/api', '/api/v1/helloworld'])('GET %s is allowed', async (path) => {
    process.env['CHUPIM_ENV'] = 'production';
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
  });
});
