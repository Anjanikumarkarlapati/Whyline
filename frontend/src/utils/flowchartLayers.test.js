import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCH_LAYERS,
  applyThemeClassDefs,
  buildFallbackSixLayerMermaid,
  findMatchingStepForMermaidNode,
  matchesLayerFilter,
  normalizeArchLayers,
  normalizeBestAlternative,
  normalizeCritiqueList,
  readMermaidThemeConfig,
  sanitizeMermaidId,
  sanitizeMermaidLabel,
  stripMermaidFences,
} from './flowchartLayers.js';

test('stripMermaidFences removes markdown mermaid wrappers cleanly', () => {
  const wrapped = '```mermaid\nflowchart TD\n  A --> B\n```';
  assert.equal(stripMermaidFences(wrapped), 'flowchart TD\n  A --> B');
  assert.equal(stripMermaidFences('flowchart TD\n  A --> B'), 'flowchart TD\n  A --> B');
});

test('sanitizeMermaidId and sanitizeMermaidLabel strip unsafe Mermaid syntax chars', () => {
  assert.equal(sanitizeMermaidId('123/src/app.ts'), 'n_123_src_app_ts');
  const label = sanitizeMermaidLabel('Result<User, Error> [handler] "v2"\nline2');
  assert.ok(!label.includes('<') && !label.includes('>') && !label.includes('[') && !label.includes('"'));
  assert.ok(label.includes('Result'));
});

test('applyThemeClassDefs appends theme classDefs only to valid flowcharts', () => {
  const { layerPalette } = readMermaidThemeConfig();
  const valid = 'flowchart TD\n  A["Entry"]:::entry --> B["Core"]:::core';
  const styled = applyThemeClassDefs(valid, layerPalette);
  assert.match(styled, /classDef entry fill:/);
  assert.match(styled, /classDef core fill:/);

  const invalid = 'not valid mermaid :::entry %%%';
  assert.equal(applyThemeClassDefs(invalid, layerPalette), invalid);
});

test('normalizeArchLayers normalizes both array and object inputs into 6 ordered layers', () => {
  assert.equal(ARCH_LAYERS.length, 6);
  const layers = normalizeArchLayers({
    mermaid_layers: [
      { key: 'entry', title: 'Frontend Entry', files: ['src/App.jsx', 'src/main.jsx'] },
      { key: 'data', title: 'Data Store', items: ['pgPool.js'] },
    ],
  });
  assert.equal(layers.length, 6);
  assert.equal(layers[0].title, 'Frontend Entry');
  assert.deepEqual(layers[0].items, ['src/App.jsx', 'src/main.jsx']);
  assert.equal(layers[3].key, 'data');
  assert.deepEqual(layers[3].items, ['pgPool.js']);
});

test('buildFallbackSixLayerMermaid generates 6 subgraphs using step file_path values', () => {
  const mmd = buildFallbackSixLayerMermaid({
    project_summary: { project_name: 'ky', primary_stack: 'TypeScript + Vitest' },
    steps: [
      { step_number: 1, file_path: 'source/index.ts' },
      { step_number: 2, file_path: 'source/core/Ky.ts' },
      { step_number: 3, file_path: 'source/utils/merge.ts' },
      { step_number: 4, file_path: 'source/errors/HTTPError.ts' },
      { step_number: 5, file_path: 'package.json' },
    ],
  });
  assert.match(mmd, /^flowchart TD/);
  assert.match(mmd, /subgraph L1/);
  assert.match(mmd, /subgraph L6/);
  assert.match(mmd, /source\/core\/Ky\.ts/);
});

test('findMatchingStepForMermaidNode maps clicked Mermaid nodes to the right step index', () => {
  const steps = [
    { step_number: 1, file_path: 'source/index.ts', symbol_name: 'ky', title: 'Entry' },
    { step_number: 2, file_path: 'source/core/Ky.ts', symbol_name: 'Ky.create', title: 'Core Engine' },
    { step_number: 3, file_path: 'source/errors/HTTPError.ts', symbol_name: 'HTTPError', title: 'Error Handling' },
  ];
  assert.equal(findMatchingStepForMermaidNode('N_ky_core', 'Ky.ts Ky.create', steps), 1);
  assert.equal(findMatchingStepForMermaidNode('N_step3', 'HTTPError.ts', steps), 2);
});

test('normalizeCritiqueList and normalizeBestAlternative normalize heterogeneous backend formats', () => {
  const weaknesses = normalizeCritiqueList([
    'Global rate-limit cooldown: Single shared timer blocks healthy raw fetches',
    { title: 'Blocking Tree Fetch', detail: 'No non-recursive fallback', severity: 'high' },
  ]);
  assert.equal(weaknesses.length, 2);
  assert.equal(weaknesses[0].title, 'Global rate-limit cooldown');
  assert.equal(weaknesses[1].tag, 'high');

  const bestAlt = normalizeBestAlternative({
    stack: 'Fastify + Zod + Redis',
    why: 'Low-latency schema validation and isolated circuit breakers',
    tradeoffs: 'Requires Redis ops',
  });
  assert.equal(bestAlt.title, 'Fastify + Zod + Redis');
  assert.match(bestAlt.summary, /circuit breakers/);

  const backendAlt = normalizeBestAlternative({
    name: 'Rust (Axum + Tokio)',
    reason: 'Zero GC pauses and strict compile-time typing',
    migration_fit: 'Best when scaling edge throughput',
  });
  assert.equal(backendAlt.title, 'Rust (Axum + Tokio)');
  assert.equal(backendAlt.tradeoffs, 'Best when scaling edge throughput');
});

test('matchesLayerFilter matches Mermaid class names, node IDs, and cluster subgraphs across all 6 layers', () => {
  const fakeEntryNode = {
    id: 'flowchart-E1-10',
    getAttribute: (attr) => (attr === 'class' ? 'node default entryLayer' : 'E1'),
    closest: () => null,
  };
  const fakeExtNode = {
    id: 'flowchart-X1-12',
    getAttribute: (attr) => (attr === 'class' ? 'node default externalLayer' : 'X1'),
    closest: () => ({ id: 'L5_EXTERNAL', getAttribute: () => 'L5_EXTERNAL' }),
  };
  assert.equal(matchesLayerFilter(fakeEntryNode, 'entry'), true);
  assert.equal(matchesLayerFilter(fakeEntryNode, 'data'), false);
  assert.equal(matchesLayerFilter(fakeExtNode, 'ext'), true);
  assert.equal(matchesLayerFilter(fakeExtNode, 'auth'), false);
});
