import React from 'react';
import { CaretDown, Check, FileCode, ShieldCheck } from '@phosphor-icons/react';
import { useWorkbenchSelection } from '../../context/WorkbenchContext';

export default function FileSwitcher() {
  const { file, line, fenceId, activeDoc, demoFiles, selectFile } = useWorkbenchSelection();

  // Split path for breadcrumb display
  const segments = file.split('/');
  const fileName = segments[segments.length - 1];
  const dirPath = segments.slice(0, -1).join(' / ');

  return (
    <div
      className="workbench-file-switcher"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '10px 16px',
        background: 'var(--bg-raised)',
        borderBottom: '1px solid var(--border-default)',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
      }}
    >
      {/* Breadcrumb & Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <FileCode size={18} weight="regular" style={{ color: 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          {dirPath} /
        </span>
        <div className="file-dropdown-wrapper" style={{ position: 'relative' }}>
          <select
            className="form-select file-select"
            value={file}
            onChange={(e) => selectFile(e.target.value)}
            aria-label="Select file in repository"
            style={{
              padding: '4px 28px 4px 10px',
              fontSize: '13px',
              fontFamily: 'DM Mono, monospace',
              fontWeight: 600,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            {demoFiles.map((doc) => (
              <option key={doc.path} value={doc.path}>
                {doc.shortName} {doc.fenceId ? `(${doc.fenceId})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Badges: Language, Line, Fence Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          className="mono-metric"
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          {activeDoc.language === 'java' ? 'Java 21 • UTF-8' : 'YAML • UTF-8'}
        </span>

        <span
          className="mono-metric"
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'var(--accent-wash)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            fontWeight: 600,
          }}
        >
          Line {line}
        </span>

        {fenceId && (
          <span
            className="status-badge status-good"
            style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <ShieldCheck size={13} weight="fill" aria-hidden="true" />
            <span>{fenceId}</span>
          </span>
        )}
      </div>
    </div>
  );
}
