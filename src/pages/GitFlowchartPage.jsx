import React, { useEffect, useRef, useState } from 'react';
import { SpeakerHigh, Waveform, Play, Pause, GitBranch } from '@phosphor-icons/react';
import { useI18n, toBcp47, fromBcp47 } from '../i18n';
import { apiFetch as fetch } from '../api/mockApi';
import InteractiveFlowchartSvg from '../components/InteractiveFlowchartSvg';

const LANGS = [
  ['en-IN', 'English (EN)'],
  ['te-IN', 'తెలుగు (TE)'],
  ['hi-IN', 'हिंदी (HI)'],
];

const PUBLIC_REPOS = [
  {
    labelKey: 'presetRepoWhyline',
    url: 'https://github.com/Anjanikumarkarlapati/Whyline',
  },
  {
    labelKey: 'presetRepoHealthConnect',
    url: 'https://github.com/healthconnect-india/payment-gateway-service',
  },
  {
    labelKey: 'presetRepoDicom',
    url: 'https://github.com/whyline-labs/clinical-dicom-pipeline',
  },
];

export default function GitFlowchartPage() {
  const { lang, setLang, t } = useI18n();
  const [target, setTarget] = useState('https://github.com/Anjanikumarkarlapati/Whyline');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [done, setDone] = useState([]);
  const audioRef = useRef(null);
  const stopRef = useRef(false);

  const bcp47Lang = toBcp47(lang);

  const stop = () => {
    stopRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    setActiveStep(null);
  };

  const scan = async (overrideLangCode, overrideTarget) => {
    const activeBcp = overrideLangCode || bcp47Lang;
    const activeTarget = overrideTarget || target;
    stop();
    setLoading(true);
    setError('');
    setDone([]);
    try {
      const r = await fetch('/api/git/scan-narrated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path_or_url: activeTarget, language: activeBcp }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || 'Scan failed');
      setData(j);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  // Auto-scan initial public GitHub repository and re-scan whenever global language changes
  useEffect(() => {
    scan(toBcp47(lang), target);
    return () => stop();
  }, [lang]);

  const playFrom = async (idx) => {
    if (!data?.narration?.length || idx < 0) return;
    stopRef.current = false;
    const steps = data.narration;
    const load = (i) => {
      const a = new Audio(steps[i].audio_url);
      a.preload = 'auto';
      return a;
    };
    let next = idx < steps.length ? load(idx) : null;
    for (let i = idx; i < steps.length && !stopRef.current; i += 1) {
      setActiveStep(i);
      const currentNarration = steps[i];
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && currentNarration?.text) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(currentNarration.text);
          utter.lang = currentNarration.language || bcp47Lang;
          utter.rate = 1.0;
          window.speechSynthesis.speak(utter);
        } catch {
          // Ignore browser TTS error
        }
      }

      const audio = next;
      next = i + 1 < steps.length ? load(i + 1) : null;
      audioRef.current = audio;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => {
        audio.onended = res;
        audio.onerror = res;
        audio.onpause = res;
        audio.play().catch(res);
      });
      if (!stopRef.current) {
        setDone((d) => (d.includes(steps[i].node_id) ? d : [...d, steps[i].node_id]));
      }
    }
    if (!stopRef.current) setActiveStep(null);
  };

  const step = activeStep != null && data?.narration ? data.narration[activeStep] : null;
  const nodeIdx = (id) => data.narration.findIndex((s) => s.node_id === id);
  const voiceMeta = data?.voice_analysis || {
    speaker: 'Nalini (Gnani Vachana timbre-v2.5)',
    language: bcp47Lang,
    sample_rate_hz: 16000,
    fundamental_hz: lang === 'te' ? 215 : lang === 'hi' ? 198 : 185,
    cadence_hz: lang === 'te' ? 5.2 : lang === 'hi' ? 4.6 : 4.1,
  };

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">{t('gitContext')}</p>
          <h1 className="page-title">{t('gitTitle')}</h1>
        </div>
      </section>

      <section className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <input
            className="form-input"
            aria-label={t('gitInputAria')}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ flex: '1 1 320px', fontFamily: 'var(--font-mono)' }}
          />
          <select
            className="form-select"
            aria-label={t('gitLangAria')}
            value={bcp47Lang}
            onChange={(e) => setLang(fromBcp47(e.target.value))}
            style={{ width: 'auto', minWidth: 150 }}
          >
            {LANGS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => scan(bcp47Lang, target)}
            disabled={loading}
          >
            {loading ? t('gitBtnScanning') : t('gitBtnScanExplain')}
          </button>
          {data && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => playFrom(0)}>
                <Play size={15} weight="regular" aria-hidden="true" />
                <span>{t('gitBtnPlayWalkthrough')}</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={stop}>
                <Pause size={15} weight="regular" aria-hidden="true" />
                <span>{t('gitBtnStop')}</span>
              </button>
            </>
          )}
        </div>

        <div className="chip-row">
          {PUBLIC_REPOS.map((repo) => (
            <button
              key={repo.url}
              type="button"
              className={`filter-chip ${target === repo.url ? 'active' : ''}`}
              onClick={() => {
                setTarget(repo.url);
                scan(bcp47Lang, repo.url);
              }}
            >
              <GitBranch size={13} weight="regular" aria-hidden="true" />
              <span className="mono-metric">{t(repo.labelKey)}</span>
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div role="alert" className="card card-padded" style={{ color: 'var(--danger)' }}>
          Error: {error}
        </div>
      )}

      {data && (
        <>
          <section className="card card-padded" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <p className="form-helper" aria-live="polite" style={{ margin: 0, fontWeight: 600, color: 'var(--ink)' }}>
                {step
                  ? `${t('gitStepPrefix')} ${step.step}/${data.narration.length} (${step.title}): ${step.text}`
                  : `${data.repo_metadata.slug || data.repo_metadata.name} — ${data.narration.length} ${t('gitStepsReady')} (${bcp47Lang})`}
              </p>
              <div className="chip-row">
                <span className="status-badge status-good">
                  <Waveform size={14} weight="regular" aria-hidden="true" />
                  <span className="mono-metric">
                    {voiceMeta.speaker} • {voiceMeta.language} • F0 {voiceMeta.fundamental_hz}Hz
                  </span>
                </span>
              </div>
            </div>

            <InteractiveFlowchartSvg
              graph={data.flowchart_graph}
              activeId={step?.node_id}
              doneIds={done}
              onSelect={(id) => {
                stop();
                playFrom(nodeIdx(id));
              }}
            />
          </section>

          {/* Voice Output & Audio Stream Verification Table */}
          <section className="card card-padded" aria-label={t('voiceTelemetryTitle')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SpeakerHigh size={18} weight="regular" aria-hidden="true" />
                <h2 className="card-title" style={{ margin: 0 }}>
                  {t('voiceTelemetryTitle')} ({data.repo_metadata.slug || data.repo_metadata.name})
                </h2>
              </div>
              <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                {voiceMeta.sample_rate_hz}Hz • 16-bit Mono PCM WAV • {bcp47Lang}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.narration.map((item, idx) => {
                const isSpeakingThis = activeStep === idx;
                return (
                  <div
                    key={item.step}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-control)',
                      border: isSpeakingThis ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                      background: isSpeakingThis ? 'var(--surface-raised)' : 'var(--canvas)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: '1 1 420px' }}>
                      <div className="mono-metric" style={{ fontWeight: 600, marginBottom: 4 }}>
                        {t('gitStepPrefix')} 0{item.step} • {item.title} ({item.node_id})
                      </div>
                      <p className="body-prose" style={{ margin: 0, fontSize: 14, color: 'var(--ink)' }}>
                        {item.text}
                      </p>
                      {(item.simple_explanation || item.real_world_example) && (
                        <div
                          style={{
                            marginTop: 8,
                            paddingTop: 8,
                            borderTop: '1px solid var(--hairline)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 4,
                            fontSize: 13,
                            color: 'var(--ink-muted)',
                          }}
                        >
                          {item.simple_explanation && (
                            <div>
                              <strong style={{ color: 'var(--accent)' }}>{t('simpleTermsTitle')}:</strong>{' '}
                              {item.simple_explanation}
                            </div>
                          )}
                          {item.real_world_example && (
                            <div>
                              <strong style={{ color: 'var(--success)' }}>{t('realWorldExampleTitle')}:</strong>{' '}
                              {item.real_world_example}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="mono-metric" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                        16kHz WAV • {bcp47Lang}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ minHeight: 34, padding: '0 12px' }}
                        onClick={() => {
                          stop();
                          playFrom(idx);
                        }}
                      >
                        <SpeakerHigh size={14} weight="regular" aria-hidden="true" />
                        <span>
                          {t('gitStepPrefix')} {item.step}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
