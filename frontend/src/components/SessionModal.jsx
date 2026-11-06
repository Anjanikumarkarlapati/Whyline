import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, GitBranch, X } from '@phosphor-icons/react';
import { QUICK_GITHUB_REPOS } from '../context/WorkbenchContext';

export default function SessionModal({ isOpen, onClose }) {
  const [repoUrl, setRepoUrl] = useState('https://github.com/HealthConnect/payment-gateway-v1');
  const [loading, setLoading] = useState(false);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/github/current')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.repo?.url) setRepoUrl(data.repo.url);
        })
        .catch(() => {});

      closeBtnRef.current?.focus();
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await fetch('/api/github/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.repo) {
          window.dispatchEvent(
            new CustomEvent('whyline-repo-updated', { detail: { repo: data.repo } })
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        className="card session-modal-card"
        style={{
          maxWidth: '500px',
          width: '100%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '18px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={22} weight="regular" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 id="session-modal-title" style={{ fontSize: '18px', margin: 0 }}>
              Switch GitHub Repository
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
            style={{ minHeight: '32px', minWidth: '32px' }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}
        >
          Paste any GitHub repository link or click one of the sample repositories below. WhyLine will load its files so you can ask questions, read answers, and explore flowcharts.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="session-repo-url">
              GitHub Repository Link (URL or owner/repo)
            </label>
            <input
              id="session-repo-url"
              type="text"
              className="form-input"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/expressjs/express"
              required
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {QUICK_GITHUB_REPOS.map((qr) => (
                <button
                  key={qr.fullName}
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  onClick={() => setRepoUrl(qr.url)}
                >
                  {qr.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <CheckCircle size={16} weight="regular" aria-hidden="true" />
              <span>{loading ? 'Loading Repo...' : 'Load GitHub Repo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
