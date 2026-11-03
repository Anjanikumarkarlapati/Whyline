import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ChatCircleText,
  FileCode,
  SpeakerHigh,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
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
  const { lang, t } = useI18n();
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
    const audio = new Audio('/api/audio/fence-001.wav');
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
            value: t('studioHoverMessage'),
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
            <span className="form-helper">• {t('studioLinesFenced')}</span>
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
            <span className="small-caps">{t('studioGutterNote')}</span>
            <h2 className="card-title" style={{ marginTop: '4px' }}>
              FENCE-001 • dispatchSettlement
            </h2>
          </div>
          <StatusBadge status="VERIFIED_ACTIVE" />
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="small-caps">{t('studioRecordedReason')}</div>
            <p className="body-prose" style={{ marginTop: '6px' }}>
              <FormattedText text={t('studioRecordedReasonBody')} />
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
              <span className="small-caps">{t('studioSpokenAdrAudio')}</span>
              <span className="mono-metric" aria-live="polite">
                {audioPlaying ? t('studioPlaying') : `00:09 • ${toBcp47(lang)}`}
              </span>
            </div>
            <p className="form-helper" style={{ fontStyle: 'italic', color: 'var(--ink)' }}>
              "{t('defaultVoiceSample')}"
            </p>
            <div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handlePlayFenceAudio}
              >
                <SpeakerHigh size={16} weight="regular" aria-hidden="true" />
                <span>{t('studioPlayAudioNote')}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="small-caps">{t('studioProvenanceExpiry')}</div>
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
                <span style={{ color: 'var(--ink-muted)' }}>{t('studioOriginLabel')}</span>
                <span className="mono-metric">PR #212 • INC-9921 • 9f3c2a1</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>{t('studioAuthorLabel')}</span>
                <span className="mono-metric">@anjani ({t('statusVerifiedActive')})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--ink-muted)' }}>{t('studioExpiryConditionLabel')}</span>
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
              <span>{t('studioAskCopilotBtn')}</span>
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

