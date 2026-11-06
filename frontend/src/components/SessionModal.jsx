import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, GitBranch, UserCircle, X } from '@phosphor-icons/react';
import { useI18n } from '../i18n';

export default function SessionModal({ isOpen, onClose }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('anjani@healthconnect.in');
  const [repo, setRepo] = useState('healthconnect-gateway');
  const [role, setRole] = useState('Lead SRE / Codebase Author');
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
    navigate('/studio');
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
          maxWidth: '480px',
          width: '100%',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          padding: '24px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCircle size={24} weight="regular" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <h2 id="session-modal-title" style={{ fontSize: '18px', margin: 0, fontFamily: 'Crimson Text, serif' }}>
              WhyLine Session &amp; Repository
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close session dialog"
            style={{ minHeight: '32px', minWidth: '32px' }}
          >
            <X size={16} weight="regular" />
          </button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Select your engineer identity and repository boundary. Voice notes and AST guardrails are partitioned per repository.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="session-email">
              Engineer Email
            </label>
            <input
              id="session-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="session-repo">
              Repository Boundary
            </label>
            <select
              id="session-repo"
              className="form-select"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
            >
              <option value="healthconnect-gateway">HealthConnect Payment Gateway v1 (Active)</option>
              <option value="razorpay-adapter">Razorpay Adapter Service</option>
              <option value="core-banking">Core Banking Settlement Node</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="session-role">
              Engineering Role
            </label>
            <input
              id="session-role"
              type="text"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <CheckCircle size={16} weight="regular" aria-hidden="true" />
              <span>Enter Workbench</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
