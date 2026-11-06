import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ChatCircleText,
  ClockCounterClockwise,
  Info,
  ShieldCheck,
  ShieldWarning,
} from '@phosphor-icons/react';
import { defineMonacoThemes } from '../../monacoTheme';
import { useWorkbenchSelection } from '../../context/WorkbenchContext';
import FileSwitcher from './FileSwitcher';
import { useI18n } from '../../i18n';

export default function WorkbenchEditor({ theme = 'light' }) {
  const { t } = useI18n();
  const { file, line, fenceId, activeDoc, selectLine, setPanel } = useWorkbenchSelection();
  const [editorCode, setEditorCode] = useState(activeDoc.code);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const cursorListenerRef = useRef(null);

  // Sync editor contents when active file changes
  useEffect(() => {
    setEditorCode(activeDoc.code);
  }, [activeDoc.path, activeDoc.code]);

  // Define themes before mounting
  const handleEditorWillMount = (monaco) => {
    defineMonacoThemes(monaco);
  };

  // Setup decorations & interactions
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    applyFenceDecorations(editor, monaco, activeDoc);

    // Track cursor/line selection
    cursorListenerRef.current = editor.onDidChangeCursorPosition((e) => {
      const newLine = e.position.lineNumber;
      const matchingFence = activeDoc.fences?.find(
        (f) => newLine >= f.startLine && newLine <= f.endLine
      );
      selectLine(newLine, matchingFence ? matchingFence.id : null);
    });

    // Reveal requested initial line
    if (line) {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
    }
  };

  const applyFenceDecorations = (editor, monaco, doc) => {
    if (!editor || !monaco) return;

    const decorations = (doc.fences || []).map((fence) => ({
      range: new monaco.Range(fence.startLine, 1, fence.endLine, 1),
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'whyline-gutter-pin-verified',
        linesDecorationsClassName: 'whyline-gutter-pin-line',
        inlineClassName: 'whyline-inline-fence-highlight',
        glyphMarginHoverMessage: {
          value: `**Spoken Fence (${fence.id})**: ${fence.badge || 'Protected AST Invariant'}\n\n*Click to inspect Spoken ADR & provenance.*`,
        },
      },
    }));

    if (decorationsRef.current) {
      decorationsRef.current.set(decorations);
    } else {
      decorationsRef.current = editor.createDecorationsCollection(decorations);
    }
  };

  // Re-apply decorations whenever doc changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      applyFenceDecorations(editorRef.current, monacoRef.current, activeDoc);
    }
  }, [activeDoc]);

  // Reveal line whenever line prop changes
  useEffect(() => {
    if (editorRef.current && line) {
      editorRef.current.revealLineInCenter(line);
      editorRef.current.setPosition({ lineNumber: line, column: 1 });
    }
  }, [line]);

  // Clean up listeners
  useEffect(() => {
    return () => {
      cursorListenerRef.current?.dispose();
    };
  }, []);

  const editorThemeName = theme === 'dark' ? 'whyline-cream-dark' : 'whyline-cream-light';
  const activeFence = activeDoc.fences?.find((f) => line >= f.startLine && line <= f.endLine);

  return (
    <div
      className="workbench-editor-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '520px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      <FileSwitcher />

      {/* Protected Invariant Callout */}
      {activeFence && (
        <div
          className="fence-protection-banner"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '8px 16px',
            background: 'var(--accent-wash)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <ShieldCheck size={18} weight="fill" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {activeFence.badge}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '30px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setPanel('why')}
            >
              <ClockCounterClockwise size={14} weight="regular" />
              <span>See History</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ minHeight: '30px', padding: '0 10px', fontSize: '12px' }}
              onClick={() => setPanel('ask')}
            >
              <ChatCircleText size={14} weight="regular" />
              <span>Ask Co-Pilot</span>
            </button>
          </div>
        </div>
      )}

      {/* Monaco Editor Mount */}
      <div style={{ flex: 1, minHeight: '440px', position: 'relative' }}>
        <Editor
          height="100%"
          language={activeDoc.language}
          value={editorCode}
          onChange={(newVal) => setEditorCode(newVal || '')}
          theme={editorThemeName}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
          options={{
            glyphMargin: true,
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            readOnly: false,
            fontFamily: "var(--font-mono), 'DM Mono', monospace",
            fontLigatures: false,
            fontSize: 13,
            lineHeight: 22,
            renderLineHighlight: 'all',
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
}
