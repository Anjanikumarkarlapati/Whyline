import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClockCounterClockwise,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Info,
  ShieldCheck,
  ShieldWarning,
  WarningOctagon,
} from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../../context/WorkbenchContext';
import { useI18n } from '../../i18n';

export default function WhyTabPanel() {
  const { t } = useI18n();
  const { file, line, fenceId, activeDoc } = useWorkbenchSelection();

  const fileName = file.split('/').pop();
  const isGatewayRouter = fileName.includes('GatewayRouter');
  const isDicom = fileName.includes('DicomShaderPipeline');
  const isJwt = fileName.includes('JwtClockSkewFilter');
  const hasFences = isGatewayRouter || isDicom || isJwt || (activeDoc.fences && activeDoc.fences.length > 0);

  // Context metadata derived from file and line
  const commitSha = isGatewayRouter ? '17c074a' : isDicom ? '8f2d1e0' : '3b9c4f1';
  const commitMsg = isGatewayRouter
    ? 'fix(payments): add retry loop to absorb Razorpay-Legacy v1 packet drops'
    : isDicom
    ? 'fix(imaging): inject 120ms thread sleep to avoid Adreno GPU sync race'
    : 'fix(auth): tolerate 180s clock drift on offline clinic tablets';
  const prNum = isGatewayRouter ? 'PR #212' : isDicom ? 'PR #184' : 'PR #149';
  const incidentId = isGatewayRouter ? 'INC-9921' : isDicom ? 'INC-8812' : 'INC-7430';
  const incidentTitle = isGatewayRouter
    ? 'Midnight Settlement Frame Drops (18% dropped transactions)'
    : isDicom
    ? 'Clinic Tablet GPU Render Crash in Mobile Diagnostics'
    : 'Clinic JWT Expired Token Rejection during Outstation Rallies';
  const anomalyType = isGatewayRouter
    ? 'MAGIC_LITERAL_CONTROL_FLOW'
    : isDicom
    ? 'EXPLICIT_THREAD_HALT'
    : 'MAGIC_LITERAL_CONTROL_FLOW';
  const anomalyToken = isGatewayRouter
    ? 'timeoutMs = 4500, retryCount = 5'
    : isDicom
    ? 'Thread.sleep(120)'
    : 'clockSkewSeconds = 180';

  return (
    <div className="why-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Anchor Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="small-caps" style={{ color: 'var(--text-secondary)' }}>
            Provenance Timeline:
          </span>
          <span
            className="mono-metric"
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-strong)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {fileName}:{line}
          </span>
        </div>
        {fenceId && (
          <span className="status-badge status-good" style={{ fontSize: '11px', padding: '2px 8px' }}>
            <ShieldCheck size={13} weight="fill" aria-hidden="true" />
            <span>Guarded Invariant</span>
          </span>
        )}
      </div>

      {!hasFences ? (
        <div
          className="empty-why-state card"
          style={{
            padding: '32px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--bg-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <Info size={22} weight="regular" />
          </div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600 }}>
            Standard Repository Configuration
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '36ch' }}>
            No historical incident post-mortems or spoken fences are registered for {fileName}. Configuration files can be modified directly.
          </p>
        </div>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            WhyLine reconstructs the unwritten why for this line from git blame, pull request reviews, and resolved incident post-mortems:
          </p>

          {/* Vertical Timeline */}
          <div
            className="why-timeline"
            style={{
              position: 'relative',
              paddingLeft: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Timeline connector vertical hairline */}
            <div
              style={{
                position: 'absolute',
                left: '11px',
                top: '8px',
                bottom: '8px',
                width: '2px',
                background: 'var(--border-default)',
              }}
              aria-hidden="true"
            />

            {/* Node 1: Git Commit */}
            <div className="timeline-item" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <GitCommit size={14} weight="bold" />
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="mono-metric" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '12px' }}>
                    Commit {commitSha}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>@anjani • 2026-11-01</span>
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.4' }}>
                  "{commitMsg}"
                </p>
                <Link
                  to={`/memory?view=graph&focus=${fenceId || 'FENCE-001'}`}
                  className="btn btn-secondary"
                  style={{ minHeight: '30px', padding: '0 10px', fontSize: '12px' }}
                >
                  <GitBranch size={14} />
                  <span>Inspect in Git Graph</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Node 2: Pull Request */}
            <div className="timeline-item" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <GitPullRequest size={14} weight="bold" />
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="mono-metric" style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '12px' }}>
                    {prNum}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Approved by @srinivas-principal</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
                  Requires <code>retryCount &gt;= 5</code> and <code>timeoutMs &gt;= 4500</code> until upstream gateway version transitions to v2.
                </p>
              </div>
            </div>

            {/* Node 3: Linked Incident */}
            <div className="timeline-item" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--status-critical, #B3261E)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-critical, #B3261E)',
                }}
              >
                <WarningOctagon size={14} weight="fill" />
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="mono-metric" style={{ fontWeight: 700, color: 'var(--status-critical, #B3261E)', fontSize: '12px' }}>
                    {incidentId}
                  </span>
                  <span className="status-badge status-good" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    Resolved &amp; Fenced
                  </span>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 600 }}>
                  {incidentTitle}
                </p>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Root cause: Upstream edge proxy TCP resets without backoff under midnight batch load.
                </p>
                <Link
                  to={`/memory?view=ledger&incident=${incidentId}`}
                  className="btn btn-secondary"
                  style={{ minHeight: '30px', padding: '0 10px', fontSize: '12px' }}
                >
                  <ClockCounterClockwise size={14} />
                  <span>Open Incident Post-Mortem</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>

            {/* Node 4: AST Guardrail Flag */}
            <div className="timeline-item" style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  border: '2px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <ShieldCheck size={14} weight="fill" />
              </div>

              <div className="card" style={{ padding: '14px', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="mono-metric" style={{ fontWeight: 600, fontSize: '12px', color: 'var(--accent)' }}>
                    {anomalyType}
                  </span>
                  <span className="mono-metric" style={{ fontSize: '11px' }}>Normalized Hash 9b73fc25</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Matched Token: <code>{anomalyToken}</code>
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
