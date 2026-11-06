import React, { useEffect, useRef, useState } from 'react';
import {
  ChatCircleText,
  ClockCounterClockwise,
  Code,
  DotsThreeVertical,
  ShieldCheck,
} from '@phosphor-icons/react';
import { WorkbenchProvider, useWorkbenchSelection } from '../context/WorkbenchContext';
import WorkbenchEditor from '../components/workbench/WorkbenchEditor';
import FenceTabPanel from '../components/workbench/FenceTabPanel';
import WhyTabPanel from '../components/workbench/WhyTabPanel';
import AskTabPanel from '../components/workbench/AskTabPanel';
import { useI18n } from '../i18n';

function WorkbenchContent({ theme }) {
  const { t } = useI18n();
  const { panel, setPanel } = useWorkbenchSelection();

  // Draggable split ratio persisted in localStorage (default: 60% editor / 40% panel)
  const [splitRatio, setSplitRatio] = useState(() => {
    try {
      const saved = localStorage.getItem('whyline-split-ratio');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.45 && val <= 0.7) {
          return val;
        }
      }
    } catch {
      // Ignore storage error
    }
    return 0.6;
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Drag handler for divider handle
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawRatio = (e.clientX - rect.left) / rect.width;
      // Clamp between 45% (0.45) editor and 70% (0.70) editor (min panel 30%)
      const clamped = Math.min(Math.max(rawRatio, 0.45), 0.7);
      setSplitRatio(clamped);
      try {
        localStorage.setItem('whyline-split-ratio', String(clamped));
      } catch {
        // Ignore storage error
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const editorWidthPercent = (splitRatio * 100).toFixed(2);
  const panelWidthPercent = ((1 - splitRatio) * 100).toFixed(2);

  return (
    <div className="page-stack workbench-page-stack" style={{ width: '100%', overflowX: 'clip' }}>
      {/* Workbench Header */}
      <section className="context-header" style={{ marginBottom: '8px' }}>
        <div>
          <p className="context-meta">{t('workbenchContext')}</p>
          <h1 className="page-title">{t('workbenchTitle')}</h1>
        </div>
      </section>

      {/* Main Split Grid / Flex Container */}
      <div
        ref={containerRef}
        className="workbench-split-grid"
        style={{
          display: 'flex',
          gap: '0',
          position: 'relative',
          width: '100%',
          userSelect: isDragging ? 'none' : 'auto',
          minHeight: '620px',
        }}
      >
        {/* Left Column: Monaco Code Editor & File Switcher */}
        <div
          className="workbench-editor-col"
          style={{
            flex: `0 0 ${editorWidthPercent}%`,
            width: `${editorWidthPercent}%`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <WorkbenchEditor theme={theme} />
        </div>

        {/* Draggable Divider Handle (Desktop) */}
        <div
          className="workbench-divider-handle"
          role="separator"
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuemin={45}
          aria-valuemax={70}
          aria-label="Resize editor and context panel"
          onMouseDown={() => setIsDragging(true)}
          style={{
            width: '16px',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            zIndex: 10,
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <div
            style={{
              width: '4px',
              height: '40px',
              borderRadius: '2px',
              background: isDragging ? 'var(--accent)' : 'var(--border-strong)',
              transition: 'background 120ms ease',
            }}
          />
        </div>

        {/* Right Column: Context Tabs (Fence, Why, Ask) */}
        <aside
          className="workbench-context-col card"
          style={{
            flex: `0 0 calc(${panelWidthPercent}% - 16px)`,
            width: `calc(${panelWidthPercent}% - 16px)`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '16px',
            padding: '16px',
            overflow: 'visible',
          }}
          aria-label="Workbench Context Panel"
        >
          {/* Segmented Control for Context Tabs */}
          <div
            className="segmented-control"
            role="tablist"
            aria-label="Workbench context panel tabs"
            style={{
              display: 'flex',
              background: 'var(--bg-raised)',
              padding: '3px',
              borderRadius: '999px',
              border: '1px solid var(--border-default)',
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={panel === 'fence'}
              className={`btn ${panel === 'fence' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                borderRadius: '999px',
                minHeight: '34px',
                padding: '0 12px',
                fontSize: '13px',
                justifyContent: 'center',
              }}
              onClick={() => setPanel('fence')}
            >
              <ShieldCheck size={16} weight="regular" aria-hidden="true" />
              <span>{t('tabFence')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={panel === 'why'}
              className={`btn ${panel === 'why' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                borderRadius: '999px',
                minHeight: '34px',
                padding: '0 12px',
                fontSize: '13px',
                justifyContent: 'center',
              }}
              onClick={() => setPanel('why')}
            >
              <ClockCounterClockwise size={16} weight="regular" aria-hidden="true" />
              <span>{t('tabWhy')}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={panel === 'ask'}
              className={`btn ${panel === 'ask' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                flex: 1,
                borderRadius: '999px',
                minHeight: '34px',
                padding: '0 12px',
                fontSize: '13px',
                justifyContent: 'center',
              }}
              onClick={() => setPanel('ask')}
            >
              <ChatCircleText size={16} weight="regular" aria-hidden="true" />
              <span>{t('tabAsk')}</span>
            </button>
          </div>

          {/* Active Tab Panel Content */}
          <div className="workbench-tab-content" style={{ flex: 1, minHeight: '400px' }}>
            {panel === 'fence' && <FenceTabPanel />}
            {panel === 'why' && <WhyTabPanel />}
            {panel === 'ask' && <AskTabPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function WorkbenchPage({ theme }) {
  return (
    <WorkbenchProvider>
      <WorkbenchContent theme={theme} />
    </WorkbenchProvider>
  );
}
