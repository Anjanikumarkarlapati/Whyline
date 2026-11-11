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
  const pad = 24;
  const nodeH = 64;
  const nodeMinW = 160;
  const labelGap = 28;
  const minEdgeGap = 88;

  const stripLeadingStepNumber = (label) =>
    String(label || '').replace(/^\s*(?:step\s*)?\d+\s*[.:)-]\s*/i, '').trim();

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

  // Estimate node width from displayed truncated label length (Indic scripts run ~30-40% longer)
  const estimateNodeWidth = (label, idx = 0) => {
    const clean = stripLeadingStepNumber(label);
    const displayLabel = `${idx + 1}. ${truncateGraphemes(clean || label || 'Step', 26)}`;
    const graphemes = Array.from(
      new Intl.Segmenter(lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'te', {
        granularity: 'grapheme',
      }).segment(displayLabel)
    );
    const factor = lang === 'en' ? 7.2 : lang === 'hi' ? 9.0 : 9.8;
    const maxW = lang === 'en' ? 236 : 268;
    return Math.min(maxW, Math.max(nodeMinW, Math.ceil(graphemes.length * factor + labelGap)));
  };

  const nodeWidths = Object.fromEntries(
    nodes.map((n, idx) => [n.id, estimateNodeWidth(n.label, idx)])
  );

  // Resolve non-overlapping positions so linear pipeline nodes never collide
  const resolvedPositions = {};
  nodes.forEach((n, idx) => {
    const rawX = n?.position?.x ?? idx * 280 + 40;
    const rawY = n?.position?.y ?? 120;
    if (idx === 0) {
      resolvedPositions[n.id] = { x: rawX, y: rawY };
      return;
    }
    const prevNode = nodes[idx - 1];
    const prevPos = resolvedPositions[prevNode.id] || { x: 40, y: 120 };
    const prevW = nodeWidths[prevNode.id] || nodeMinW;
    const sameRow = Math.abs(rawY - prevPos.y) < nodeH * 0.75 && rawX >= prevPos.x;
    const resolvedX = sameRow ? Math.max(rawX, prevPos.x + prevW + minEdgeGap) : rawX;
    resolvedPositions[n.id] = { x: resolvedX, y: rawY };
  });

  const byId = Object.fromEntries(
    nodes.map((n) => [
      n.id,
      {
        ...n,
        position: resolvedPositions[n.id] || n.position || { x: 40, y: 120 },
      },
    ])
  );

  const width =
    Math.max(
      ...nodes.map((n) => (resolvedPositions[n?.id]?.x ?? 0) + (nodeWidths[n?.id] || nodeMinW) + pad),
      320
    ) + pad;
  const height =
    Math.max(...nodes.map((n) => (resolvedPositions[n?.id]?.y ?? 0) + nodeH + pad), 160) + pad;

  const mid = (n) => ({
    x: (n?.position?.x ?? 0) + (nodeWidths[n?.id] || nodeMinW) / 2,
    y: (n?.position?.y ?? 0) + nodeH / 2,
  });

  // Compute intersection point on the boundary of node `n`'s rectangle toward target point `targetPt`
  const rectBoundaryPoint = (n, targetPt, padOut = 2) => {
    const w = nodeWidths[n?.id] || nodeMinW;
    const h = nodeH;
    const cx = (n?.position?.x ?? 0) + w / 2;
    const cy = (n?.position?.y ?? 0) + h / 2;
    const dx = targetPt.x - cx;
    const dy = targetPt.y - cy;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
      return { x: cx, y: cy };
    }
    const hw = w / 2 + padOut;
    const hh = h / 2 + padOut;
    const scaleX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
    const scaleY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY);
    return {
      x: Number((cx + dx * scale).toFixed(1)),
      y: Number((cy + dy * scale).toFixed(1)),
    };
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
      {graph?.edges?.map((e, idx) => {
        const srcId = e.source || e.from;
        const tgtId = e.target || e.to;
        const a = byId[srcId];
        const b = byId[tgtId];
        if (!a || !b) return null;
        const centerA = mid(a);
        const centerB = mid(b);
        const p = rectBoundaryPoint(a, centerB, 2);
        const q = rectBoundaryPoint(b, centerA, 4);
        const isEdgeActive = srcId === activeId || tgtId === activeId;
        return (
          <g key={e.id || `${srcId}-${tgtId}-${idx}`}>
            <line
              className={isEdgeActive ? 'flowchart-edge flowchart-edge-active' : 'flowchart-edge'}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              markerEnd={isEdgeActive ? 'url(#flowchart-arrow-active)' : 'url(#flowchart-arrow)'}
            />
            {e.label && (
              <text
                className="flowchart-edge-label"
                x={Number(((p.x + q.x) / 2).toFixed(1))}
                y={Number(((p.y + q.y) / 2 - 8).toFixed(1))}
                textAnchor="middle"
              >
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const active = n.id === activeId;
        const done = doneIds.includes(n.id);
        const w = nodeWidths[n.id];
        const pos = resolvedPositions[n.id] || n.position || { x: i * 280 + 40, y: 120 };
        const cleanLabel = stripLeadingStepNumber(n.label) || n.label || `Step ${i + 1}`;
        return (
          <g
            key={n.id}
            ref={(el) => { nodeRefs.current[n.id] = el; }}
            className="flowchart-node"
            tabIndex={i === 0 ? 0 : -1}
            role="button"
            aria-label={`${cleanLabel}${active ? ' (speaking)' : done ? ' (explained)' : ''}`}
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
            <title>{cleanLabel} — {n.category || n.phase || 'Step'}</title>
            <rect
              x={pos.x}
              y={pos.y}
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
              x={pos.x + 12}
              y={pos.y + nodeH / 2 - 6}
              className={
                active
                  ? 'flowchart-node-text-main flowchart-node-active'
                  : 'flowchart-node-text-main'
              }
            >
              {i + 1}. {truncateGraphemes(cleanLabel, 26)}
            </text>
            <text
              x={pos.x + 12}
              y={pos.y + nodeH / 2 + 14}
              className={
                active
                  ? 'flowchart-node-text-sub flowchart-node-active'
                  : 'flowchart-node-text-sub'
              }
            >
              {active ? 'Speaking now' : done ? 'Explained' : n.category || n.phase || 'Stage'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

InteractiveFlowchartSvg.displayName = 'InteractiveFlowchartSvg';
