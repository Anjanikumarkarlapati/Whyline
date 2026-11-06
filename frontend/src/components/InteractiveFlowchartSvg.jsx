import React, { useCallback, useRef } from 'react';
import { useI18n } from '../i18n';

/**
 * Zero-dependency SVG flowchart. nodes/edges come from /api/git/scan; `activeId` highlights the spoken step.
 *
 * Resilience for Indic scripts:
 * - Node boxes size to content (no fixed W/H that clips Devanagari/Telugu matras)
 * - Text truncation via Intl.Segmenter (grapheme-aware) — never slice/substring
 * - CSS classes for all styling (SVG presentation attrs don't resolve CSS vars)
 * - Focus-visible ring for keyboard navigation
 */
export default function InteractiveFlowchartSvg({ graph, activeId, doneIds = [], onSelect }) {
  const { lang } = useI18n();
  // Ref map of nodeId → DOM <g> element for roving-tabindex navigation
  const nodeRefs = useRef({});

  const nodes = graph?.nodes || [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const pad = 24;
  const nodeH = 64;
  const nodeMinW = 160;
  const labelGap = 24;

  // Estimate node width from label length (Indic scripts run ~30-40% longer)
  const estimateNodeWidth = (label) => {
    if (!label) return nodeMinW;
    // Indic scripts need ~40% more width per grapheme cluster
    const graphemes = Array.from(
      new Intl.Segmenter(lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'te', {
        granularity: 'grapheme',
      }).segment(label)
    );
    const factor = lang === 'en' ? 7.5 : lang === 'hi' ? 9.5 : 10.5;
    return Math.max(nodeMinW, graphemes.length * factor + labelGap);
  };

  const nodeWidths = Object.fromEntries(
    nodes.map((n) => [n.id, estimateNodeWidth(n.label)])
  );

  const width =
    Math.max(
      ...nodes.map((n) => (n?.position?.x ?? 0) + (nodeWidths[n?.id] || nodeMinW) + pad),
      0
    ) + pad;
  const height =
    Math.max(...nodes.map((n) => (n?.position?.y ?? 0) + nodeH + pad), 0) + pad;

  const mid = (n) => ({
    x: (n?.position?.x ?? 0) + (nodeWidths[n?.id] || nodeMinW) / 2,
    y: (n?.position?.y ?? 0) + nodeH / 2,
  });

  // Grapheme-aware truncation — never slice/substring (breaks conjuncts/vowel signs)
  const truncateGraphemes = (text, maxGraphemes) => {
    if (!text) return '';
    const segmenter = new Intl.Segmenter(lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'te', {
      granularity: 'grapheme',
    });
    const graphemes = Array.from(segmenter.segment(text)).map((g) => g.segment);
    if (graphemes.length <= maxGraphemes) return text;
    return graphemes.slice(0, maxGraphemes).join('') + '…';
  };

  return (
    <svg
      className="flowchart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Repository flowchart"
      style={{ width: '100%', height: 'auto', maxWidth: 1920 }}
    >
      <defs>
        <marker
          id="flowchart-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--hairline-strong)" />
        </marker>
        <marker
          id="flowchart-arrow-active"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent)" />
        </marker>
      </defs>
      {graph?.edges?.map((e) => {
        const a = byId[e.source];
        const b = byId[e.target];
        if (!a || !b) return null;
        const p = mid(a);
        const q = mid(b);
        const isEdgeActive = e.source === activeId || e.target === activeId;
        return (
          <g key={e.id}>
            <line
              className={isEdgeActive ? 'flowchart-edge flowchart-edge-active' : 'flowchart-edge'}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              markerEnd={isEdgeActive ? 'url(#flowchart-arrow-active)' : 'url(#flowchart-arrow)'}
            />
            <text
              className="flowchart-edge-label"
              x={(p.x + q.x) / 2}
              y={(p.y + q.y) / 2 - 6}
            >
              {e.label}
            </text>
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const active = n.id === activeId;
        const done = doneIds.includes(n.id);
        const w = nodeWidths[n.id];
        return (
          <g
            key={n.id}
            ref={(el) => { nodeRefs.current[n.id] = el; }}
            className="flowchart-node"
            tabIndex={i === 0 ? 0 : -1}
            role="button"
            aria-label={`${n.label}${active ? ' (speaking)' : done ? ' (explained)' : ''}`}
            aria-current={active ? 'step' : undefined}
            onClick={() => onSelect?.(n.id)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                ev.currentTarget.setAttribute('data-pressing', '');
                onSelect?.(n.id);
                // Move roving tabindex to this node
                Object.values(nodeRefs.current).forEach((el) => el?.setAttribute('tabindex', '-1'));
                ev.currentTarget.setAttribute('tabindex', '0');
              } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
                ev.preventDefault();
                const next = nodeRefs.current[nodes[i + 1]?.id];
                if (next) {
                  ev.currentTarget.setAttribute('tabindex', '-1');
                  next.setAttribute('tabindex', '0');
                  next.focus();
                }
              } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
                ev.preventDefault();
                const prev = nodeRefs.current[nodes[i - 1]?.id];
                if (prev) {
                  ev.currentTarget.setAttribute('tabindex', '-1');
                  prev.setAttribute('tabindex', '0');
                  prev.focus();
                }
              } else if (ev.key === 'Home') {
                ev.preventDefault();
                const first = nodeRefs.current[nodes[0]?.id];
                if (first) {
                  ev.currentTarget.setAttribute('tabindex', '-1');
                  first.setAttribute('tabindex', '0');
                  first.focus();
                }
              } else if (ev.key === 'End') {
                ev.preventDefault();
                const last = nodeRefs.current[nodes[nodes.length - 1]?.id];
                if (last) {
                  ev.currentTarget.setAttribute('tabindex', '-1');
                  last.setAttribute('tabindex', '0');
                  last.focus();
                }
              } else if (ev.key === 'Escape') {
                ev.currentTarget.blur();
              }
            }}
            onKeyUp={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.currentTarget.removeAttribute('data-pressing');
              }
            }}
            onBlur={(ev) => {
              ev.currentTarget.removeAttribute('data-pressing');
            }}
            style={{ cursor: 'pointer' }}
          >
            <title>{n.label} — {n.category || 'Step'}</title>
            <rect
              x={n?.position?.x ?? 0}
              y={n?.position?.y ?? 0}
              width={w}
              height={nodeH}
              rx="12"
              ry="12"
              className={
                active
                  ? 'flowchart-node-bg flowchart-node-active'
                  : done
                    ? 'flowchart-node-bg flowchart-node-done'
                    : 'flowchart-node-bg'
              }
            />
            <text
              x={(n?.position?.x ?? 0) + 12}
              y={(n?.position?.y ?? 0) + nodeH / 2 - 6}
              className={
                active
                  ? 'flowchart-node-text-main flowchart-node-active'
                  : 'flowchart-node-text-main'
              }
            >
              {i + 1}. {truncateGraphemes(n.label, 26)}
            </text>
            <text
              x={(n?.position?.x ?? 0) + 12}
              y={(n?.position?.y ?? 0) + nodeH / 2 + 14}
              className={
                active
                  ? 'flowchart-node-text-sub flowchart-node-active'
                  : 'flowchart-node-text-sub'
              }
            >
              {active ? 'Speaking now' : done ? 'Explained' : n.category}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

InteractiveFlowchartSvg.displayName = 'InteractiveFlowchartSvg';
