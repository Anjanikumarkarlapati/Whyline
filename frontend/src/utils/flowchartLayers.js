/**
 * 6-layer Cream-and-Olive architecture specification, Mermaid theme bridge,
 * and defensive normalization helpers for RepoFlowchartExplorer & MermaidFlowchartPanel.
 */

export const ARCH_LAYERS = [
  {
    key: 'entry',
    number: 1,
    label: 'Entry & Presentation',
    shortLabel: 'Entry & UI',
    classDefName: 'entry',
    bgVar: '--layer-entry-bg',
    borderVar: '--layer-entry-border',
    lightBg: '#ECEAD0',
    lightBorder: '#545333',
    darkBg: '#343324',
    darkBorder: '#D9D7B6',
    aliases: ['entry', 'presentation', 'ui', 'frontend', 'client', 'routes', 'cli', 'layer1', 'l1'],
  },
  {
    key: 'auth',
    number: 2,
    label: 'Auth & Security',
    shortLabel: 'Auth & Guard',
    classDefName: 'auth',
    bgVar: '--layer-auth-bg',
    borderVar: '--layer-auth-border',
    lightBg: '#F7E6C4',
    lightBorder: '#8F5A08',
    darkBg: '#3B2E18',
    darkBorder: '#D9A520',
    aliases: ['auth', 'security', 'middleware', 'gateway', 'validation', 'session', 'guard', 'layer2', 'l2'],
  },
  {
    key: 'core',
    number: 3,
    label: 'Core Logic & Runtime',
    shortLabel: 'Core Logic',
    classDefName: 'core',
    bgVar: '--layer-core-bg',
    borderVar: '--layer-core-border',
    lightBg: '#FFFEF0',
    lightBorder: '#545333',
    darkBg: '#25251A',
    darkBorder: '#D9D7B6',
    aliases: ['core', 'logic', 'domain', 'runtime', 'engine', 'service', 'business', 'layer3', 'l3'],
  },
  {
    key: 'data',
    number: 4,
    label: 'Data & Persistence',
    shortLabel: 'Data & State',
    classDefName: 'data',
    bgVar: '--layer-data-bg',
    borderVar: '--layer-data-border',
    lightBg: '#E2EEF5',
    lightBorder: '#3B6E91',
    darkBg: '#1E2E3B',
    darkBorder: '#6BA3C9',
    aliases: ['data', 'persistence', 'database', 'db', 'storage', 'cache', 'state', 'model', 'layer4', 'l4'],
  },
  {
    key: 'ext',
    number: 5,
    label: 'External APIs & Services',
    shortLabel: 'External APIs',
    classDefName: 'ext',
    bgVar: '--layer-ext-bg',
    borderVar: '--layer-ext-border',
    lightBg: '#F2F0CA',
    lightBorder: '#6B6A55',
    darkBg: '#2F2F22',
    darkBorder: '#A9A890',
    aliases: ['ext', 'external', 'integrations', 'apis', 'ai', 'webhooks', 'thirdparty', 'layer5', 'l5'],
  },
  {
    key: 'deploy',
    number: 6,
    label: 'Build & Deployment',
    shortLabel: 'Build & Deploy',
    classDefName: 'deploy',
    bgVar: '--layer-deploy-bg',
    borderVar: '--layer-deploy-border',
    lightBg: '#E6F0DC',
    lightBorder: '#3E5C2A',
    darkBg: '#23311B',
    darkBorder: '#9BB883',
    aliases: ['deploy', 'build', 'infra', 'ci', 'config', 'ops', 'docker', 'testing', 'layer6', 'l6'],
  },
];

export function stripMermaidFences(rawCode) {
  if (typeof rawCode !== 'string') return '';
  let text = rawCode.replace(/\r\n/g, '\n').trim();
  const fenceMatch = text.match(/^```(?:mermaid)?\s*\n([\s\S]*?)\n```$/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    text = text.replace(/^```(?:mermaid)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return text;
}

export function sanitizeMermaidId(raw, fallback = 'node') {
  const cleaned = String(raw || '')
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^_+/, '');
  if (!cleaned) return fallback;
  return /^[A-Za-z]/.test(cleaned) ? cleaned : `n_${cleaned}`;
}

export function sanitizeMermaidLabel(raw, maxLen = 58) {
  const text = String(raw || 'Module')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/["`<>]/g, "'")
    .replace(/[\[\]{}();#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 'Module';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

export function detectDarkMode() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const explicit = (root.dataset.theme || root.dataset.mode || '').toLowerCase();
  if (explicit === 'dark') return true;
  if (explicit === 'light') return false;
  return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function readMenuShaderPalette(theme = 'light') {
  const isDark = theme === 'dark' || detectDarkMode();
  return isDark
    ? {
        wireColor: '#D9D7B6',
        accentColor: '#D9A520',
        color1: '#2F2F22',
        color2: '#545333',
        color3: '#878672',
      }
    : {
        wireColor: '#545333',
        accentColor: '#3E3D25',
        color1: '#FDFBD4',
        color2: '#ECEAD0',
        color3: '#D9D7B6',
      };
}

export function readMermaidThemeConfig() {
  const isDark = detectDarkMode();
  const styles =
    typeof window !== 'undefined' && typeof document !== 'undefined'
      ? window.getComputedStyle(document.documentElement)
      : null;

  const readVar = (name, fallback) => {
    const val = styles?.getPropertyValue(name)?.trim();
    return val || fallback;
  };

  const nodeText = readVar('--layer-node-text', isDark ? '#FDFBD4' : '#2A2919');
  const surface = readVar('--bg-surface', isDark ? '#25251A' : '#FFFEF0');
  const raised = readVar('--bg-raised', isDark ? '#2F2F22' : '#F2F0CA');
  const borderStrong = readVar('--border-strong', '#878672');
  const borderDefault = readVar('--border-default', isDark ? '#3A3A2A' : '#D9D7B6');
  const textSecondary = readVar('--text-secondary', isDark ? '#D9D7B6' : '#545333');

  const layerPalette = {};
  for (const layer of ARCH_LAYERS) {
    layerPalette[layer.key] = {
      bg: readVar(layer.bgVar, isDark ? layer.darkBg : layer.lightBg),
      border: readVar(layer.borderVar, isDark ? layer.darkBorder : layer.lightBorder),
      text: nodeText,
    };
  }

  return {
    isDark,
    layerPalette,
    themeVariables: {
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      fontSize: '13px',
      background: surface,
      primaryColor: layerPalette.core.bg,
      primaryTextColor: nodeText,
      primaryBorderColor: borderStrong,
      secondaryColor: raised,
      secondaryTextColor: nodeText,
      secondaryBorderColor: borderDefault,
      tertiaryColor: layerPalette.ext.bg,
      tertiaryTextColor: nodeText,
      lineColor: textSecondary,
      textColor: nodeText,
      clusterBkg: surface,
      clusterBorder: borderStrong,
      edgeLabelBackground: surface,
    },
  };
}

/**
 * Sync `classDef` colors inside valid flowchart Mermaid code with the active light/dark palette.
 * Does NOT repair intentionally broken syntax so error-fallback flows work honestly.
 */
export function applyThemeClassDefs(code, layerPalette) {
  const clean = stripMermaidFences(code);
  if (!clean || !/^\s*(?:flowchart|graph)\s+(?:TD|TB|LR|RL|BT)\b/i.test(clean)) {
    return clean;
  }

  const classMap = [
    { names: ['entry', 'entryLayer', 'layerEntry', 'layer1', 'l1'], palette: layerPalette.entry },
    { names: ['auth', 'authLayer', 'layerAuth', 'layer2', 'l2'], palette: layerPalette.auth },
    { names: ['core', 'coreLayer', 'layerCore', 'layer3', 'l3'], palette: layerPalette.core },
    { names: ['data', 'dataLayer', 'layerData', 'layer4', 'l4'], palette: layerPalette.data },
    { names: ['ext', 'externalLayer', 'external', 'layerExt', 'layer5', 'l5'], palette: layerPalette.ext },
    { names: ['deploy', 'deployLayer', 'layerDeploy', 'layer6', 'l6'], palette: layerPalette.deploy },
  ];

  const overrides = [];
  for (const group of classMap) {
    for (const clsName of group.names) {
      const usedInDiagram =
        new RegExp(`:::\\s*${clsName}\\b`).test(clean) ||
        new RegExp(`^\\s*class\\s+.+\\b${clsName}\\b`, 'm').test(clean);
      if (usedInDiagram) {
        overrides.push(
          `classDef ${clsName} fill:${group.palette.bg},stroke:${group.palette.border},color:${group.palette.text},stroke-width:1.5px;`
        );
      }
    }
  }

  return overrides.length ? `${clean}\n${overrides.join('\n')}` : clean;
}

function matchLayerSpec(rawKeyOrTitle, indexFallback) {
  const rawStr = String(rawKeyOrTitle || '').trim();
  const numMatch = rawStr.match(/(?:^|\bsubgraph\s+l?|layer\s*)([1-6])(?=\s*[.\]:"_\s]|$)/i);
  if (numMatch) {
    const byNum = ARCH_LAYERS[Number(numMatch[1]) - 1];
    if (byNum) return byNum;
  }
  const needle = rawStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (needle) {
    const found = ARCH_LAYERS.find(
      (layer) =>
        layer.key === needle ||
        layer.aliases.some((alias) => needle.includes(alias))
    );
    if (found) return found;
  }
  return ARCH_LAYERS[indexFallback % ARCH_LAYERS.length];
}

export function normalizeArchLayers(flowData) {
  const raw = flowData?.mermaid_layers || flowData?.architecture_layers || null;
  const byKey = new Map(
    ARCH_LAYERS.map((spec) => [
      spec.key,
      {
        ...spec,
        title: spec.label,
        description: '',
        items: [],
      },
    ])
  );

  if (Array.isArray(raw)) {
    raw.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') return;
      const spec = matchLayerSpec(entry.key || entry.id || entry.name || entry.layer || entry.label || entry.title, idx);
      const bucket = byKey.get(spec.key);
      const list = entry.nodes || entry.files || entry.components || entry.items || [];
      bucket.title = entry.title || entry.label || entry.name || bucket.title;
      bucket.description = entry.description || entry.summary || bucket.description;
      if (Array.isArray(list)) {
        bucket.items = list
          .map((item) => (typeof item === 'string' ? item : item?.label || item?.name || item?.file || ''))
          .filter(Boolean);
      }
    });
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, val], idx) => {
      const spec = matchLayerSpec(k, idx);
      const bucket = byKey.get(spec.key);
      if (Array.isArray(val)) {
        bucket.items = val.map((v) => String(v)).filter(Boolean);
      } else if (val && typeof val === 'object') {
        bucket.title = val.title || val.label || bucket.title;
        bucket.description = val.description || val.summary || bucket.description;
        const list = val.nodes || val.files || val.components || val.items || [];
        if (Array.isArray(list)) {
          bucket.items = list
            .map((item) => (typeof item === 'string' ? item : item?.label || item?.name || item?.file || ''))
            .filter(Boolean);
        }
      }
    });
  }

  const ordered = ARCH_LAYERS.map((spec) => byKey.get(spec.key));

  // If layer metadata omitted explicit node lists, derive concise node labels from mermaid_code subgraphs or steps
  const cleanMmd = stripMermaidFences(flowData?.mermaid_code || flowData?.mermaid_flowchart || '');
  if (cleanMmd && ordered.some((b) => b.items.length === 0)) {
    const subgraphBlocks = cleanMmd.match(/subgraph\s+[^\n]+[\s\S]*?\n\s*end\b/gi) || [];
    subgraphBlocks.forEach((block, idx) => {
      const headerLine = block.split('\n')[0] || '';
      const spec = matchLayerSpec(headerLine, idx);
      const bucket = byKey.get(spec.key);
      if (!bucket || bucket.items.length > 0) return;
      const nodeLabels = [];
      const nodeRe = /\[\s*"([^"]+)"\s*\]|\(\s*"([^"]+)"\s*\)/g;
      let match;
      while ((match = nodeRe.exec(block)) !== null) {
        const txt = String(match[1] || match[2] || '').replace(/<br\s*\/?>/gi, ' · ').trim();
        if (txt && !nodeLabels.includes(txt)) nodeLabels.push(txt);
      }
      if (nodeLabels.length > 0) bucket.items = nodeLabels;
    });
  }

  return ordered;
}

export function buildFallbackSixLayerMermaid(flowData) {
  const steps = Array.isArray(flowData?.steps) ? flowData.steps : [];
  const breakdown = flowData?.project_summary?.full_stack_breakdown || {};
  const repoLabel = sanitizeMermaidLabel(flowData?.project_summary?.project_name || flowData?.repo || 'Repository', 40);

  const l1 = sanitizeMermaidLabel(steps[0]?.file_path || steps[0]?.file || breakdown.frontend || `${repoLabel} Entrypoint`);
  const l2 = sanitizeMermaidLabel(steps[1]?.file_path || steps[1]?.file || breakdown.apis_and_services || 'Auth & Input Guard');
  const l3 = sanitizeMermaidLabel(steps[2]?.file_path || steps[2]?.file || breakdown.backend || 'Core Execution Logic');
  const l4 = sanitizeMermaidLabel(steps[3]?.file_path || steps[3]?.file || breakdown.database || 'State & Data Store');
  const l5 = sanitizeMermaidLabel(steps[4]?.file_path || steps[4]?.file || breakdown.apis_and_services || 'External Integrations');
  const l6 = sanitizeMermaidLabel(flowData?.project_summary?.primary_stack || 'Build, Test & Deploy');

  return [
    'flowchart TD',
    '  subgraph L1["1. Entry & Presentation"]',
    `    N1["${l1}"]:::entry`,
    '  end',
    '  subgraph L2["2. Auth & Security"]',
    `    N2["${l2}"]:::auth`,
    '  end',
    '  subgraph L3["3. Core Logic & Runtime"]',
    `    N3["${l3}"]:::core`,
    '  end',
    '  subgraph L4["4. Data & Persistence"]',
    `    N4["${l4}"]:::data`,
    '  end',
    '  subgraph L5["5. External APIs & Services"]',
    `    N5["${l5}"]:::ext`,
    '  end',
    '  subgraph L6["6. Build & Deployment"]',
    `    N6["${l6}"]:::deploy`,
    '  end',
    '  N1 --> N2',
    '  N2 --> N3',
    '  N3 --> N4',
    '  N3 --> N5',
    '  N6 -. configures .-> N3',
  ].join('\n');
}

export function matchesLayerFilter(nodeEl, layerKey) {
  if (!nodeEl || !layerKey) return true;
  const key = String(layerKey).toLowerCase();
  const classTokens = {
    entry: ['entry', 'entrylayer', 'layerentry', 'layer1', 'l1'],
    auth: ['auth', 'authlayer', 'layerauth', 'layer2', 'l2'],
    core: ['core', 'corelayer', 'layercore', 'layer3', 'l3'],
    data: ['data', 'datalayer', 'layerdata', 'layer4', 'l4'],
    ext: ['ext', 'externallayer', 'external', 'layerext', 'layer5', 'l5'],
    deploy: ['deploy', 'deploylayer', 'layerdeploy', 'layer6', 'l6'],
  }[key] || [key];

  const classAttr = String(nodeEl.getAttribute?.('class') || '').toLowerCase();
  if (classTokens.some((tok) => classAttr.includes(tok))) return true;

  const nodeId = String(nodeEl.getAttribute?.('data-id') || nodeEl.id || '').toUpperCase();
  const prefixMap = {
    entry: /^(?:FLOWCHART-)?E[1-9]\b/,
    auth: /^(?:FLOWCHART-)?A[1-9]\b/,
    core: /^(?:FLOWCHART-)?C[1-9]\b/,
    data: /^(?:FLOWCHART-)?D[1-9]\b/,
    ext: /^(?:FLOWCHART-)?X[1-9]\b/,
    deploy: /^(?:FLOWCHART-)?P[1-9]\b/,
  };
  if (prefixMap[key] && prefixMap[key].test(nodeId)) return true;

  const clusterEl = nodeEl.closest?.('.cluster');
  if (clusterEl) {
    const clusterId = String(clusterEl.id || clusterEl.getAttribute?.('data-id') || '').toLowerCase();
    if (classTokens.some((tok) => clusterId.includes(tok))) return true;
  }

  return false;
}

export function findMatchingStepForMermaidNode(nodeId, nodeText, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  const idStr = String(nodeId || '').toLowerCase();
  const textStr = String(nodeText || '').toLowerCase();
  const combined = `${idStr} ${textStr}`.trim();

  // Direct step number cue (e.g. step_2, s2, N2, Step 2)
  const stepNumMatch = combined.match(/(?:^|[^0-9a-z])(?:step\s*[_-]?|s|n)([1-5])(?:$|[^0-9])/i);
  if (stepNumMatch) {
    const idx = Number(stepNumMatch[1]) - 1;
    if (steps[idx]) return idx;
  }

  // Canonical 6-layer node IDs (E1, E2, A1, C1, C2, D1, X1, P1)
  const cleanId = String(nodeId || '').replace(/^flowchart-/i, '').replace(/-\d+$/, '').toUpperCase();
  if (cleanId === 'E1' || cleanId === 'E3') return 0;
  if (cleanId === 'E2') return Math.min(1, steps.length - 1);
  if (cleanId === 'A1' || cleanId === 'A2' || cleanId === 'C1') return Math.min(2, steps.length - 1);
  if (cleanId === 'C2' || cleanId === 'C3' || cleanId === 'C4') return Math.min(3, steps.length - 1);
  if (cleanId === 'D1' || cleanId === 'D2' || cleanId === 'X1' || cleanId === 'X2' || cleanId === 'P1' || cleanId === 'P2') {
    return Math.min(4, steps.length - 1);
  }

  let bestIdx = -1;
  let bestScore = 0;

  steps.forEach((step, idx) => {
    let score = 0;
    const file = String(step.file_path || step.file || '').toLowerCase();
    const baseName = file.split('/').pop() || '';
    const symbol = String(step.symbol_name || step.symbol || '').toLowerCase();
    const titleWords = String(step.title || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);

    if (file && combined.includes(file)) score += 10;
    if (baseName && baseName.length >= 3 && combined.includes(baseName)) score += 7;
    if (symbol && symbol.length >= 3 && combined.includes(symbol)) score += 6;
    for (const word of titleWords) {
      if (combined.includes(word)) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  if (bestScore > 0) return bestIdx;

  // Fallback by layer prefix (L1..L6 -> steps 0..4)
  if (/l1|entry|ui|front/.test(combined)) return 0;
  if (/l2|auth|guard|route/.test(combined)) return Math.min(1, steps.length - 1);
  if (/l3|core|engine|logic/.test(combined)) return Math.min(2, steps.length - 1);
  if (/l4|data|store|db/.test(combined)) return Math.min(3, steps.length - 1);
  if (/l5|l6|ext|deploy|out/.test(combined)) return Math.min(4, steps.length - 1);

  return 0;
}

export function normalizeCritiqueList(raw) {
  if (!raw) return [];
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw
          .split(/\n+/)
          .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
          .filter(Boolean)
      : [];

  return items
    .map((item) => {
      if (typeof item === 'string') {
        const colonIdx = item.indexOf(':');
        if (colonIdx > 3 && colonIdx < 48) {
          return {
            title: item.slice(0, colonIdx).trim(),
            detail: item.slice(colonIdx + 1).trim(),
            tag: '',
          };
        }
        return { title: '', detail: item.trim(), tag: '' };
      }
      if (item && typeof item === 'object') {
        return {
          title: item.title || item.area || item.name || item.issue || '',
          detail: item.detail || item.description || item.reason || item.recommendation || item.impact || '',
          tag: item.severity || item.priority || item.layer || '',
        };
      }
      return null;
    })
    .filter((entry) => entry && (entry.title || entry.detail));
}

export function normalizeBestAlternative(raw, modernAlternatives = []) {
  if (raw && typeof raw === 'object') {
    const title = raw.stack || raw.title || raw.name || raw.recommended || '';
    const summary = raw.summary || raw.why || raw.rationale || raw.reason || raw.description || '';
    const tradeoffs = raw.tradeoffs || raw.trade_off || raw.migration_note || raw.migration_fit || '';
    const components = Array.isArray(raw.components)
      ? raw.components
      : Array.isArray(raw.layers)
        ? raw.layers
        : [];
    if (title || summary) {
      return { title: title || 'Recommended Modern Stack', summary, tradeoffs, components };
    }
  }

  if (typeof raw === 'string' && raw.trim()) {
    return { title: 'Recommended Alternative Stack', summary: raw.trim(), tradeoffs: '', components: [] };
  }

  if (Array.isArray(modernAlternatives) && modernAlternatives.length > 0) {
    const summary = modernAlternatives
      .slice(0, 3)
      .map((alt) => `${alt.category || 'Layer'}: ${alt.recommended || alt.why || ''}`.trim())
      .filter(Boolean)
      .join(' · ');
    return {
      title: modernAlternatives.map((alt) => alt.recommended).filter(Boolean).slice(0, 3).join(' + ') || 'Alternative Stack',
      summary,
      tradeoffs: modernAlternatives[0]?.why || '',
      components: [],
    };
  }

  return null;
}
