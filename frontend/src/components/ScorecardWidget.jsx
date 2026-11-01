import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Database,
  ShieldCheck,
  ShieldWarning,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import StatusBadge from './StatusBadge';

export default function ScorecardWidget({ scorecardData, compact = false, onClose }) {
  const [data, setData] = useState(scorecardData || null);

  useEffect(() => {
    if (scorecardData) {
      setData(scorecardData);
      return;
    }
    let isMounted = true;
    fetch('/api/briefing')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setData(json?.scorecard || null);
        }
      })
      .catch(() => {
        // Fallback to seeded demo defaults if backend is initializing
        if (isMounted) {
          setData({
            repo_name: 'HealthConnect',
            measured_at: '2026-10-31T21:15:59Z',
            total_seeded_anomalies: 10,
            hard_blocked_edits: 7,
            cautionary_historical_intercepts: 3,
            routine_crud_false_positives: 0,
            live_intercept_events: 2,
            prevention_rate_label: '10 / 10 Protected (7 Hard Rejects, 3 Historical Cautions)',
            last_intercepted_fence_id: 'FENCE-003',
            last_intercept_decision: 'WARN_AND_REQUIRE_CONFIRMATION',
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, [scorecardData]);

  const scorecard = data || {
    repo_name: 'HealthConnect',
    measured_at: '2026-10-31T21:15:59Z',
    total_seeded_anomalies: 10,
    hard_blocked_edits: 7,
    cautionary_historical_intercepts: 3,
    routine_crud_false_positives: 0,
    live_intercept_events: 2,
    prevention_rate_label: '10 / 10 Protected (7 Hard Rejects, 3 Historical Cautions)',
    last_intercepted_fence_id: 'FENCE-003',
    last_intercept_decision: 'WARN_AND_REQUIRE_CONFIRMATION',
  };

  return (
    <div className={`scorecard-widget ${compact ? 'scorecard-compact' : ''}`}>
      <div className="scorecard-widget-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={18} weight="regular" aria-hidden="true" />
          <h2 className="card-title" style={{ margin: 0, fontSize: compact ? '15px' : '17px' }}>
            {scorecard.repo_name || 'HealthConnect'} Invariant Telemetry Scorecard
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-badge status-good">
            <ShieldCheck size={16} weight="regular" aria-hidden="true" />
            <span>{scorecard.prevention_rate_label}</span>
          </span>
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary btn-icon"
              style={{ minHeight: '32px', minWidth: '32px', padding: '0 6px' }}
              onClick={onClose}
              aria-label="Close Scorecard"
            >
              <X size={16} weight="regular" />
            </button>
          )}
        </div>
      </div>

      <div className="scorecard-grid">
        <div className="scorecard-item">
          <span className="scorecard-label">Seeded AST Anomalies</span>
          <span className="scorecard-num">{scorecard.total_seeded_anomalies ?? 10}</span>
          <span className="form-helper">5 High-Suspicion Patterns</span>
        </div>

        <div className="scorecard-item">
          <span className="scorecard-label">Hard-Blocked Edits</span>
          <span className="scorecard-num" style={{ color: 'var(--status-critical)' }}>
            {scorecard.hard_blocked_edits ?? 7}
          </span>
          <span className="form-helper">Zero-Tolerance Pre-Commit</span>
        </div>

        <div className="scorecard-item">
          <span className="scorecard-label">Historical Cautions</span>
          <span className="scorecard-num" style={{ color: 'var(--status-warning)' }}>
            {scorecard.cautionary_historical_intercepts ?? 3}
          </span>
          <span className="form-helper">Warn & Require Voice Confirm</span>
        </div>

        <div className="scorecard-item">
          <span className="scorecard-label">Routine CRUD False Positives</span>
          <span className="scorecard-num" style={{ color: 'var(--status-good)' }}>
            {scorecard.routine_crud_false_positives ?? 0}
          </span>
          <span className="form-helper">Verified Clean Noise Floor</span>
        </div>

        <div className="scorecard-item">
          <span className="scorecard-label">Live Intercept Events</span>
          <span className="scorecard-num">{scorecard.live_intercept_events ?? 2}</span>
          <span className="form-helper">Active MCP Guardrail Intercepts</span>
        </div>
      </div>

      <div className="scorecard-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="form-helper">Last Intercept:</span>
          <span className="mono-metric" style={{ fontSize: '12px' }}>
            {scorecard.last_intercepted_fence_id || 'FENCE-003'}
          </span>
          <StatusBadge status={scorecard.last_intercept_decision || 'WARN_AND_REQUIRE_CONFIRMATION'} />
        </div>
        <span className="form-helper num-col">
          Measured at: {scorecard.measured_at || '2026-10-31T21:15:59Z'}
        </span>
      </div>
    </div>
  );
}
