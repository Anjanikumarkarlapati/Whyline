import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Code,
  LinkSimple,
  Microphone,
  Plus,
  ShieldWarning,
  SpeakerHigh,
  Stop,
  Swap,
  Waveform,
  X,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
import { apiFetch as fetch } from '../api/mockApi';
import StatusBadge from '../components/StatusBadge';
import { CodeBlock, FormattedText } from '../components/CodeText';
import {
  rescoreSpokenTranscriptWithAst,
  resolveSafeSpeechLang,
} from '../utils/fenceLogic';

const AST_NODE_PRESETS = [
  {
    key: 'GatewayRouter.dispatchSettlement',
    label: 'GatewayRouter.dispatchSettlement() [Java • Lines 5–15]',
    file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
    class_name: 'GatewayRouter',
    method_name: 'dispatchSettlement',
    symbol_name: 'GatewayRouter.dispatchSettlement(String orderId, long amountPaise)',
    anomaly_type: 'MAGIC_LITERAL_CONTROL_FLOW',
    matched_token: 'retryCount = 5',
    start_line: 5,
    end_line: 15,
    expiry_key: 'healthconnect.payment.gateway.version',
    expiry_value: 'v2',
  },
  {
    key: 'DicomShaderPipeline.renderRadiologySlice',
    label: 'DicomShaderPipeline.renderRadiologySlice() [Java • Lines 4–11]',
    file_path: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
    class_name: 'DicomShaderPipeline',
    method_name: 'renderRadiologySlice',
    symbol_name: 'DicomShaderPipeline.renderRadiologySlice(byte[] rawVoxelBuffer, int sliceIndex)',
    anomaly_type: 'EXPLICIT_THREAD_HALT',
    matched_token: 'Thread.sleep(120)',
    start_line: 4,
    end_line: 11,
    expiry_key: 'healthconnect.imaging.adreno_driver_patch',
    expiry_value: 'v2.0',
  },
  {
    key: 'JwtClockSkewFilter.validateClinicToken',
    label: 'JwtClockSkewFilter.validateClinicToken() [Java • Lines 6–14]',
    file_path: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
    class_name: 'JwtClockSkewFilter',
    method_name: 'validateClinicToken',
    symbol_name: 'JwtClockSkewFilter.validateClinicToken(long tokenIssuedAtEpochSec, long serverNowEpochSec)',
    anomaly_type: 'MAGIC_LITERAL_CONTROL_FLOW',
    matched_token: 'clockSkewSeconds = 180',
    start_line: 6,
    end_line: 14,
    expiry_key: 'healthconnect.auth.ntp_enforced',
    expiry_value: 'true',
  },
  {
    key: 'PatientProfileService.mergeDuplicateAbha',
    label: 'PatientProfileService.mergeDuplicateAbha() [Java • Lines 22–34]',
    file_path: 'src/main/java/com/healthconnect/patient/PatientProfileService.java',
    class_name: 'PatientProfileService',
    method_name: 'mergeDuplicateAbha',
    symbol_name: 'PatientProfileService.mergeDuplicateAbha(String primaryId, String secondaryId)',
    anomaly_type: 'SWALLOWED_EXCEPTION',
    matched_token: 'catch (OptimisticLockException ignored)',
    start_line: 22,
    end_line: 34,
    expiry_key: 'healthconnect.patient.strict_abha_lock',
    expiry_value: 'true',
  },
  {
    key: 'prescription_parser.load_telugu_handwriting_weights',
    label: 'prescription_parser.load_telugu_handwriting_weights() [Python • Lines 5–11]',
    file_path: 'services/ocr/prescription_parser.py',
    class_name: 'Module',
    method_name: 'load_telugu_handwriting_weights',
    symbol_name: 'Module.load_telugu_handwriting_weights(model_uri: str)',
    anomaly_type: 'VALIDATION_BYPASS',
    matched_token: 'verify = False',
    start_line: 5,
    end_line: 11,
    expiry_key: 'healthconnect.ocr.nic_cert_installed',
    expiry_value: 'true',
  },
];

const SAMPLE_TRANSCRIPTS_BY_LANG = {
  en: 'Keep retryCount = 5 and timeoutMs = 4500 in GatewayRouter.java because Razorpay v1 edge drops every 4th SYN packet at midnight until gateway.version is upgraded to v2 in application.yml.',
  te: 'Avunu, correct! gateway router lo retry count = 5 alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.',
  hi: 'Haan bilkul sahi! gateway router mein retry count = 5 aur timeout ms = 4500 mat hatana jab tak application yml mein gateway dot version v2 na ho jaye.',
};

export default function SpokenFencesPage() {
  const { lang, t } = useI18n();
  const [searchParams] = useSearchParams();
  const [fences, setFences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gatewayVersion, setGatewayVersion] = useState('v1');
  const [junitSource, setJunitSource] = useState('');
  const [selectedId, setSelectedId] = useState('FENCE-001');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [voiceInput, setVoiceInput] = useState(
    () => SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en
  );
  const [rescoreLog, setRescoreLog] = useState([]);
  const [interceptOutput, setInterceptOutput] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Dedicated Audio Note Recorder & AST Node Linker state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [selectedAstPresetKey, setSelectedAstPresetKey] = useState(AST_NODE_PRESETS[0].key);
  const [customToken, setCustomToken] = useState(AST_NODE_PRESETS[0].matched_token);
  const [customStartLine, setCustomStartLine] = useState(AST_NODE_PRESETS[0].start_line);
  const [customEndLine, setCustomEndLine] = useState(AST_NODE_PRESETS[0].end_line);
  const [liveRescoredPreview, setLiveRescoredPreview] = useState(() =>
    rescoreSpokenTranscriptWithAst(SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en)
  );

  // Proposed diff for testing hunk-aware MCP interception
  const [proposedDiffInput, setProposedDiffInput] = useState(
    '@@ -5,6 +5,6 @@\n- int retryCount = 5;\n+ int retryCount = 1;'
  );

  const timerRef = useRef(null);
  const drawerCloseRef = useRef(null);

  const loadFences = async () => {
    try {
      const resp = await fetch('/api/fences');
      const data = await resp.json();
      const loaded = data.fences || [];
      setFences(loaded);
      setGatewayVersion(data.gateway_version || 'v1');
      setJunitSource(data.junit_invariant_source || '');
      const urlFenceId = searchParams.get('id');
      if (urlFenceId && loaded.some((f) => f.id.toUpperCase() === urlFenceId.toUpperCase())) {
        setSelectedId(urlFenceId.toUpperCase());
      } else if (!selectedId && loaded.length > 0) {
        setSelectedId(loaded[0].id);
      }
    } catch {
      setFences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFences();
  }, []);

  // Synchronize default sample voice note when active UI language changes
  useEffect(() => {
    const isDefaultSample = Object.values(SAMPLE_TRANSCRIPTS_BY_LANG).includes(voiceInput);
    if (isDefaultSample) {
      const nextSample = SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en;
      setVoiceInput(nextSample);
      setLiveRescoredPreview(rescoreSpokenTranscriptWithAst(nextSample));
    }
  }, [lang]);

  useEffect(() => {
    setLiveRescoredPreview(rescoreSpokenTranscriptWithAst(voiceInput));
  }, [voiceInput]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3800);
  };

  const handleSelectAstPreset = (presetKey) => {
    setSelectedAstPresetKey(presetKey);
    const preset = AST_NODE_PRESETS.find((p) => p.key === presetKey);
    if (preset) {
      setCustomToken(preset.matched_token);
      setCustomStartLine(preset.start_line);
      setCustomEndLine(preset.end_line);
    }
  };

  const handleToggleRecordAudio = () => {
    if (isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      const rescored = rescoreSpokenTranscriptWithAst(voiceInput);
      setVoiceInput(rescored.rescored_transcript);
      setRescoreLog(rescored.ast_replacements);
      showToast(
        `Transcribed ${recordSeconds || 4}s audio note (${toBcp47(lang)}) & rescored ${rescored.ast_replacements.length} AST symbols.`
      );
      return;
    }

    setIsRecording(true);
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev >= 10) {
          clearInterval(timerRef.current);
          setIsRecording(false);
          return 10;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleConfirmSelectedFence = async (targetFenceId) => {
    const idToConfirm = targetFenceId || selectedId || 'FENCE-001';
    const resp = await fetch(`/api/fences/${idToConfirm}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript_text: voiceInput,
        language: toBcp47(lang),
        author_handle: '@anjani',
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setRescoreLog(data.stt_telemetry?.ast_replacements || []);
      await loadFences();
      showToast(
        `Confirmed ${idToConfirm} via Gnani Prisma (${toBcp47(lang)}) and compiled JUnit/Pytest invariant!`
      );
    }
  };

  const handleCreateAndLinkNewAstFence = async (e) => {
    e.preventDefault();
    if (!voiceInput.trim()) {
      showToast('Please record or enter a spoken architectural note before linking.');
      return;
    }
    const preset =
      AST_NODE_PRESETS.find((p) => p.key === selectedAstPresetKey) || AST_NODE_PRESETS[0];

    const resp = await fetch('/api/fences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: preset.file_path,
        class_name: preset.class_name,
        method_name: preset.method_name,
        symbol_name: preset.symbol_name,
        anomaly_type: preset.anomaly_type,
        matched_token: customToken || preset.matched_token,
        start_line: Number(customStartLine) || preset.start_line,
        end_line: Number(customEndLine) || preset.end_line,
        expiry_key: preset.expiry_key,
        expiry_value: preset.expiry_value,
        transcript_text: voiceInput,
        language: toBcp47(lang),
        author_handle: '@anjani',
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      setRescoreLog(data.stt_telemetry?.ast_replacements || []);
      await loadFences();
      if (data.fence?.id) {
        setSelectedId(data.fence.id);
      }
      showToast(
        `Created & linked ${data.fence?.id} to AST node ${preset.symbol_name} (Lines ${customStartLine}–${customEndLine})!`
      );
    }
  };

  const handlePlayTimbreAudio = (fenceObj) => {
    const target = fenceObj || selectedFence;
    if (!target) return;
    if (target.audio_url) {
      const audio = new Audio(target.audio_url);
      audio.play().catch(() => {});
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const textToSpeak = target.transcript || target.reconstructed_why;
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.lang = resolveSafeSpeechLang(textToSpeak, lang);
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore
      }
    }
  };

  const handleSimulateIntercept = async (fenceObj) => {
    const target = fenceObj || selectedFence || fences[0];
    if (!target) return;
    const resp = await fetch('/api/fences/intercept-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: target.file_path,
        proposed_diff: proposedDiffInput,
        agent_name: 'Claude Code / Cursor Agent',
        declared_assumptions: [
          `Assumes ${target.matched_token} is redundant legacy boilerplate`,
        ],
      }),
    });
    const data = await resp.json();
    setInterceptOutput(data);
    showToast(`whyline-mcp Verdict: ${data.decision} on ${target.id}`);
  };

  const handleToggleGatewayVersion = async () => {
    const nextVer = gatewayVersion === 'v1' ? 'v2' : 'v1';
    const resp = await fetch('/api/config/gateway-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: nextVer }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setGatewayVersion(data.gateway_version);
      await loadFences();
      showToast(
        `Updated config/application.yml gateway.version to ${data.gateway_version}. FENCE-001 status updated.`
      );
    }
  };

  const filteredFences = fences.filter((f) => {
    if (statusFilter === 'ALL') return true;
    return f.status === statusFilter;
  });

  const selectedFence =
    fences.find((f) => f.id === selectedId) || filteredFences[0] || fences[0] || null;

  return (
    <div className="page-stack">
      {/* Page Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">{t('fencesContext')}</p>
          <h1 className="page-title">{t('fencesTitle')}</h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: '6px' }}>
            {t('fencesSubtitle')}
          </p>
        </div>
        <div className="chip-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleToggleGatewayVersion}
          >
            <Swap size={16} weight="regular" aria-hidden="true" />
            <span>
              {gatewayVersion === 'v1' ? t('btnToggleGatewayV2') : t('btnRestoreGatewayV1')}
            </span>
          </button>
        </div>
      </section>

      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={18} weight="fill" style={{ color: 'var(--success)' }} />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minHeight: '32px', padding: '0 8px' }}
            onClick={() => setToastMessage('')}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Dedicated Spoken Fence Audio Studio & AST Node Linker Section */}
      <section
        className="card"
        aria-label="Spoken Fence Voice Recorder and AST Node Linker"
      >
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Waveform size={20} weight="regular" aria-hidden="true" />
            <div>
              <h2 className="card-title">{t('detailHeader')}</h2>
              <p className="form-helper">
                Record 10s voice postmortems, auto-rescore spoken code terms, and anchor directly to Tree-sitter AST nodes
              </p>
            </div>
          </div>
          <div className="chip-row">
            <span className="status-badge status-good">
              <Microphone size={14} weight="regular" aria-hidden="true" />
              <span className="mono-metric">
                Gnani Prisma v2.5 • {toBcp47(lang)}
              </span>
            </span>
          </div>
        </div>

        <div className="card-body">
          <div className="two-col-grid">
            {/* Left Column: Audio Recorder & Multilingual Transcription */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <label className="form-label" htmlFor="spoken-fence-voice-textarea">
                  {t('labelVoicePrompt')}
                </label>
                <div className="chip-row">
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => setVoiceInput(SAMPLE_TRANSCRIPTS_BY_LANG.te)}
                  >
                    {t('btnSampleTelugu')}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => setVoiceInput(SAMPLE_TRANSCRIPTS_BY_LANG.hi)}
                  >
                    {t('btnSampleHindi')}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => setVoiceInput(SAMPLE_TRANSCRIPTS_BY_LANG.en)}
                  >
                    {t('btnSampleEnglish')}
                  </button>
                </div>
              </div>

              <textarea
                id="spoken-fence-voice-textarea"
                className="form-textarea"
                rows={3}
                value={voiceInput}
                placeholder={t('placeholderVoiceText')}
                onChange={(e) => setVoiceInput(e.target.value)}
              />

              {/* Live Audio Recorder Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={handleToggleRecordAudio}
                >
                  {isRecording ? (
                    <>
                      <Stop size={16} weight="fill" aria-hidden="true" />
                      <span>
                        {t('btnStopRecording')} ({recordSeconds}s / 10s)
                      </span>
                    </>
                  ) : (
                    <>
                      <Microphone size={16} weight="regular" aria-hidden="true" />
                      <span>{t('btnRecordAudio')}</span>
                    </>
                  )}
                </button>

                {selectedFence && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleConfirmSelectedFence(selectedFence.id)}
                  >
                    <CheckCircle size={16} weight="regular" aria-hidden="true" />
                    <span>
                      {t('btnConfirmVoice')} ({selectedFence.id})
                    </span>
                  </button>
                )}
              </div>

              {/* Live AST Vocabulary Rescorer Preview */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: 'var(--canvas)',
                  border: '1px solid var(--hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div className="small-caps">{t('labelRescoredTokens')}</div>
                <p className="form-helper" style={{ color: 'var(--ink)' }}>
                  <FormattedText text={liveRescoredPreview.rescored_transcript} />
                </p>
                {(rescoreLog.length > 0 || liveRescoredPreview.ast_replacements.length > 0) && (
                  <div className="chip-row">
                    {(rescoreLog.length > 0
                      ? rescoreLog
                      : liveRescoredPreview.ast_replacements
                    ).map((item, idx) => (
                      <span key={idx} className="mono-metric filter-chip">
                        "{item.spoken}" → {item.ast_symbol}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Link Audio Note to Specific AST Node */}
            <form
              onSubmit={handleCreateAndLinkNewAstFence}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-control)',
                backgroundColor: 'var(--canvas)',
                border: '1px solid var(--hairline-strong)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkSimple size={18} weight="regular" aria-hidden="true" />
                <h3 className="card-title" style={{ margin: 0 }}>
                  Link Spoken Note to Specific AST Node
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ast-node-select">
                  Target Codebase AST Node (Class &amp; Method Signature)
                </label>
                <select
                  id="ast-node-select"
                  className="form-select mono-metric"
                  value={selectedAstPresetKey}
                  onChange={(e) => handleSelectAstPreset(e.target.value)}
                >
                  {AST_NODE_PRESETS.map((node) => (
                    <option key={node.key} value={node.key}>
                      {node.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-col-grid" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ast-token-input">
                    Guarded AST Token / Expression
                  </label>
                  <input
                    id="ast-token-input"
                    type="text"
                    className="form-input mono-metric"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ast-start-line">
                      Start Line
                    </label>
                    <input
                      id="ast-start-line"
                      type="number"
                      min={1}
                      className="form-input mono-metric"
                      value={customStartLine}
                      onChange={(e) => setCustomStartLine(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ast-end-line">
                      End Line
                    </label>
                    <input
                      id="ast-end-line"
                      type="number"
                      min={1}
                      className="form-input mono-metric"
                      value={customEndLine}
                      onChange={(e) => setCustomEndLine(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" className="btn btn-secondary">
                  <Plus size={16} weight="regular" aria-hidden="true" />
                  <span>{t('btnCreateNewFence')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Filter Bar (Fully Localized) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div className="chip-row" role="group" aria-label="Filter spoken fences by status">
          {[
            { id: 'ALL', label: `${t('filterAll')} (${fences.length})` },
            { id: 'VERIFIED_ACTIVE', label: t('filterVerified') },
            { id: 'PENDING_CONFIRMATION', label: t('filterPending') },
            { id: 'UNVERIFIED_HISTORICAL', label: t('filterHistorical') },
            { id: 'EXPIRED_SAFE_TO_REMOVE', label: t('filterExpired') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-chip ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
          application.yml: gateway.version = {gatewayVersion}
        </span>
      </div>

      {/* Main Split: Fences Ledger Table + Selected Fence Inspector */}
      <section className="operational-split">
        <article className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('colFenceId')}</th>
                  <th>{t('colSymbol')}</th>
                  <th>{t('colAnomalyType')}</th>
                  <th>{t('colProvenance')}</th>
                  <th>{t('colStatus')}</th>
                  <th className="num-col">{t('colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="skeleton-line" />
                    </td>
                  </tr>
                ) : (
                  filteredFences.map((fence) => {
                    const isSelected = selectedFence?.id === fence.id;
                    return (
                      <tr
                        key={fence.id}
                        onClick={() => setSelectedId(fence.id)}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'var(--accent-wash)' : undefined,
                        }}
                      >
                        <td className="mono-metric" style={{ fontWeight: 600 }}>
                          {fence.id}
                        </td>
                        <td>
                          <div className="mono-metric" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                            {fence.symbol_name}
                          </div>
                          <div className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                            {fence.file_path} (L{fence.start_line}–L{fence.end_line})
                          </div>
                        </td>
                        <td>
                          <span className="mono-metric" style={{ fontSize: '12px' }}>
                            {fence.anomaly_type}
                          </span>
                          <div className="mono-metric" style={{ fontSize: '12px', color: 'var(--warning)' }}>
                            {fence.matched_token}
                          </div>
                        </td>
                        <td className="mono-metric" style={{ fontSize: '12px' }}>
                          {fence.provenance?.pr_number} • {fence.provenance?.incident_id}
                          <div style={{ color: 'var(--ink-muted)' }}>{fence.author_handle}</div>
                        </td>
                        <td>
                          <StatusBadge status={fence.status} />
                        </td>
                        <td className="num-col">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ minHeight: '34px', padding: '0 12px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(fence.id);
                            }}
                          >
                            {t('btnInspect')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </article>

        {/* Right Column: Selected AST Fence Detail & Pre-Commit Simulator */}
        {selectedFence && (
          <aside className="card" aria-label="Selected Spoken Fence Details">
            <div className="card-header">
              <div>
                <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                  {selectedFence.id} • AST Hash {selectedFence.ast_signature_hash}
                </span>
                <h2 className="card-title" style={{ marginTop: '4px' }}>
                  {selectedFence.symbol_name}
                </h2>
              </div>
              <StatusBadge status={selectedFence.status} />
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div className="small-caps">{t('labelReconstructedWhy')}</div>
                <p className="body-prose" style={{ marginTop: '4px' }}>
                  <FormattedText text={selectedFence.reconstructed_why} />
                </p>
              </div>

              <div>
                <div className="small-caps">{t('labelDangerCondition')}</div>
                <p className="form-helper" style={{ color: 'var(--danger)', marginTop: '4px' }}>
                  <FormattedText text={selectedFence.danger_condition} />
                </p>
              </div>

              <div>
                <div className="small-caps">{t('labelExpiryRule')}</div>
                <p className="mono-metric" style={{ marginTop: '4px' }}>
                  {selectedFence.expiry_condition?.description}
                </p>
              </div>

              <CodeBlock
                label={`${selectedFence.file_path} (Lines ${selectedFence.start_line}–${selectedFence.end_line})`}
                code={selectedFence.code_snippet}
              />

              {/* Audio Note Playback &MCP Hunk Simulator */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handlePlayTimbreAudio(selectedFence)}
                >
                  <SpeakerHigh size={16} weight="regular" aria-hidden="true" />
                  <span>{t('btnPlayTimbre')}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleSimulateIntercept(selectedFence)}
                >
                  <ShieldWarning size={16} weight="regular" aria-hidden="true" />
                  <span>{t('btnSimulateIntercept')}</span>
                </button>
              </div>

              {interceptOutput && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: 'var(--radius-control)',
                    backgroundColor: 'var(--canvas)',
                    border: '1px solid var(--hairline-strong)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono-metric" style={{ fontWeight: 600 }}>
                      MCP Pre-Commit Verdict
                    </span>
                    <StatusBadge status={interceptOutput.decision} />
                  </div>
                  <p className="form-helper" style={{ color: 'var(--ink)' }}>
                    <FormattedText text={interceptOutput.explanation} />
                  </p>
                </div>
              )}
            </div>
          </aside>
        )}
      </section>

      {/* Compiled JUnit 5 & Pytest CI Invariant Artifact Preview */}
      {junitSource && (
        <article className="card">
          <div className="card-header">
            <h2 className="card-title">{t('labelJunitTest')}</h2>
            <span className="mono-metric">
              src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java
            </span>
          </div>
          <div className="card-body">
            <CodeBlock label="JUnit 5 Invariant Test Suite" code={junitSource} />
          </div>
        </article>
      )}
    </div>
  );
}
