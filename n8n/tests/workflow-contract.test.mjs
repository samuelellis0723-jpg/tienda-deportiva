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

test('updated workflow is inactive, importable, and routes all supported actions', () => {
  assert.equal(workflow.name, 'OJE · consultas y asistente de catálogo');
  assert.equal(workflow.active, false);
  assert.equal(byName.get('OJE Webhook').parameters.httpMethod, 'POST');
  assert.equal(byName.get('OJE Webhook').parameters.path, 'oje-assistant');
  assert.equal(byName.get('OJE Webhook').parameters.responseData, 'firstEntryJson');
  assert.match(byName.get('OJE Webhook').parameters.options.allowedOrigins, /localhost:5173/);
  assert.match(byName.get('OJE Webhook').parameters.options.allowedOrigins, /127\.0\.0\.1:5173/);
  assert.deepEqual(workflow.nodes.find((node) => node.type === 'n8n-nodes-base.switch').parameters.rules.values.map((rule) => rule.outputKey), ['cities', 'coverage', 'description', 'recommend', 'invalid']);
  assert.match(byName.get('Consultar ciudades OJE').parameters.url, /\$vars\.OJE_API_BASE_URL.*\/api\/ciudades/);
  assert.match(byName.get('Cotizar envío OJE').parameters.url, /\$vars\.OJE_API_BASE_URL.*\/api\/envios\/cotizar/);
  assert.match(byName.get('Consultar catálogo publicado').parameters.url, /\$vars\.OJE_API_BASE_URL.*\/api\/productos/);
  assert.equal(byName.get('AI Agent OJE').type, '@n8n/n8n-nodes-langchain.agent');
  assert.equal(byName.get('DeepSeek Chat Model').type, '@n8n/n8n-nodes-langchain.lmChatDeepSeek');
  assert.equal('credentials' in byName.get('DeepSeek Chat Model'), false);
  assert.equal(byName.has('Simple Memory'), true);
  assert.equal(byName.get('AI Agent OJE').onError, 'continueErrorOutput');
});

test('request validation accepts supported payloads and routes invalid input safely', () => {
  assert.equal(runCode('Validar solicitud', { body: { action: 'cities' } })[0].json.route, 'cities');
  assert.deepEqual(JSON.parse(JSON.stringify(runCode('Validar solicitud', { body: { action: 'coverage', cityId: '2', subtotal: 1250.5 } })[0].json)), { route: 'coverage', action: 'coverage', cityId: 2, subtotal: 1250.5 });
  assert.equal(runCode('Validar solicitud', { body: { action: 'coverage', cityId: -1, subtotal: 0 } })[0].json.route, 'error');
  assert.equal(runCode('Validar solicitud', { body: { action: 'not-a-route' } })[0].json.route, 'error');
  assert.equal(runCode('Validar solicitud', { body: { action: 'description', name: '', category: 'Judo' } })[0].json.route, 'error');
  assert.equal(runCode('Validar solicitud', { body: { action: 'description', name: 'Judogi', category: 'Judo', features: ['azul'] } })[0].json.route, 'description');
  assert.equal(runCode('Validar solicitud', { body: { action: 'recommend', items: [{ productId: 4, name: 'Kimono' }] } })[0].json.route, 'recommend');
});

test('description prompt uses supplied name, category, and confirmed features; model output is validated', () => {
  const request = { action: 'description', name: 'Judogi', category: 'Judo', features: ['azul'] };
  const prepared = runCode('Preparar descripción', {}, { 'Validar solicitud': request })[0].json;
  assert.match(prepared.prompt, /Judogi/);
  assert.match(prepared.prompt, /Judo/);
  assert.match(prepared.prompt, /azul/);
  assert.match(prepared.prompt, /No inventes/);
  const result = runCode('Validar respuesta IA', { output: '{"description":"Equipo para acompañar tu práctica de Judo."}' }, { 'Validar solicitud': request })[0].json;
  assert.equal(result.ok, true);
  assert.equal(result.data.description, 'Equipo para acompañar tu práctica de Judo.');
  assert.equal(runCode('Validar respuesta IA', { output: 'no es JSON' }, { 'Validar solicitud': request })[0].json.ok, false);
});

test('recommendations use the live catalog, tolerate Spanish fields, and exclude cart and invented IDs', () => {
  const products = [
    { id: 1, nombre: 'Producto del carrito', estado: 'publicado' },
    { id: 2, name: 'Producto validado', estado: 'publicado', categorias: [{ nombre: 'Judo' }] },
    { id: 3, name: 'No publicado', estado: 'borrador' },
  ];
  const prepared = runCode('Preparar recomendación', { body: { data: products } }, { 'Validar solicitud': { items: [{ productId: 1, name: 'Producto del carrito' }] } })[0].json;
  assert.equal(prepared.ready, true);
  assert.match(prepared.prompt, /Producto validado/);
  assert.doesNotMatch(prepared.prompt, /No publicado/);
  const result = runCode('Validar respuesta IA', { output: '{"ids":[1,999,2,2,3]}' }, {
    'Validar solicitud': { action: 'recommend', items: [{ productId: 1 }] },
    'Preparar recomendación': prepared,
  })[0].json;
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.data.products)), [products[1]]);
  const empty = runCode('Preparar recomendación', { data: [] }, { 'Validar solicitud': { items: [] } })[0].json;
  assert.equal(empty.ready, false);
});

test('cities, coverage, and error branches keep the frontend wrapper contract', () => {
  const cities = runCode('Normalizar ciudades', { data: [{ id: 7, name: 'San José', province: 'San José', shippingCost: 1500 }] })[0].json;
  assert.deepEqual(JSON.parse(JSON.stringify(cities)), { ok: true, data: [{ id: 7, name: 'San José', province: 'San José', shippingCost: 1500 }], error: null });
  const coverage = runCode('Normalizar cobertura', { data: { covered: true, shippingCost: 0, freeShipping: true, freeShippingThreshold: 35000, message: 'Envío gratis.' } })[0].json;
  assert.equal(coverage.ok, true);
  assert.equal(coverage.data.covered, true);
  assert.equal(coverage.data.shippingCost, 0);
  assert.equal(coverage.error, null);
  assert.equal(runCode('Normalizar cobertura', { data: { error: 'internal' }, statusCode: 503 })[0].json.error, 'No se pudo cotizar el envío.');
  assert.deepEqual(JSON.parse(JSON.stringify(runCode('Error de ciudades y cobertura', {})[0].json)), { ok: false, data: null, error: 'No se pudo consultar el servicio de OJE.' });
  assert.equal(runCode('Error del asistente', {})[0].json.ok, false);
});
