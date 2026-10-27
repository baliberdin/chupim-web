import { test, expect } from 'vitest';
import request from 'supertest';
import * as chupim from 'chupim';
import app from '../src/app';

test('GET /errors lists newest first without reordering the error log', async () => {
  chupim.errors.addError('ErrorsTests.first', new Error('errors-test-message-first'));
  await new Promise(resolve => setTimeout(resolve, 5));
  chupim.errors.addError('ErrorsTests.second', new Error('errors-test-message-second'));

  const keys = () => chupim.errors.errorsLog.map(e => e.key).filter(k => k.startsWith('ErrorsTests.'));
  expect(keys()).toEqual(['ErrorsTests.first', 'ErrorsTests.second']);

  const res = await request(app).get('/errors');
  expect(res.status).toBe(200);
  expect(res.text.indexOf('errors-test-message-second')).toBeLessThan(res.text.indexOf('errors-test-message-first'));

  // The log is evicted from the start, so it must stay ordered from oldest to newest
  expect(keys()).toEqual(['ErrorsTests.first', 'ErrorsTests.second']);
});
