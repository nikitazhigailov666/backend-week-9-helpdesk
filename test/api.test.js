const { once } = require('node:events');
const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { createApp } = require('../src/app');

let server;
let base;
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

function request(path, method = 'GET', body) {
  return fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body
  });
}

test('проверка запуска и заголовка middleware', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.ok(result.headers.get('x-request-id'));
  assert.deepEqual(await result.json(), { status: 'ok' });
});

test('создание, чтение, изменение, фильтрация и удаление заявки', async () => {
  const created = await request('/api/tickets', 'POST', '{"title":"  Не работает Wi-Fi  "}');
  assert.equal(created.status, 201);
  const ticket = await created.json();
  assert.equal(ticket.title, 'Не работает Wi-Fi');
  assert.equal(ticket.status, 'open');
  const path = '/api/tickets/' + ticket.id;
  assert.equal(created.headers.get('location'), path);
  assert.deepEqual(await (await request(path)).json(), ticket);
  const changed = await request(path, 'PATCH', '{"status":"closed"}');
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).status, 'closed');
  assert.deepEqual(await (await request('/api/tickets?status=open')).json(), []);
  assert.equal((await (await request('/api/tickets?status=closed')).json())[0].id, ticket.id);
  assert.equal((await request(path, 'DELETE')).status, 204);
  assert.equal((await request(path)).status, 404);
});

test('ошибки формата, параметров, маршрутизации и ограничения тела', async () => {
  for (const [path, method, body, expected] of [
    ['/api/tickets', 'POST', '{"title":" "}', 400],
    ['/api/tickets', 'POST', '{', 400],
    ['/api/tickets?status=invalid', 'GET', undefined, 400],
    ['/api/tickets?status=open&status=closed', 'GET', undefined, 400],
    ['/api/tickets', 'POST', JSON.stringify({ title: 'x'.repeat(17000) }), 413],
    ['/absent', 'GET', undefined, 404]
  ]) {
    const response = await request(path, method, body);
    assert.equal(response.status, expected);
    assert.ok(response.headers.get('x-request-id'));
    assert.equal(typeof (await response.json()).error, 'string');
  }
});
