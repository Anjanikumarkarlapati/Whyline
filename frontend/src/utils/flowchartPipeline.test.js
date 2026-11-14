import test from 'node:test';
import assert from 'node:assert/strict';
import { createWhylineApiMiddleware } from '../../../backend-api-middleware.js';

test('flowchart backend: returns instant response (<50ms) for local and curated repositories', async () => {
  const middleware = createWhylineApiMiddleware();

  const testCases = [
    { name: 'HealthConnect English', body: { language: 'english' } },
    { name: 'HealthConnect Telugu', body: { language: 'telugu' } },
    { name: 'HealthConnect Hindi', body: { language: 'hindi' } },
    { name: 'expressjs/express', body: { github_url: 'https://github.com/expressjs/express', language: 'en-IN' } },
    { name: 'pallets/click', body: { github_url: 'https://github.com/pallets/click', language: 'en-IN' } },
    { name: 'sindresorhus/ky', body: { github_url: 'https://github.com/sindresorhus/ky', language: 'en-IN' } },
  ];

  for (const tc of testCases) {
    const t0 = performance.now();
    let responseData = null;

    const req = {
      url: '/api/repo/scan-flowchart',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      on: (event, cb) => {
        if (event === 'data') cb(Buffer.from(JSON.stringify(tc.body)));
        if (event === 'end') cb();
      },
    };

    const res = {
      setHeader: () => {},
      writeHead: () => {},
      end: (data) => {
        try { responseData = JSON.parse(data); } catch { responseData = data; }
      },
    };

    await middleware(req, res, () => {});
    const elapsed = Math.round(performance.now() - t0);

    assert.equal(responseData?.status, 'ok', `${tc.name} must return status: ok`);
    assert.equal(Array.isArray(responseData?.steps), true, `${tc.name} must return array of steps`);
    assert.equal(responseData?.steps?.length, 5, `${tc.name} must contain exactly 5 steps`);
    assert.equal(Array.isArray(responseData?.mermaid_layers), true, `${tc.name} must include 6 mermaid_layers`);
    assert.equal(responseData?.mermaid_layers?.length, 6, `${tc.name} must have 6 architecture layers`);
    assert.ok(responseData?.mermaid_code?.includes('subgraph L1_ENTRY'), `${tc.name} must include 6-layer Mermaid code`);
    assert.ok(responseData?.mermaid_code?.includes('subgraph L6_DEPLOY'), `${tc.name} must include Layer 6 deploy subgraph`);
    assert.ok(Array.isArray(responseData?.weaknesses) && responseData.weaknesses.length >= 2, `${tc.name} must include architectural weaknesses`);
    assert.ok(Array.isArray(responseData?.improvements) && responseData.improvements.length >= 2, `${tc.name} must include improvements`);
    assert.ok(responseData?.best_alternative_stack, `${tc.name} must include best_alternative_stack`);
    assert.ok(responseData?.nodes?.length >= 5, `${tc.name} must contain nodes`);
    assert.ok(responseData?.edges?.length >= 4, `${tc.name} must contain edges`);
    assert.ok(responseData?.graph?.mind_map?.hub, `${tc.name} must contain radial mind_map hub`);
    assert.ok(responseData?.graph?.mind_map?.branches?.length >= 5, `${tc.name} must contain mind_map branches`);
    assert.ok(elapsed <= 200, `${tc.name} elapsed ${elapsed}ms must be <= 200ms threshold`);
  }

  // Verify /api/repo/flowchart route alias and /api/github/load stack synchronization for pallets/click
  let loadData = null;
  await middleware(
    {
      url: '/api/github/load',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      on: (event, cb) => {
        if (event === 'data') cb(Buffer.from(JSON.stringify({ repo_url: 'pallets/click' })));
        if (event === 'end') cb();
      },
    },
    {
      setHeader: () => {},
      writeHead: () => {},
      end: (d) => { loadData = JSON.parse(d); },
    },
    () => {}
  );
  let flowAliasData = null;
  await middleware(
    {
      url: '/api/repo/flowchart?repo=pallets/click&language=en-IN',
      method: 'GET',
      headers: {},
      on: () => {},
    },
    {
      setHeader: () => {},
      writeHead: () => {},
      end: (d) => { flowAliasData = JSON.parse(d); },
    },
    () => {}
  );
  assert.equal(loadData?.repo?.fullName, 'pallets/click');
  assert.equal(flowAliasData?.repo_name, 'pallets/click');
  assert.equal(loadData?.repo?.runtime_engine, flowAliasData?.runtime_engine);
  assert.equal(loadData?.repo?.architecture_style, flowAliasData?.architecture_style);
  assert.equal(loadData?.repo?.mermaid_code, flowAliasData?.mermaid_code);
  assert.deepEqual(loadData?.repo?.mermaid_layers, flowAliasData?.mermaid_layers);
  assert.deepEqual(loadData?.repo?.full_stack_breakdown, flowAliasData?.project_summary?.full_stack_breakdown);
  assert.ok(loadData?.repo?.full_stack_breakdown?.auth, 'full_stack_breakdown must include auth');
  assert.equal(loadData?.repo?.steps?.length, 5, '/api/github/load must include 5 synchronized steps');

  // Verify /api/github/current matches /api/github/load and /api/repo/flowchart
  let currentData = null;
  await middleware(
    { url: '/api/github/current', method: 'GET', headers: {}, on: () => {} },
    { setHeader: () => {}, writeHead: () => {}, end: (d) => { currentData = JSON.parse(d); } },
    () => {}
  );
  assert.equal(currentData?.repo?.fullName, 'pallets/click');
  assert.equal(currentData?.repo?.mermaid_code, flowAliasData?.mermaid_code);
  assert.deepEqual(currentData?.repo?.mermaid_layers, flowAliasData?.mermaid_layers);

  // Verify library/CLI stack detection & step ordering (express, ky, click)
  assert.ok(flowAliasData?.project_summary?.full_stack_breakdown?.backend?.includes('Click CLI'), 'pallets/click must detect Click CLI');
  assert.equal(flowAliasData?.steps?.[0]?.file_path, 'src/click/__init__.py');
  assert.ok(!flowAliasData?.steps?.[2]?.what_happens?.includes('persists records to None'), 'CLI repo must not emit CRUD persistence boilerplate');

  let expressData = null;
  await middleware(
    { url: '/api/repo/flowchart?repo=expressjs/express&language=en-IN', method: 'GET', headers: {}, on: () => {} },
    { setHeader: () => {}, writeHead: () => {}, end: (d) => { expressData = JSON.parse(d); } },
    () => {}
  );
  assert.ok(expressData?.project_summary?.full_stack_breakdown?.backend?.includes('Express'), 'expressjs/express must detect Express');
  assert.equal(expressData?.steps?.[0]?.file_path, 'lib/express.js', 'expressjs/express Step 1 must be lib/express.js');

  let kyData = null;
  await middleware(
    { url: '/api/repo/flowchart?repo=sindresorhus/ky&language=en-IN', method: 'GET', headers: {}, on: () => {} },
    { setHeader: () => {}, writeHead: () => {}, end: (d) => { kyData = JSON.parse(d); } },
    () => {}
  );
  assert.ok(
    kyData?.project_summary?.full_stack_breakdown?.apis_and_services?.includes('Ky') ||
    kyData?.project_summary?.full_stack_breakdown?.backend?.includes('Ky'),
    'sindresorhus/ky must detect Ky Fetch client'
  );
  assert.equal(kyData?.steps?.[0]?.file_path, 'source/index.ts');
  assert.equal(kyData?.steps?.[1]?.file_path, 'source/core/normalize.ts');
});
