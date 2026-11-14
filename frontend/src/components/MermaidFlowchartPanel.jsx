import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowClockwise, Code, Graph, WarningCircle } from '@phosphor-icons/react';
import { CodeBlock } from './CodeText';
import {
  applyThemeClassDefs,
  buildFallbackSixLayerMermaid,
  findMatchingStepForMermaidNode,
  normalizeArchLayers,
  readMermaidThemeConfig,
  stripMermaidFences,
} from '../utils/flowchartLayers';

const BEGINNER_LAYER_HINTS = {
  entry: 'Front door: receives clicks, URLs, or API calls.',
  auth: 'Security guard: checks login, tokens, and permissions.',
  core: 'Brain: runs the main business rules and guardrails.',
  data: 'Filing cabinet: reads and saves records in databases.',
  external: 'Helpers: talks to third-party APIs or AI voice models.',
  deploy: 'Engine room: builds, bundles, and hosts the app.',
};

function applySvgZoomSize(hostEl, zoomLevel) {
  const svgEl = hostEl?.querySelector('svg');
  if (!svgEl) return;
  const vbAttr = (svgEl.getAttribute('viewBox') || '').trim();
  const vbParts = vbAttr ? vbAttr.split(/[\s,]+/).map(Number) : [];
  const naturalMax = parseFloat(svgEl.style.maxWidth || '');
  const naturalWidth =
    vbParts.length === 4 && vbParts[2] > 0
      ? vbParts[2]
      : Number.isFinite(naturalMax) && naturalMax > 0
        ? naturalMax
        : 680;
  const clampedZoom = Math.max(0.5, Math.min(2.2, Number(zoomLevel) || 1));
  const targetWidth = Math.round(naturalWidth * clampedZoom);
  svgEl.style.width = `${targetWidth}px`;
  svgEl.style.maxWidth = clampedZoom <= 1 ? '100%' : 'none';
  svgEl.style.height = 'auto';
  svgEl.style.display = 'block';
  svgEl.style.margin = '0 auto';
}

/**
 * Renders the 6-layer color-coded Mermaid architecture flowchart with:
 * - Strict DOM sanitization & dynamic Cream-and-Olive light/dark theme sync
 * - Clickable / keyboard-accessible nodes linked back to RepoFlowchartExplorer steps
 * - 6-layer color legend
 * - Toggle between rendered SVG Diagram and copyable Raw Mermaid source
 * - Graceful role="alert" error fallback automatically exposing Raw Mermaid + Linear SVG switch
 */
export default function MermaidFlowchartPanel({
  mermaidCode,
  flowData,
  steps = [],
  onSelectStep,
  onFallbackToLinear,
  zoom = 1,
}) {
  const reactId = useId().replace(/[^A-Za-z0-9_]/g, '');
  const renderCounterRef = useRef(0);
  const svgHostRef = useRef(null);
  const svgMarkupRef = useRef('');

  const [panelMode, setPanelMode] = useState('diagram'); // 'diagram' | 'raw'
  const [renderError, setRenderError] = useState('');
  const [isRendering, setIsRendering] = useState(false);
  const [themeRevision, setThemeRevision] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const effectiveCode = useMemo(() => {
    const clean = stripMermaidFences(mermaidCode);
    if (clean) return clean;
    return buildFallbackSixLayerMermaid(flowData);
  }, [mermaidCode, flowData]);

  const layers = useMemo(() => normalizeArchLayers(flowData), [flowData]);

  // Reset to diagram view whenever incoming Mermaid code changes for a newly scanned repo
  useEffect(() => {
    setRenderError('');
    setPanelMode('diagram');
  }, [effectiveCode]);

  // Re-render SVG when light/dark theme toggles
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const bumpTheme = () => setThemeRevision((n) => n + 1);

    media?.addEventListener?.('change', bumpTheme);
    const observer = new MutationObserver(bumpTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-mode'],
    });

    return () => {
      media?.removeEventListener?.('change', bumpTheme);
      observer.disconnect();
    };
  }, []);

  // Render Mermaid diagram safely in browser DOM
  useEffect(() => {
    if (panelMode !== 'diagram') return undefined;
    let cancelled = false;
    const host = svgHostRef.current;

    if (!effectiveCode.trim()) {
      setRenderError('No Mermaid diagram source was returned for this repository.');
      if (host) host.innerHTML = '';
      svgMarkupRef.current = '';
      return undefined;
    }

    const renderId = `whyline_mmd_${reactId}_${++renderCounterRef.current}`;

    async function renderDiagram() {
      setIsRendering(true);
      setRenderError('');
      try {
        const { themeVariables, layerPalette } = readMermaidThemeConfig();
        const codeForRender = applyThemeClassDefs(effectiveCode, layerPalette);
        const mermaidMod = await import('mermaid');
        const mermaid = mermaidMod.default || mermaidMod;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          suppressErrorRendering: true,
          theme: 'base',
          themeVariables,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
            nodeSpacing: 38,
            rankSpacing: 46,
          },
        });

        const result = await mermaid.render(renderId, codeForRender);
        if (cancelled) return;

        const svgStr = String(result?.svg || '');
        if (!svgStr.includes('<svg') || /Syntax error in text/i.test(svgStr)) {
          throw new Error('Mermaid returned an invalid SVG or syntax error.');
        }

        svgMarkupRef.current = svgStr;
        if (svgHostRef.current) {
          svgHostRef.current.innerHTML = svgStr;
          applySvgZoomSize(svgHostRef.current, zoom);
          const nodeEls = svgHostRef.current.querySelectorAll('g.node, .node');
          nodeEls.forEach((nodeEl, idx) => {
            nodeEl.style.cursor = 'pointer';
            nodeEl.style.setProperty('--node-i', String(idx));
            nodeEl.setAttribute('tabindex', '0');
            nodeEl.setAttribute('role', 'button');
            const labelText = nodeEl.textContent?.replace(/\s+/g, ' ').trim();
            if (labelText) {
              nodeEl.setAttribute('aria-label', `Inspect layer node ${labelText}`);
            }
          });
          result?.bindFunctions?.(svgHostRef.current);
        }
      } catch (err) {
        if (cancelled) return;
        svgMarkupRef.current = '';
        if (svgHostRef.current) svgHostRef.current.innerHTML = '';
        setRenderError(err?.message || 'Unable to render Mermaid architecture flowchart.');
      } finally {
        if (typeof document !== 'undefined') {
          document.getElementById(`d${renderId}`)?.remove();
          document.querySelectorAll(`body > #${renderId}`).forEach((el) => el.remove());
        }
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [effectiveCode, panelMode, reactId, themeRevision, retryCount]);

  // Re-hydrate SVG host when switching back from raw view and sync zoom cleanly
  useEffect(() => {
    if (panelMode === 'diagram' && svgHostRef.current) {
      if (svgMarkupRef.current && !svgHostRef.current.innerHTML) {
        svgHostRef.current.innerHTML = svgMarkupRef.current;
      }
      applySvgZoomSize(svgHostRef.current, zoom);
    }
  }, [panelMode, zoom]);

  function activateNodeElement(nodeEl) {
    if (!nodeEl || !steps.length || !onSelectStep) return;
    const nodeId = nodeEl.getAttribute('data-id') || nodeEl.id || '';
    const nodeText = nodeEl.textContent || '';
    const matchedIndex = findMatchingStepForMermaidNode(nodeId, nodeText, steps);
    if (matchedIndex >= 0 && steps[matchedIndex]) {
      onSelectStep(steps[matchedIndex], matchedIndex);
    }
  }

  function handleDiagramClick(event) {
    const nodeEl = event.target?.closest?.('g.node, .node');
    if (nodeEl) {
      activateNodeElement(nodeEl);
    }
  }

  function handleDiagramKeyDown(event) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const nodeEl = event.target?.closest?.('g.node, .node');
    if (nodeEl) {
      event.preventDefault();
      activateNodeElement(nodeEl);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
      {/* Sub-header: 6-Layer Badge + Diagram / Raw Mermaid Switcher */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            6-Layer Architecture (Entry · Auth · Core · Data · External · Deploy)
          </span>
          {isRendering && panelMode === 'diagram' && (
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              Rendering Mermaid SVG…
            </span>
          )}
        </div>

        <div className="segmented-control" role="tablist" aria-label="Mermaid view mode">
          <button
            type="button"
            role="tab"
            aria-selected={panelMode === 'diagram'}
            className={`segmented-btn ${panelMode === 'diagram' ? 'active' : ''}`}
            onClick={() => setPanelMode('diagram')}
            style={{
              minHeight: '36px',
              padding: '5px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Graph size={13} /> Diagram
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={panelMode === 'raw'}
            className={`segmented-btn ${panelMode === 'raw' ? 'active' : ''}`}
            onClick={() => setPanelMode('raw')}
            style={{
              minHeight: '36px',
              padding: '5px 12px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <Code size={13} /> Raw Mermaid
          </button>
        </div>
      </div>

      {/* 6-Layer Color Legend */}
      <div
        aria-label="Architecture layer color key"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '8px',
          minWidth: 0,
        }}
      >
        {layers.map((layer) => (
          <div
            key={layer.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '12px',
              background: `var(${layer.bgVar})`,
              border: `1.5px solid var(${layer.borderVar})`,
              color: 'var(--layer-node-text)',
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '9999px',
                border: `1.5px solid var(${layer.borderVar})`,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {layer.number}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.25 }}>
                {layer.title || layer.label}
              </div>
              {BEGINNER_LAYER_HINTS[String(layer.key || '').toLowerCase()] && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>
                  {BEGINNER_LAYER_HINTS[String(layer.key || '').toLowerCase()]}
                </div>
              )}
              {layer.items.length > 0 ? (
                <div
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={layer.items.join(', ')}
                >
                  {layer.items.slice(0, 2).join(' · ')}
                  {layer.items.length > 2 ? ` (+${layer.items.length - 2})` : ''}
                </div>
              ) : layer.description ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginTop: '2px',
                    lineHeight: 1.35,
                  }}
                >
                  {layer.description}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Logical boundary
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Render Error Alert + Automatic Raw Code & Linear SVG Fallback */}
      {panelMode === 'diagram' && renderError && (
        <div
          role="alert"
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            border: '1px solid var(--danger)',
            background: 'var(--danger-wash)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
              <WarningCircle size={18} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--danger)' }}>
                  Mermaid Diagram Render Fallback
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.45 }}>
                  {renderError} Showing the raw Mermaid flowchart source below so nothing is lost.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRetryCount((c) => c + 1)}
                style={{ minHeight: '38px', fontSize: '12px', padding: '6px 12px', gap: '6px' }}
              >
                <ArrowClockwise size={13} /> Retry Render
              </button>
              {onFallbackToLinear && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onFallbackToLinear}
                  style={{ minHeight: '38px', fontSize: '12px', padding: '6px 12px' }}
                >
                  Open Linear Execution SVG
                </button>
              )}
            </div>
          </div>
          <CodeBlock label="Raw Mermaid Source (Fallback)" code={effectiveCode} />
        </div>
      )}

      {/* Diagram Surface OR Raw Mermaid Code View */}
      {panelMode === 'raw' ? (
        <div style={{ minWidth: 0 }}>
          <CodeBlock label="Mermaid 6-Layer Architecture Source" code={effectiveCode} />
        </div>
      ) : (
        !renderError && (
          <div
            style={{
              width: '100%',
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              borderRadius: '14px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              padding: '12px',
            }}
          >
            <div
              ref={svgHostRef}
              onClick={handleDiagramClick}
              onKeyDown={handleDiagramKeyDown}
              data-testid="mermaid-svg-host"
              style={{
                width: '100%',
                minWidth: 0,
                minHeight: '220px',
              }}
            />
          </div>
        )
      )}
    </div>
  );
}
