import React from 'react';

const W = 200;
const H = 64;

/** Zero-dependency SVG flowchart. nodes/edges come from /api/git/scan; `activeId` highlights the spoken step. */
export default function InteractiveFlowchartSvg({ graph, activeId, doneIds = [], onSelect }) {
  const nodes = graph?.nodes || [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const width = Math.max(...nodes.map((n) => n.position.x), 0) + W + 40;
  const height = Math.max(...nodes.map((n) => n.position.y), 0) + H + 40;
  const mid = (n) => ({ x: n.position.x + W / 2, y: n.position.y + H / 2 });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Repository flowchart"
      style={{ width: '100%', height: 'auto', maxWidth: 1920 }}
    >
      {graph?.edges?.map((e) => {
        const a = byId[e.source];
        const b = byId[e.target];
        if (!a || !b) return null;
        const p = mid(a);
        const q = mid(b);
        return (
          <g key={e.id}>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="var(--hairline-strong)" strokeWidth="2" />
            <text x={(p.x + q.x) / 2} y={(p.y + q.y) / 2 - 6} fontSize="11" fill="var(--ink-muted)" textAnchor="middle">
              {e.label}
            </text>
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const active = n.id === activeId;
        const done = doneIds.includes(n.id);
        return (
          <g
            key={n.id}
            tabIndex={0}
            role="button"
            aria-label={`${n.label}${active ? ' (speaking)' : done ? ' (explained)' : ''}`}
            aria-current={active ? 'step' : undefined}
            onClick={() => onSelect?.(n.id)}
            onKeyDown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && onSelect?.(n.id)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={n.position.x}
              y={n.position.y}
              width={W}
              height={H}
              rx="12"
              fill={active ? 'var(--accent)' : done ? 'var(--accent-wash)' : 'var(--surface)'}
              stroke={active ? 'var(--accent)' : 'var(--hairline-strong)'}
              strokeWidth="1.5"
            />
            <text x={n.position.x + 12} y={n.position.y + 26} fontSize="12" fontWeight="600" fill={active ? 'var(--accent-contrast)' : 'var(--ink)'}>
              {i + 1}. {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
            </text>
            <text x={n.position.x + 12} y={n.position.y + 46} fontSize="11" fill={active ? 'var(--accent-contrast)' : 'var(--ink-muted)'}>
              {active ? '● speaking' : done ? '✓ explained' : n.category}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
