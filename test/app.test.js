// Automated tests, run by "npm test" (locally, in the Dockerfile and in GitHub Actions)
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { server } = require('../src/app');

let baseUrl;

before(() => new Promise((resolve) => {
  server.listen(0, () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));

after(() => new Promise((resolve) => server.close(resolve)));

test('home page returns 200 and shows the version', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.strictEqual(res.status, 200);
  const body = await res.text();
  assert.match(body, /Version:/);
});

test('health endpoint returns status ok', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});
