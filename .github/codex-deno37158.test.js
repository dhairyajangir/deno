import assert from 'node:assert/strict';

for (const [name, create] of [
  ['Response constructor', (init) => new Response(null, init)],
  ['Response.json', (init) => Response.json(null, init)],
]) {
  Deno.test(`${name}: reads and converts dictionary members once in WebIDL order`, () => {
    const seen = [];
    const init = {
      get headers() { seen.push('headers'); return { get 'X-Test'() { seen.push('header value'); return 'yes'; } }; },
      get status() { seen.push('status'); return 200; },
      get statusText() { seen.push('statusText'); return 'OK'; },
    };
    const response = create(init);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-test'), 'yes');
    assert.deepEqual(seen, ['headers', 'header value', 'status', 'statusText']);
  });

  Deno.test(`${name}: header conversion error precedes later member getters`, () => {
    const seen = [];
    const expected = new Error('header conversion');
    const init = {
      get headers() { seen.push('headers'); return { get 'X-Test'() { seen.push('header value'); throw expected; } }; },
      get status() { seen.push('status'); throw new Error('status getter'); },
    };
    assert.throws(() => create(init), (error) => error === expected);
    assert.deepEqual(seen, ['headers', 'header value']);
  });
}

Deno.test('Response.json converts init before data serialization', () => {
  const seen = [];
  const data = { toJSON() { seen.push('toJSON'); return { ok: true }; } };
  const init = {
    get headers() { seen.push('headers'); return {}; },
    get status() { seen.push('status'); return 200; },
    get statusText() { seen.push('statusText'); return 'OK'; },
  };
  Response.json(data, init);
  assert.deepEqual(seen, ['headers', 'status', 'statusText', 'toJSON']);
});

Deno.test('Response.json init failure precedes data serialization failure', () => {
  const expected = new Error('init getter');
  const data = { toJSON() { throw new Error('toJSON'); } };
  const init = { get headers() { throw expected; } };
  assert.throws(() => Response.json(data, init), (error) => error === expected);
});
