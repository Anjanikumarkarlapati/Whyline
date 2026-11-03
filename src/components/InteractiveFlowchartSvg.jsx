import React from 'react';
import { useI18n } from '../i18n';

const W = 210;
const H = 68;

/** Zero-dependency SVG flowchart. nodes/edges come from /api/git/scan; `activeId` highlights the spoken step. */
export default function InteractiveFlowchartSvg({ graph, activeId, doneIds = [], onSelect }) {
  const { t } = useI18n();
  const nodes = graph?.nodes || [];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const width = Math.max(...nodes.map((n) => n.position.x), 0) + W + 40;
  const height = Math.max(...nodes.map((n) => n.position.y), 0) + H + 36;
  const mid = (n) => ({ x: n.position.x + W / 2, y: n.position.y + H / 2 });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="group"
      aria-label="Repository flowchart"
      style={{ width: '100%', height: 'auto', maxWidth: 1920 }}
    >
      {/* Connector lines */}
      {graph?.edges?.map((e) => {
        const a = byId[e.source];
        const b = byId[e.target];
        if (!a || !b) return null;
        const p = mid(a);
        const q = mid(b);
        return (
          <line
            key={e.id}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke="var(--hairline-strong)"
            strokeWidth="2"
          />
        );
      })}

      {/* Node rectangles */}
      {nodes.map((n, i) => {
        const active = n.id === activeId;
        const done = doneIds.includes(n.id);
        return (
          <g
            key={n.id}
            tabIndex={0}
            role="button"
            aria-label={`${n.label}${active ? ` (${t('svgSpeaking')})` : done ? ` (${t('svgExplained')})` : ''}`}
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
            <text
              x={n.position.x + 14}
              y={n.position.y + 28}
              fontSize="12"
              fontWeight="600"
              fill={active ? 'var(--accent-contrast)' : 'var(--ink)'}
            >
              {i + 1}. {n.label.length > 26 ? `${n.label.slice(0, 25)}…` : n.label}
            </text>
            <text
              x={n.position.x + 14}
              y={n.position.y + 48}
              fontSize="11"
              fill={active ? 'var(--accent-contrast)' : 'var(--ink-muted)'}
            >
              {active ? t('svgSpeaking') : done ? t('svgExplained') : n.category}
            </text>
          </g>
        );
      })}

      {/* Edge labels rendered on top with crisp canvas pill backdrop so they never clip behind nodes */}
      {graph?.edges?.map((e) => {
        const a = byId[e.source];
        const b = byId[e.target];
        if (!a || !b) return null;
        const p = mid(a);
        const q = mid(b);
        const mx = (p.x + q.x) / 2;
        const my = (p.y + q.y) / 2;
        const pillW = Math.max(82, (e.label?.length || 8) * 6.4 + 14);
        return (
          <g key={`${e.id}-label`} style={{ pointerEvents: 'none' }}>
            <rect
              x={mx - pillW / 2}
              y={my - 11}
              width={pillW}
              height={20}
              rx="6"
              fill="var(--canvas)"
              stroke="var(--hairline)"
              strokeWidth="1"
            />
            <text
              x={mx}
              y={my + 3}
              fontSize="10.5"
              fontWeight="500"
              fill="var(--ink-muted)"
              textAnchor="middle"
            >
              {e.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
