import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ChatCircleText,
  FileCode,
  ShieldCheck,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { defineMonacoThemes } from '../monacoTheme';
import AskRepoDrawer from './AskRepoDrawer';
import StatusBadge from './StatusBadge';
import { FormattedText } from './CodeText';

const DEFAULT_GATEWAY_ROUTER_CODE = `package com.healthconnect.payments;

public class GatewayRouter {
    // PR #212: Workaround for Razorpay-Legacy v1 midnight settlement packet drop
    public PaymentReceipt dispatchSettlement(String orderId, long amountPaise) {
        int retryCount = 5;
        long timeoutMs = 4500;
        for (int attempt = 1; attempt <= retryCount; attempt++) {
            boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);
            if (delivered) {
                return new PaymentReceipt(orderId, "SETTLED", attempt);
            }
        }
        throw new IllegalStateException("Settlement exhausted after " + retryCount + " attempts");
    }

    private boolean sendV1Frame(String orderId, long amountPaise, long timeoutMs) {
        return orderId != null && amountPaise > 0 && timeoutMs >= 4500;
    }

    public record PaymentReceipt(String orderId, String status, int attempts) {}
}
`;

export default function MonacoCodeStudio({
  code = DEFAULT_GATEWAY_ROUTER_CODE,
  theme = 'light',
  onOpenAskDrawer,
}) {
  const [currentCode, setCurrentCode] = useState(code);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  useEffect(() => {
    if (code) {
      setCurrentCode(code);
    }
  }, [code]);

  const triggerAskDrawer = (fenceId = 'FENCE-001', playAudio = true) => {
    if (onOpenAskDrawer) {
      onOpenAskDrawer(fenceId, playAudio);
    } else {
      setAutoPlayAudio(playAudio);
      setDrawerOpen(true);
    }
  };

  const handlePlayFenceAudio = () => {
    setAudioPlaying(true);
    const audio = new Audio('/api/audio/FENCE-001.wav');
    audio.onended = () => setAudioPlaying(false);
    audio.onerror = () => setAudioPlaying(false);
    audio.play().catch(() => setAudioPlaying(false));
  };

  const handleEditorWillMount = (monaco) => {
    defineMonacoThemes(monaco);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.createDecorationsCollection([
      {
        range: new monaco.Range(5, 1, 15, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'whyline-gutter-pin-verified',
          linesDecorationsClassName: 'whyline-gutter-pin-line',
          inlineClassName: 'whyline-inline-fence-highlight',
          glyphMarginHoverMessage: {
            value:
              '**Spoken Fence (FENCE-001)**: Verified Active by @anjani (PR #212).\n\n*Click to inspect Spoken ADR & play 16kHz audio note.*',
          },
        },
      },
    ]);

    editor.onMouseDown((e) => {
      const target = e.target;
      const lineNumber = target.position?.lineNumber;
      const isGutterTarget =
        target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS ||
        target.element?.classList?.contains('whyline-gutter-pin-verified') ||
        target.element?.classList?.contains('whyline-gutter-pin-line');

      if (isGutterTarget && lineNumber >= 5 && lineNumber <= 15) {
        triggerAskDrawer('FENCE-001', true);
      }
    });
  };

  const editorThemeName = theme === 'dark' ? 'whyline-cream-dark' : 'whyline-cream-light';

  return (
    <div className="studio-split">
      {/* Left: Code Editor with Gutter Marker */}
      <div className="monaco-studio-wrapper">
        <div className="monaco-studio-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={16} weight="regular" aria-hidden="true" />
            <span className="mono-metric" style={{ fontWeight: 500, color: 'var(--ink)' }}>
              src/payments/GatewayRouter.java
            </span>
            <span className="form-helper">• Lines 5–15 fenced</span>
          </div>
          <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
            Java 21 • UTF-8
          </span>
        </div>

        <div className="monaco-studio-editor">
          <Editor
            height="460px"
            language="java"
            value={currentCode}
            theme={editorThemeName}
            beforeMount={handleEditorWillMount}
            onMount={handleEditorDidMount}
            options={{
              glyphMargin: true,
              lineNumbers: 'on',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              readOnly: false,
              fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 20,
              renderLineHighlight: 'all',
              tabSize: 4,
            }}
          />
        </div>
      </div>

      {/* Right: Calm Side Panel for the Fence Note, Audio Player, and Provenance */}
      <aside className="card" aria-label="Spoken Fence Note Panel">
        <div className="card-header">
          <div>
            <span className="small-caps">Gutter Note • Lines 5–15</span>
            <h2 className="card-title" style={{ marginTop: '4px' }}>
              FENCE-001 • dispatchSettlement
            </h2>
          </div>
          <StatusBadge status="VERIFIED_ACTIVE" />
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="small-caps">Recorded Reason (Why)</div>
            <p className="body-prose" style={{ marginTop: '6px' }}>
              <FormattedText text="Hardcoded `int retryCount = 5; long timeoutMs = 4500;` absorbs Razorpay-Legacy v1 midnight settlement TCP packet drops until `gateway.version` transitions to `v2`." />
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--hairline)',
              background: 'var(--canvas)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span className="small-caps">Spoken ADR Audio (16kHz WAV)</span>
              <span className="mono-metric" aria-live="polite">
                {audioPlaying ? 'Playing…' : '00:09 • te-IN'}
              </span>
            </div>
            <p className="form-helper" style={{ fontStyle: 'italic', color: 'var(--ink)' }}>
              "Avunu, correct! GatewayRouter lo retryCount = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application.yml lo gateway.version v2 ki marustaru."
            </p>
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePlayFenceAudio}
              >
                <SpeakerHigh size={16} weight="regular" aria-hidden="true" />
                <span>Play Audio Note</span>
              </button>
            </div>
          </div>

          <div>
            <div className="small-caps">Provenance &amp; Expiry Rule</div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Origin</span>
                <span className="mono-metric">PR #212 • INC-9921 • 9f3c2a1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Author</span>
                <span className="mono-metric">@anjani (Verified Active)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>Expiry Condition</span>
                <span className="mono-metric">gateway.version == 'v2'</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--hairline)' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => triggerAskDrawer('FENCE-001', true)}
            >
              <ChatCircleText size={16} weight="regular" aria-hidden="true" />
              <span>Ask Co-Pilot About FENCE-001</span>
            </button>
          </div>
        </div>
      </aside>

      {!onOpenAskDrawer && (
        <AskRepoDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          initialFenceId="FENCE-001"
          autoPlayAudio={autoPlayAudio}
        />
      )}
    </div>
  );
}
