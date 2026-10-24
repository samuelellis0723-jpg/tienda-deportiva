import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const workflow = JSON.parse(await readFile(new URL('../oje-assistant.workflow.json', import.meta.url), 'utf8'));
const byName = new Map(workflow.nodes.map((node) => [node.name, node]));

function runCode(name, input, references = {}) {
  const code = byName.get(name)?.parameters?.jsCode;
  assert.ok(code, `missing Code node: ${name}`);
  const context = {
    $input: { first: () => ({ json: input }) },
    $: (nodeName) => ({ first: () => ({ json: references[nodeName] }) }),
  };
  return vm.runInNewContext(`(() => { ${code}\n})()`, context);
}

test('workflow is an inactive importable export with all four action routes', () => {
  assert.equal(workflow.active, false);
  assert.equal(byName.get('OJE Webhook').parameters.httpMethod, 'POST');
  assert.equal(byName.get('OJE Webhook').parameters.path, 'oje-assistant');
  for (const action of ['cities', 'coverage', 'description', 'recommend']) {
    assert.ok(byName.has(action === 'cities' ? 'Consultar ciudades OJE' : action === 'coverage' ? 'Cotizar envío OJE' : action === 'description' ? 'Preparar descripción' : 'Consultar catálogo publicado'));
  }
  assert.equal(byName.get('Consultar ciudades OJE').parameters.url.includes('/api/ciudades'), true);
  assert.equal(byName.get('Cotizar envío OJE').parameters.url.includes('/api/envios/cotizar'), true);
  assert.equal(byName.get('AI Agent OJE').type, '@n8n/n8n-nodes-langchain.agent');
  assert.equal(byName.get('AI Agent OJE').onError, 'continueErrorOutput');
  assert.equal('credentials' in byName.get('Modelo de chat (configurar credencial)'), false);
});

test('request validation accepts cities and coverage, rejects invalid actions and amounts', () => {
  assert.equal(runCode('Validar solicitud', { body: { action: 'cities' } })[0].json.route, 'cities');
  assert.deepEqual(JSON.parse(JSON.stringify(runCode('Validar solicitud', { body: { action: 'coverage', cityId: '2', subtotal: 1250.5 } })[0].json)), { route: 'coverage', action: 'coverage', cityId: 2, subtotal: 1250.5 });
  assert.equal(runCode('Validar solicitud', { body: { action: 'coverage', cityId: -1, subtotal: 0 } })[0].json.ok, false);
  assert.equal(runCode('Validar solicitud', { body: { action: 'not-a-route' } })[0].json.route, 'error');
  const description = runCode('Validar solicitud', { body: { action: 'description', name: 'Judogi', category: 'Judo', features: ['azul'] } })[0].json;
  assert.equal(description.route, 'description');
  assert.equal(runCode('Validar solicitud', { body: { action: 'description', name: '', category: 'Judo' } })[0].json.ok, false);
  assert.equal(runCode('Validar solicitud', { body: { action: 'recommend', items: [{ productId: 4, name: 'Kimono' }] } })[0].json.route, 'recommend');
});

test('description prompt carries provided facts and validates structured model output', () => {
  const request = { action: 'description', name: 'Judogi', category: 'Judo', features: ['azul'] };
  const prepared = runCode('Preparar descripción', {}, { 'Validar solicitud': request })[0].json;
  assert.match(prepared.prompt, /Judogi/);
  assert.match(prepared.prompt, /azul/);
  const result = runCode('Validar respuesta IA', { output: '{"description":"Equipo para acompañar tu práctica de Judo."}' }, { 'Validar solicitud': request })[0].json;
  assert.equal(result.ok, true);
  assert.equal(result.data.description, 'Equipo para acompañar tu práctica de Judo.');
});

test('cities and coverage normalizers preserve the frontend wrapper contract', () => {
  const cities = runCode('Normalizar ciudades', { data: [{ id: 7, name: 'San José', province: 'San José', shippingCost: 1500 }] })[0].json;
  assert.deepEqual(JSON.parse(JSON.stringify(cities)), { ok: true, data: [{ id: 7, name: 'San José', province: 'San José', shippingCost: 1500 }], error: null });
  const coverage = runCode('Normalizar cobertura', { data: { covered: true, shippingCost: 0, freeShipping: true, freeShippingThreshold: 35000 } })[0].json;
  assert.equal(coverage.ok, true);
  assert.equal(coverage.data.covered, true);
  assert.equal(coverage.data.shippingCost, 0);
  assert.equal(coverage.error, null);
  assert.equal(runCode('Normalizar cobertura', { data: { error: 'SQL details' }, statusCode: 503 })[0].json.error, 'No se pudo cotizar el envío.');
});

test('API and model failures return a safe wrapper without internals', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(runCode('Error de ciudades y cobertura', { error: { message: 'private URL' } })[0].json)), { ok: false, data: null, error: 'No se pudo consultar el servicio de OJE.' });
  assert.deepEqual(JSON.parse(JSON.stringify(runCode('Error del asistente', {})[0].json)), { ok: false, data: null, error: 'El asistente de OJE no está disponible.' });
  const malformed = runCode('Validar respuesta IA', { output: 'not-json' }, { 'Validar solicitud': { action: 'description' } })[0].json;
  assert.equal(malformed.ok, false);
  assert.equal(malformed.data, null);
  assert.equal(typeof malformed.error, 'string');
});

test('recommendations drop invented IDs and products already in the cart', () => {
  const products = [{ id: 1, name: 'Producto del carrito', estado: 'publicado' }, { id: 2, name: 'Producto validado', estado: 'publicado' }];
  const result = runCode('Validar respuesta IA', { output: '{"ids":[1,999,2,2]}' }, {
    'Validar solicitud': { action: 'recommend', items: [{ productId: 1 }] },
    'Preparar recomendación': { catalog: products },
  })[0].json;
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.data.products)), [products[1]]);
});
