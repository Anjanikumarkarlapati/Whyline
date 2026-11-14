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
  const estimateNodeWidth = (label, idx = 0, isHub = false) => {
    const clean = stripLeadingStepNumber(label);
    const displayLabel = isHub ? (clean || label || 'Project Hub') : `${idx + 1}. ${truncateGraphemes(clean || label || 'Step', 34)}`;
    const graphemes = Array.from(
      new Intl.Segmenter(lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'te', {
        granularity: 'grapheme',
      }).segment(displayLabel)
    );
    const factor = lang === 'en' ? 7.2 : lang === 'hi' ? 9.0 : 9.8;
    const maxW = lang === 'en' ? 280 : 300;
    return Math.min(maxW, Math.max(nodeMinW, Math.ceil(graphemes.length * factor + labelGap)));
  };

  const nodeWidths = Object.fromEntries(
    nodes.map((n, idx) => {
      const isHub = n.id === 'REPO-HUB' || n.phase === 'hub';
      return [n.id, estimateNodeWidth(n.label, idx, isHub)];
    })
  );

  const isRadialMindMap = nodes.some((n) => n.id === 'REPO-HUB' || n.phase === 'hub');

  // Resolve non-overlapping positions so linear pipeline nodes never collide; preserve radial mind map coords
  const resolvedPositions = {};
  nodes.forEach((n, idx) => {
    const rawX = n?.position?.x ?? idx * 280 + 40;
    const rawY = n?.position?.y ?? 120;
    if (isRadialMindMap || idx === 0) {
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

  const maxX = Math.max(
    320,
    ...nodes.map((n) => (resolvedPositions[n?.id]?.x ?? 0) + (nodeWidths[n?.id] || nodeMinW))
  );
  const maxY = Math.max(
    160,
    ...nodes.map((n) => (resolvedPositions[n?.id]?.y ?? 0) + nodeH)
  );
  const width = maxX + pad * 2;
  const height = maxY + pad * 2;

  if (nodes.length === 0) {
    return (
      <svg
        className="flowchart-svg"
        viewBox="0 0 600 160"
        role="group"
        aria-label="Empty repository flowchart"
        style={{ width: '100%', height: 'auto', minHeight: 160 }}
      >
        <text
          x="300"
          y="85"
          textAnchor="middle"
          fill="var(--text-secondary)"
          style={{ fontSize: '13px', fontFamily: 'var(--font-mono, monospace)' }}
        >
          No flowchart nodes indexed for this repository view
        </text>
      </svg>
    );
  }

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
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const c1x = Number((p.x + dx * 0.45).toFixed(1));
        const c1y = Number((p.y + dy * 0.1).toFixed(1));
        const c2x = Number((q.x - dx * 0.45).toFixed(1));
        const c2y = Number((q.y - dy * 0.1).toFixed(1));
        const pathD = `M ${p.x} ${p.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${q.x} ${q.y}`;
        return (
          <g key={e.id || `${srcId}-${tgtId}-${idx}`}>
            <path
              className={isEdgeActive ? 'flowchart-edge flowchart-edge-active' : 'flowchart-edge'}
              d={pathD}
              markerEnd={isEdgeActive ? 'url(#flowchart-arrow-active)' : 'url(#flowchart-arrow)'}
            />
            {isEdgeActive && (
              <path
                className="flowchart-edge-signal"
                d={pathD}
              />
            )}
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
        const w = nodeWidths[n.id] || nodeMinW;
        const pos = resolvedPositions[n.id] || n.position || { x: i * 280 + 40, y: 120 };
        const isHub = n.id === 'REPO-HUB' || n.phase === 'hub';
        const rawClean = stripLeadingStepNumber(n.label) || n.label;
        const cleanLabel = isHub ? rawClean : (rawClean || `Step ${i + 1}`);
        const renderedTitle = isHub ? truncateGraphemes(cleanLabel, 32) : `${i + 1}. ${truncateGraphemes(cleanLabel, 34)}`;
        const renderedSub = active
          ? 'Speaking now'
          : done
            ? 'Explained'
            : isHub
              ? 'Architecture Hub'
              : n.category || n.phase || 'Stage';

        return (
          <g
            key={n.id}
            ref={(el) => { nodeRefs.current[n.id] = el; }}
            className="flowchart-node"
            style={{ '--node-i': i, cursor: 'pointer' }}
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
          >
            <title>{cleanLabel} — {n.category || n.phase || 'Step'}</title>
            {active && (
              <rect
                x={pos.x - 4}
                y={pos.y - 4}
                width={w + 8}
                height={nodeH + 8}
                rx="16"
                ry="16"
                className="flowchart-node-halo"
              />
            )}
            <rect
              x={pos.x}
              y={pos.y}
              width={w}
              height={nodeH}
              rx="12"
              ry="12"
              fill={active ? 'var(--accent-wash)' : done ? 'var(--bg-raised)' : 'var(--bg-surface)'}
              stroke={active ? 'var(--accent)' : done ? 'var(--border-strong)' : 'var(--border-default)'}
              strokeWidth={active ? 2 : 1.2}
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
              fill={active ? 'var(--accent)' : 'var(--text-primary)'}
              className={
                active
                  ? 'flowchart-node-text-main flowchart-node-active'
                  : 'flowchart-node-text-main'
              }
            >
              {renderedTitle}
            </text>
            <text
              x={pos.x + 12}
              y={pos.y + nodeH / 2 + 14}
              fill="var(--text-secondary)"
              className={
                active
                  ? 'flowchart-node-text-sub flowchart-node-active'
                  : 'flowchart-node-text-sub'
              }
            >
              {renderedSub}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

InteractiveFlowchartSvg.displayName = 'InteractiveFlowchartSvg';
