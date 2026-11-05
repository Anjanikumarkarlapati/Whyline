import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import InteractiveFlowchartSvg from '../components/InteractiveFlowchartSvg';

const LANGS = [
  ['en-IN', 'English'],
  ['hi-IN', 'हिंदी'],
  ['te-IN', 'తెలుగు'],
];

export default function GitFlowchartPage() {
  const { lang: globalLang, setLang: setGlobalLang, t } = useI18n();
  const [target, setTarget] = useState('.');
  const [lang, setLang] = useState(
    globalLang === 'hi' ? 'hi-IN' : globalLang === 'te' ? 'te-IN' : 'en-IN'
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(null);
  const [done, setDone] = useState([]);
  const audioRef = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => {
    const mapped = globalLang === 'hi' ? 'hi-IN' : globalLang === 'te' ? 'te-IN' : 'en-IN';
    setLang(mapped);
  }, [globalLang]);

  const handleLanguageChange = (newLangCode) => {
    setLang(newLangCode);
    const shortCode = newLangCode.startsWith('hi') ? 'hi' : newLangCode.startsWith('te') ? 'te' : 'en';
    setGlobalLang(shortCode);
  };

  const scan = async () => {
    stopRef.current = true;
    audioRef.current?.pause();
    setLoading(true);
    setError('');
    setData(null);
    setActiveStep(null);
    setDone([]);
    try {
      const r = await fetch('/api/git/scan-narrated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_path_or_url: target, language: lang }),
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

  const playFrom = async (idx) => {
    stopRef.current = false;
    const steps = data?.narration || [];
    const load = (i) => {
      const a = new Audio(steps[i]?.audio_url);
      a.preload = 'auto';
      return a;
    };
    let next = idx < steps.length ? load(idx) : null;
    for (let i = idx; i < steps.length && !stopRef.current; i += 1) {
      setActiveStep(i);
      const audio = next;
      next = i + 1 < steps.length ? load(i + 1) : null;
      audioRef.current = audio;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => {
        if (!audio) {
          res();
          return;
        }
        audio.onended = res;
        audio.onerror = res;
        audio.play().catch(res);
      });
      if (steps[i]?.node_id) {
        setDone((d) => [...d, steps[i].node_id]);
      }
    }
    if (!stopRef.current) setActiveStep(null);
  };

  const stop = () => {
    stopRef.current = true;
    audioRef.current?.pause();
    setActiveStep(null);
  };

  const step = activeStep != null && data?.narration ? data.narration[activeStep] : null;
  const nodeIdx = (id) => data?.narration?.findIndex((s) => s.node_id === id) ?? -1;

  return (
    <div className="page-stack">
      <section className="context-header">
        <div>
          <p className="context-meta">{t('gitFlowchartContext')}</p>
          <h1 className="page-title">{t('gitFlowchartTitle')}</h1>
        </div>
      </section>

      <section className="card card-padded" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input
          className="form-input git-scan-input"
          aria-label="Repository path or URL"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <select
          className="form-input"
          aria-label="Voice language"
          value={lang}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {LANGS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={scan} disabled={loading}>
          {loading ? t('btnScanning') : t('btnScanExplain')}
        </button>
        {data && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => playFrom(0)}>{t('btnPlayWalkthrough')}</button>
            <button type="button" className="btn btn-secondary" onClick={stop}>{t('btnStop')}</button>
          </>
        )}
      </section>

      {error && <div role="alert" className="card card-padded git-error">Error: {error}</div>}

      {data && (
        <section className="card card-padded">
          <p className="form-helper" aria-live="polite">
            {step ? `Step ${step.step}/${data.narration?.length || 0}: ${step.text}` : `${data?.repo_metadata?.name || 'Repository'} — ${data.narration?.length || 0} steps ready`}
          </p>
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
      )}
    </div>
  );
}
