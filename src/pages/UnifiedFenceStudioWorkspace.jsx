import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowsClockwise,
  CheckCircle,
  Code,
  FileCode,
  GitBranch,
  Lightbulb,
  Microphone,
  Plus,
  ShieldCheck,
  ShieldWarning,
  Sparkle,
  SpeakerHigh,
  Stop,
  Swap,
  WarningOctagon,
  X,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
import { apiFetch as fetch } from '../api/mockApi';
import { defineMonacoThemes } from '../monacoTheme';
import StatusBadge from '../components/StatusBadge';
import { CodeBlock, FormattedText } from '../components/CodeText';
import InteractiveAudioWaveform from '../components/InteractiveAudioWaveform';
import {
  rescoreSpokenTranscriptWithAst,
  resolveSafeSpeechLang,
} from '../utils/fenceLogic';
import { buildReasonedCodebaseExplanation } from '../utils/codebaseReasoning';
import {
  applyGnaniPrismaItn,
  detectIndicLanguageAuto,
  FENCE_SOURCE_FILES,
  getFenceSourceConfig,
} from '../utils/fenceSourceCatalog';

const INITIAL_FENCES_SEED = Object.values(FENCE_SOURCE_FILES).map((cfg, idx) => ({
  id: cfg.fenceId,
  symbol_name: `${cfg.filePath.split('/').pop().replace(/\.(java|py)$/, '')} (${cfg.matchedToken})`,
  file_path: cfg.filePath,
  anomaly_type: 'AST_GUARDRAIL',
  matched_token: cfg.matchedToken,
  start_line: cfg.startLine,
  end_line: cfg.endLine,
  status: idx < 6 ? 'VERIFIED_ACTIVE' : idx === 6 ? 'PENDING_CONFIRMATION' : 'UNVERIFIED_HISTORICAL',
  pr_number: cfg.prNumber,
  incident_id: cfg.incidentId,
  danger_if_removed: `Removing ${cfg.matchedToken} triggers production regression (${cfg.incidentId}).`,
  audio_url: `/api/audio/${cfg.fenceId.toLowerCase()}.wav`,
}));

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
];

const SAMPLE_TRANSCRIPTS_BY_LANG = {
  en: 'Keep retryCount = five and timeoutMs = 4500 in GatewayRouter.java because Razorpay v1 edge drops every 4th SYN packet at midnight until gateway.version is upgraded to version two in application.yml.',
  te: 'Avunu, correct! gateway router lo retry count ఐదు alage unchandi, endukante v1 midnight packet drop avtundi until application yml lo gateway dot version v2 ki marustaru.',
  hi: 'Haan bilkul sahi! gateway router mein retry count पाँच aur timeout ms = 4500 mat hatana jab tak application yml mein gateway dot version v2 na ho jaye.',
};

export default function UnifiedFenceStudioWorkspace({
  theme = 'light',
  initialSubTab = 'code',
}) {
  const { lang, t } = useI18n();
  const [searchParams] = useSearchParams();
  const bcp47 = toBcp47(lang);

  // Sub-Tab State: 'code' | 'voice' | 'incidents'
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);

  // Fence & Briefing State (Pre-seeded at 0ms so 10 fences render immediately)
  const [fences, setFences] = useState(INITIAL_FENCES_SEED);
  const [kpis, setKpis] = useState({
    total_fences: 10,
    verified_active: 6,
    pending_confirmations: 1,
    unverified_historical: 3,
    expired_safe_to_remove: 0,
    intercepted_agent_breaks: 10,
  });
  const [gatewayVersion, setGatewayVersion] = useState('v1');
  const [junitSource, setJunitSource] = useState('');
  const [selectedId, setSelectedId] = useState('FENCE-001');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Collapsible Modals/Drawers (so forms never clutter the page!)
  const [showNewFenceModal, setShowNewFenceModal] = useState(false);
  const [showIncidentFormModal, setShowIncidentFormModal] = useState(false);

  // Voice Recorder & Gnani Prisma v3.0 ITN State
  const [voiceInput, setVoiceInput] = useState(
    () => SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [itnMeta, setItnMeta] = useState(() => {
    const itn = applyGnaniPrismaItn(SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en);
    return {
      detectedLang: detectIndicLanguageAuto(SAMPLE_TRANSCRIPTS_BY_LANG[lang] || '', bcp47),
      itnConversions: itn.itnConversions,
      rescored: rescoreSpokenTranscriptWithAst(itn.normalizedTranscript),
    };
  });

  // New Fence Form State
  const [selectedAstPresetKey, setSelectedAstPresetKey] = useState(AST_NODE_PRESETS[0].key);
  const [customToken, setCustomToken] = useState(AST_NODE_PRESETS[0].matched_token);
  const [customStartLine, setCustomStartLine] = useState(AST_NODE_PRESETS[0].start_line);
  const [customEndLine, setCustomEndLine] = useState(AST_NODE_PRESETS[0].end_line);

  // Pre-Commit Diff Simulator State
  const [proposedDiffInput, setProposedDiffInput] = useState(
    getFenceSourceConfig('FENCE-001').naiveDiff
  );
  const [interceptOutput, setInterceptOutput] = useState(null);

  // Incidents & Checkpoints State
  const [incidents, setIncidents] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [assumptions, setAssumptions] = useState([]);
  const [incidentIdInput, setIncidentIdInput] = useState('INC-10204');
  const [serviceNameInput, setServiceNameInput] = useState('HealthConnect Payment Gateway v1');
  const [voicePostmortemInput, setVoicePostmortemInput] = useState(() => t('defaultIncidentPostmortem'));

  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3800);
  };

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const loadAllStudioData = async () => {
    setLoading(true);
    try {
      const [briefingResp, fencesResp, incResp] = await Promise.all([
        fetch('/api/briefing'),
        fetch('/api/fences'),
        fetch('/api/incidents'),
      ]);
      const briefingData = await briefingResp.json();
      const fencesData = await fencesResp.json();
      const incData = await incResp.json();

      if (briefingData?.kpis) setKpis(briefingData.kpis);
      const loadedFences = fencesData?.fences || briefingData?.fences || [];
      setFences(loadedFences);
      setGatewayVersion(fencesData?.gateway_version || briefingData?.gateway_version || 'v1');
      setJunitSource(fencesData?.junit_invariant_source || '');
      setIncidents(incData?.incidents || []);
      setCheckpoints(incData?.checkpoints || []);
      setAssumptions(incData?.assumptions || []);

      const urlFenceId = searchParams.get('id');
      if (urlFenceId && loadedFences.some((f) => f.id.toUpperCase() === urlFenceId.toUpperCase())) {
        setSelectedId(urlFenceId.toUpperCase());
      }
    } catch {
      // Keep default state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStudioData();
  }, [searchParams]);

  // Update sample transcript & ITN when language switches
  useEffect(() => {
    const sample = SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en;
    setVoiceInput(sample);
    const itn = applyGnaniPrismaItn(sample);
    setItnMeta({
      detectedLang: detectIndicLanguageAuto(sample, toBcp47(lang)),
      itnConversions: itn.itnConversions,
      rescored: rescoreSpokenTranscriptWithAst(itn.normalizedTranscript),
    });
    setVoicePostmortemInput(t('defaultIncidentPostmortem'));
  }, [lang]);

  // Update diff simulator & Monaco highlight when selected fence changes
  const sourceConfig = getFenceSourceConfig(selectedId);
  useEffect(() => {
    setProposedDiffInput(sourceConfig.naiveDiff);
    setInterceptOutput(null);
    if (editorRef.current && monacoRef.current) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      editor.createDecorationsCollection([
        {
          range: new monaco.Range(sourceConfig.startLine, 1, sourceConfig.endLine, 1),
          options: {
            isWholeLine: true,
            glyphMarginClassName: 'whyline-gutter-pin-verified',
            linesDecorationsClassName: 'whyline-gutter-pin-line',
            inlineClassName: 'whyline-inline-fence-highlight',
          },
        },
      ]);
    }
  }, [selectedId]);

  const handleVoiceInputChange = (val) => {
    setVoiceInput(val);
    const itn = applyGnaniPrismaItn(val);
    setItnMeta({
      detectedLang: detectIndicLanguageAuto(val, bcp47),
      itnConversions: itn.itnConversions,
      rescored: rescoreSpokenTranscriptWithAst(itn.normalizedTranscript),
    });
  };

  const [isPlayingFenceAudio, setIsPlayingFenceAudio] = useState(false);

  const finishStudioRecordingNow = () => {
    setIsRecording(false);
    const sample = SAMPLE_TRANSCRIPTS_BY_LANG[lang] || SAMPLE_TRANSCRIPTS_BY_LANG.en;
    handleVoiceInputChange(sample);
    showToast('Gnani Prisma v3.0 (indic-auto + ITN) transcribed & rescored AST tokens.');
  };

  // Simulated 10s Audio Recording with Gnani Prisma v3.0 ITN
  useEffect(() => {
    if (!isRecording) {
      setRecordSeconds(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev >= 10) {
          finishStudioRecordingNow();
          return 10;
        }
        return prev + 1;
      });
    }, 450);
    return () => clearInterval(timer);
  }, [isRecording, lang]);

  const stopFenceAudio = () => {
    setIsPlayingFenceAudio(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  };

  const speakFenceExplanation = (textToSpeak, audioUrl) => {
    setIsPlayingFenceAudio(true);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && textToSpeak) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.lang = resolveSafeSpeechLang(textToSpeak, bcp47);
        utter.rate = 0.98;
        utter.onend = () => setIsPlayingFenceAudio(false);
        utter.onerror = () => setIsPlayingFenceAudio(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsPlayingFenceAudio(false);
      }
    }
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingFenceAudio(false);
      audio.onerror = () => setIsPlayingFenceAudio(false);
      audio.play().catch(() => setIsPlayingFenceAudio(false));
    }
  };

  const handleConfirmVoiceFence = async (fenceIdToConfirm = selectedId) => {
    const resp = await fetch(`/api/fences/${fenceIdToConfirm}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_transcript: itnMeta.rescored.rescored || voiceInput,
        language: bcp47,
        author_handle: '@anjani',
      }),
    });
    const res = await resp.json();
    await loadAllStudioData();
    if (res?.fence?.audio_url) {
      const audio = new Audio(res.fence.audio_url);
      audio.play().catch(() => {});
    }
    showToast(`Confirmed ${fenceIdToConfirm} via 10s voice note and compiled JUnit/Pytest invariant.`);
  };

  const handleSimulatePreCommitIntercept = async () => {
    const resp = await fetch('/api/fences/intercept-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_path: sourceConfig.filePath,
        proposed_diff: proposedDiffInput,
        agent_name: 'Claude Code / Cursor Agent',
        declared_assumptions: [`Assumes ${sourceConfig.matchedToken} is redundant boilerplate`],
      }),
    });
    const res = await resp.json();
    setInterceptOutput(res.fence_check || res);
    await loadAllStudioData();
    if (res?.fence_check?.spoken_warning_url) {
      const audio = new Audio(res.fence_check.spoken_warning_url);
      audio.play().catch(() => {});
    }
    showToast(`whyline-mcp returned ${res?.fence_check?.decision || 'REJECT_EDIT'} for ${selectedId}.`);
  };

  const handleToggleGatewayVersion = async () => {
    const nextVersion = gatewayVersion === 'v2' ? 'v1' : 'v2';
    const resp = await fetch('/api/config/gateway-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: nextVersion }),
    });
    const res = await resp.json();
    await loadAllStudioData();
    showToast(`Set gateway.version to "${res.gateway_version}" in application.yml.`);
  };

  const handleCreateNewSpokenFence = async (e) => {
    e.preventDefault();
    const preset = AST_NODE_PRESETS.find((p) => p.key === selectedAstPresetKey) || AST_NODE_PRESETS[0];
    const resp = await fetch('/api/fences/create', {
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
        voice_transcript: itnMeta.rescored.rescored || voiceInput,
        language: bcp47,
        author_handle: '@anjani',
        expiry_key: preset.expiry_key,
        expiry_value: preset.expiry_value,
      }),
    });
    const res = await resp.json();
    await loadAllStudioData();
    if (res?.fence?.id) {
      setSelectedId(res.fence.id);
    }
    setShowNewFenceModal(false);
    showToast(`Created and linked new Spoken Fence (${res?.fence?.id || 'FENCE-NEW'}).`);
  };

  const handleLogIncidentWebhook = async (e) => {
    e.preventDefault();
    await fetch('/api/incidents/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentIdInput,
        source: 'PagerDuty Webhook',
        service: serviceNameInput,
        title: 'Midnight Settlement SYN Packet Drop',
        oncall_engineer: '@anjani',
        language: bcp47,
        voice_postmortem: voicePostmortemInput,
        linked_fence_id: selectedId,
      }),
    });
    await loadAllStudioData();
    setShowIncidentFormModal(false);
    showToast(`Logged incident ${incidentIdInput} and linked to ${selectedId}.`);
  };

  const filteredFences = fences.filter((f) => {
    if (statusFilter === 'ALL') return true;
    return f.status === statusFilter;
  });

  const selectedFence =
    fences.find((f) => f.id.toUpperCase() === selectedId.toUpperCase()) ||
    fences[0] || {
      id: 'FENCE-001',
      symbol_name: 'GatewayRouter.dispatchSettlement(String orderId, long amountPaise)',
      file_path: sourceConfig.filePath,
      anomaly_type: 'MAGIC_LITERAL_CONTROL_FLOW',
      matched_token: sourceConfig.matchedToken,
      start_line: sourceConfig.startLine,
      end_line: sourceConfig.endLine,
      status: 'VERIFIED_ACTIVE',
      pr_number: '#212',
      incident_id: 'INC-9921',
      reconstructed_why:
        'Razorpay-Legacy v1 edge drops ~14% of SYN packets during the 00:00–00:15 IST settlement batch window.',
      danger_if_removed:
        'Removing retryCount = 5 causes immediate 14% payment settlement failure at midnight.',
      expiry_condition: {
        config_file: 'config/application.yml',
        key: 'healthconnect.payment.gateway.version',
        equals: 'v2',
      },
      audio_url: '/api/audio/fence-001.wav',
    };

  const reasonedFenceExplanation = buildReasonedCodebaseExplanation({
    question: `${selectedFence.symbol_name} ${selectedFence.matched_token}`,
    fenceId: selectedFence.id,
    language: bcp47,
  });

  const editorThemeName = theme === 'dark' ? 'whyline-cream-dark' : 'whyline-cream-light';

  const studioLabels = {
    en: {
      kicker: 'Workspace 02 • Unified Guardrail Briefing, 10-File Code Studio, Voice Recorder & Outage Ledger',
      title: 'Spoken Fence & Live Code Studio',
      subtitle:
        'Select any of the 10 AST anomalies on the left to inspect its real source code in Monaco Editor, record a 10-second voice note, simulate pre-commit AI edit blocks, or review past outages.',
      subTabCode: '1. Live Code Editor & AI Block Test',
      subTabVoice: '2. 10s Voice Recorder & Unit Test',
      subTabIncidents: '3. Outage History & Security Audit',
      btnNewFence: 'Record New Spoken Fence',
      btnLogIncident: 'Log Incident Postmortem',
    },
    te: {
      kicker: 'వర్క్‌స్పేస్ 02 • కోడ్ గార్డ్ బ్రీఫింగ్, 10-ఫైల్ కోడ్ స్టూడియో, వాయిస్ రికార్డర్ & ఇన్సిడెంట్ లెడ్జర్',
      title: 'స్పోకెన్ ఫెన్స్ & లైవ్ కోడ్ స్టూడియో',
      subtitle:
        'ఎడమవైపు ఉన్న 10 కోడ్ ఫెన్స్‌లలో ఏదైనా ఎంచుకుని దాని అసలు కోడ్‌ను చూడండి, 10-సెకన్ల వాయిస్ నోట్ రికార్డ్ చేయండి, AI ఎడిట్ బ్లాక్ పరీక్షించండి మరియు పాత ఇన్సిడెంట్ వివరాలు చూడండి.',
      subTabCode: '1. లైవ్ కోడ్ ఎడిటర్ & AI బ్లాక్ పరీక్ష',
      subTabVoice: '2. 10s వాయిస్ రికార్డర్ & యూనిట్ టెస్ట్',
      subTabIncidents: '3. ఇన్సిడెంట్ హిస్టరీ & సెక్యూరిటీ ఆడిట్',
      btnNewFence: 'కొత్త స్పోకెన్ ఫెన్స్ రికార్డ్ చేయండి',
      btnLogIncident: 'కొత్త ఇన్సిడెంట్ నమోదు చేయండి',
    },
    hi: {
      kicker: 'वर्कस्पेस 02 • एकीकृत गार्डरेल ब्रीफ़िंग, 10-फ़ाइल कोड स्टूडियो, वॉइस रिकॉर्डर और इंसिडेंट लेजर',
      title: 'स्पोकन फ़ेंस और लाइव कोड स्टूडियो',
      subtitle:
        'बाईं ओर दिए गए सभी 10 AST फ़ेंस में से किसी को भी चुनें—उसका असली सोर्स कोड देखें, 10-सेकंड का वॉइस नोट रिकॉर्ड करें, AI एडिट ब्लॉक टेस्ट करें और पुराने इंसिडेंट देखें।',
      subTabCode: '1. लाइव कोड एडिटर और AI ब्लॉक टेस्ट',
      subTabVoice: '2. 10s वॉइस रिकॉर्डर और यूनिट टेस्ट',
      subTabIncidents: '3. आउटेज इतिहास और सुरक्षा ऑडिट',
      btnNewFence: 'नया स्पोकन फ़ेंस रिकॉर्ड करें',
      btnLogIncident: 'नया इंसिडेंट दर्ज करें',
    },
  }[lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en'];

  return (
    <div className="page-stack">
      {/* Header + Top Action Buttons */}
      <section className="context-header">
        <div>
          <p className="context-meta">
            {studioLabels.kicker} • gateway.version = {gatewayVersion}
          </p>
          <h1 className="page-title">{studioLabels.title}</h1>
          <p className="body-prose" style={{ color: 'var(--ink-muted)', marginTop: '6px' }}>
            {studioLabels.subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setActiveSubTab('incidents');
              setShowIncidentFormModal((prev) => !prev);
            }}
          >
            <Plus size={16} weight="bold" />
            <span>{studioLabels.btnLogIncident}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowNewFenceModal((prev) => !prev)}
          >
            {showNewFenceModal ? <X size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
            <span>{studioLabels.btnNewFence}</span>
          </button>
        </div>
      </section>

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="toast-banner"
        >
          <span>{toastMessage}</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setToastMessage('')}
            style={{ minHeight: '28px', padding: '2px 8px' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Executive KPI Strip (Interactive 3D Embossed Filter & Action Buttons) */}
      <section
        aria-label="Repository guard metrics"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
        }}
      >
        <button
          type="button"
          className={`kpi-interactive-btn ${statusFilter === 'VERIFIED_ACTIVE' ? 'is-active' : ''}`}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'VERIFIED_ACTIVE' ? 'ALL' : 'VERIFIED_ACTIVE'));
            showToast('Filtered AST Spoken Fences to Verified Active.');
          }}
        >
          <span className="small-caps">{t('kpiActiveFences')}</span>
          <span className="mono-metric" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {kpis.verified_active} / {kpis.total_fences}
          </span>
          <span className="form-helper">{t('statVerifiedHelper')} · Click to filter</span>
        </button>

        <button
          type="button"
          className={`kpi-interactive-btn ${statusFilter === 'PENDING_CONFIRMATION' ? 'is-active' : ''}`}
          onClick={() => {
            setStatusFilter((prev) => (prev === 'PENDING_CONFIRMATION' ? 'ALL' : 'PENDING_CONFIRMATION'));
            setActiveSubTab('voice');
            showToast('Showing Pending Confirmations & opened 10s Voice Recorder.');
          }}
        >
          <span className="small-caps">{t('kpiPendingConfirm')}</span>
          <span className="mono-metric" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {(kpis.pending_confirmations || 0) + (kpis.unverified_historical || 0)}
          </span>
          <span className="form-helper">{t('statNeedsAttentionHelper')} · Click to record</span>
        </button>

        <button
          type="button"
          className={`kpi-interactive-btn ${activeSubTab === 'code' && interceptOutput ? 'is-active' : ''}`}
          onClick={() => {
            setStatusFilter('ALL');
            setActiveSubTab('code');
            handleSimulatePreCommitIntercept();
          }}
        >
          <span className="small-caps">{t('kpiInterceptedBreaks')}</span>
          <span className="mono-metric" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {kpis.intercepted_agent_breaks} / 10
          </span>
          <span className="form-helper">{t('statSeededBenchmarkHelper')} · Click to test</span>
        </button>

        <button
          type="button"
          className={`kpi-interactive-btn ${gatewayVersion === 'v2' ? 'is-active' : ''}`}
          onClick={handleToggleGatewayVersion}
        >
          <span className="small-caps">{t('statExpiredTitle')}</span>
          <span className="mono-metric" style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ink)' }}>
            {kpis.expired_safe_to_remove}
          </span>
          <span className="form-helper">gateway.version = {gatewayVersion} · Click to toggle v1/v2</span>
        </button>
      </section>

      {/* Compact 90-Second Lifecycle Bar */}
      <section
        className="card"
        style={{
          padding: '12px 18px',
          background: 'var(--bg-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <ShieldCheck size={18} weight="fill" style={{ color: 'var(--accent)' }} />
          <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{t('demoDirectorTitle')}:</strong>
          <span className="form-helper">{t('urgentAlertTitle')}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: '34px', fontSize: '12.5px' }}
            onClick={() => handleConfirmVoiceFence('FENCE-001')}
          >
            <Microphone size={14} weight="fill" />
            <span>1. {t('demoStep1Btn')} (10s)</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: '34px', fontSize: '12.5px' }}
            onClick={() => {
              setSelectedId('FENCE-001');
              setActiveSubTab('code');
              handleSimulatePreCommitIntercept();
            }}
          >
            <ShieldWarning size={14} weight="fill" />
            <span>2. {t('demoStep2Btn')} (REJECT_EDIT)</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ minHeight: '34px', fontSize: '12.5px' }}
            onClick={handleToggleGatewayVersion}
          >
            <Swap size={14} weight="bold" />
            <span>
              3. {gatewayVersion === 'v2' ? t('btnRestoreGatewayV1') : t('btnToggleGatewayV2')}
            </span>
          </button>
        </div>
      </section>

      {/* Collapsible "+ Record New Spoken Fence" Drawer (Zero Page Clutter!) */}
      {showNewFenceModal && (
        <article className="card" style={{ border: '2px solid var(--accent)' }}>
          <div className="card-header">
            <div>
              <span className="small-caps">Gnani Prisma v3.0 (indic-auto + ITN) → AST Node Linker</span>
              <h2 className="card-title">{t('btnCreateNewFence')}</h2>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowNewFenceModal(false)}
            >
              <X size={16} weight="bold" />
              <span>Close</span>
            </button>
          </div>
          <form onSubmit={handleCreateNewSpokenFence} className="card-body">
            <div className="two-col-grid" style={{ gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="ast-preset-select">
                    Target AST Symbol & File
                  </label>
                  <select
                    id="ast-preset-select"
                    className="form-select"
                    value={selectedAstPresetKey}
                    onChange={(e) => {
                      const nextKey = e.target.value;
                      setSelectedAstPresetKey(nextKey);
                      const found = AST_NODE_PRESETS.find((p) => p.key === nextKey);
                      if (found) {
                        setCustomToken(found.matched_token);
                        setCustomStartLine(found.start_line);
                        setCustomEndLine(found.end_line);
                      }
                    }}
                  >
                    {AST_NODE_PRESETS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="custom-token-input">
                      {t('labelMatchedToken')}
                    </label>
                    <input
                      id="custom-token-input"
                      className="form-input mono-metric"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="start-line-input">
                      Start Line
                    </label>
                    <input
                      id="start-line-input"
                      type="number"
                      className="form-input mono-metric"
                      value={customStartLine}
                      onChange={(e) => setCustomStartLine(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="end-line-input">
                      End Line
                    </label>
                    <input
                      id="end-line-input"
                      type="number"
                      className="form-input mono-metric"
                      value={customEndLine}
                      onChange={(e) => setCustomEndLine(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-fence-voice-input">
                    {t('labelVoicePrompt')}
                  </label>
                  <textarea
                    id="new-fence-voice-input"
                    className="form-textarea"
                    rows={3}
                    value={voiceInput}
                    onChange={(e) => handleVoiceInputChange(e.target.value)}
                  />
                </div>
                <InteractiveAudioWaveform
                  compact
                  isRecording={isRecording}
                  recordingSeconds={recordSeconds}
                  maxSeconds={10}
                  title="New Spoken Fence • 10s Voice Capture"
                  recordLabel={t('btnRecordAudio')}
                  stopRecordLabel="Stop Mic"
                  finishRecordLabel="Transcribe Now"
                  onToggleRecord={() => setIsRecording((prev) => !prev)}
                  onFinishRecord={finishStudioRecordingNow}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    className={isRecording ? 'btn btn-danger' : 'btn btn-secondary'}
                    onClick={() => setIsRecording((prev) => !prev)}
                  >
                    <Microphone size={16} weight="fill" />
                    <span>{isRecording ? `Recording ${recordSeconds}s / 10s...` : t('btnRecordAudio')}</span>
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <CheckCircle size={16} weight="fill" />
                    <span>{t('btnTranscribeLink')}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </article>
      )}

      {/* MAIN MASTER-DETAIL WORKBENCH: Left 10 Fences List + Right 3-Sub-Tab Inspector */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 360px) minmax(0, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Master List of All 10 AST Fences */}
        <article className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 className="card-title" style={{ fontSize: '16px' }}>
              AST Spoken Fences ({filteredFences.length})
            </h2>
            <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Tree-sitter
            </span>
          </div>

          <div className="chip-row" style={{ marginBottom: '12px' }}>
            {[
              { id: 'ALL', label: t('filterAll') },
              { id: 'VERIFIED_ACTIVE', label: t('filterVerified') },
              { id: 'PENDING_CONFIRMATION', label: t('filterPending') },
              { id: 'UNVERIFIED_HISTORICAL', label: t('filterHistorical') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`filter-chip ${statusFilter === tab.id ? 'active' : ''}`}
                aria-pressed={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{ fontSize: '11.5px', padding: '4px 9px' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '680px', overflowY: 'auto' }}>
            {filteredFences.map((fence) => {
              const isSelected = fence.id.toUpperCase() === selectedId.toUpperCase();
              const cfg = getFenceSourceConfig(fence.id);
              return (
                <button
                  key={fence.id}
                  type="button"
                  onClick={() => setSelectedId(fence.id)}
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span className="mono-metric" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)' }}>
                      {fence.id} • {fence.pr_number || cfg.prNumber}
                    </span>
                    <StatusBadge status={fence.status} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', wordBreak: 'break-word' }}>
                    {fence.symbol_name?.split('(')[0] || fence.id}
                  </div>
                  <div className="mono-metric" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                    {fence.matched_token || cfg.matchedToken}
                  </div>
                </button>
              );
            })}
          </div>
        </article>

        {/* RIGHT COLUMN: Focused 3-Tab Workbench Synced to Selected Fence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Sub-Tab Selector Bar */}
          <div
            className="card"
            style={{
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={activeSubTab === 'code' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setActiveSubTab('code')}
                style={{ minHeight: '36px', fontSize: '13px' }}
              >
                <Code size={16} weight="bold" />
                <span>{studioLabels.subTabCode}</span>
              </button>
              <button
                type="button"
                className={activeSubTab === 'voice' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setActiveSubTab('voice')}
                style={{ minHeight: '36px', fontSize: '13px' }}
              >
                <Microphone size={16} weight="bold" />
                <span>{studioLabels.subTabVoice}</span>
              </button>
              <button
                type="button"
                className={activeSubTab === 'incidents' ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setActiveSubTab('incidents')}
                style={{ minHeight: '36px', fontSize: '13px' }}
              >
                <WarningOctagon size={16} weight="bold" />
                <span>{studioLabels.subTabIncidents}</span>
              </button>
            </div>

            <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              Active: {selectedFence.id} ({sourceConfig.incidentId})
            </span>
          </div>

          {/* SUB-TAB 1: Dynamic 10-File Monaco Code Editor + Simple Explanation + Live MCP Block Simulator */}
          {activeSubTab === 'code' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Gemini Simple-Terms + Real-Life Analogy Banner for the Selected Fence */}
              <article className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <div>
                    <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--accent)' }}>
                      {selectedFence.id} • {sourceConfig.filePath} • Lines {sourceConfig.startLine}–{sourceConfig.endLine}
                    </span>
                    <h2 className="card-title" style={{ marginTop: '2px' }}>
                      {selectedFence.symbol_name}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: '34px', fontSize: '12.5px' }}
                      onClick={() =>
                        speakFenceExplanation(
                          reasonedFenceExplanation.spoken_reply,
                          selectedFence.audio_url || '/api/audio/fence-001.wav'
                        )
                      }
                    >
                      <SpeakerHigh size={15} weight="fill" />
                      <span>{t('btnPlayTimbre')}</span>
                    </button>
                    <StatusBadge status={selectedFence.status} />
                  </div>
                </div>

                <div className="two-col-grid" style={{ gap: '12px' }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--accent)',
                    }}
                  >
                    <div className="small-caps" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                      {t('simpleTermsTitle')}
                    </div>
                    <p className="body-prose" style={{ fontSize: '13.5px', margin: 0 }}>
                      <FormattedText text={reasonedFenceExplanation.simple_explanation} />
                    </p>
                  </div>
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--bg-elevated)',
                      borderRadius: '8px',
                      borderLeft: '3px solid var(--success)',
                    }}
                  >
                    <div className="small-caps" style={{ color: 'var(--success)', marginBottom: '4px' }}>
                      {t('realWorldExampleTitle')}
                    </div>
                    <p className="body-prose" style={{ fontSize: '13.5px', margin: 0 }}>
                      <FormattedText text={reasonedFenceExplanation.real_world_example} />
                    </p>
                  </div>
                </div>
              </article>

              {/* Dynamic Multi-File Monaco Editor + Side Pre-Commit Simulator */}
              <div className="studio-split">
                <div className="monaco-studio-wrapper">
                  <div className="monaco-studio-toolbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileCode size={16} weight="regular" aria-hidden="true" />
                      <span className="mono-metric" style={{ fontWeight: 500, color: 'var(--ink)' }}>
                        {sourceConfig.filePath}
                      </span>
                      <span className="form-helper">
                        • Lines {sourceConfig.startLine}–{sourceConfig.endLine} Fenced
                      </span>
                    </div>
                    <span className="mono-metric" style={{ color: 'var(--ink-muted)' }}>
                      {sourceConfig.language.toUpperCase()} • UTF-8
                    </span>
                  </div>

                  <div className="monaco-studio-editor">
                    <Editor
                      height="420px"
                      language={sourceConfig.language}
                      value={sourceConfig.code}
                      theme={editorThemeName}
                      beforeMount={(monaco) => defineMonacoThemes(monaco)}
                      onMount={(editor, monaco) => {
                        editorRef.current = editor;
                        monacoRef.current = monaco;
                        editor.createDecorationsCollection([
                          {
                            range: new monaco.Range(sourceConfig.startLine, 1, sourceConfig.endLine, 1),
                            options: {
                              isWholeLine: true,
                              glyphMarginClassName: 'whyline-gutter-pin-verified',
                              linesDecorationsClassName: 'whyline-gutter-pin-line',
                              inlineClassName: 'whyline-inline-fence-highlight',
                            },
                          },
                        ]);
                      }}
                      options={{
                        glyphMargin: true,
                        lineNumbers: 'on',
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                        fontSize: 13,
                        lineHeight: 20,
                        renderLineHighlight: 'all',
                      }}
                    />
                  </div>
                </div>

                {/* Right Side Card: Pre-Commit MCP Guard Simulator & Expiry Config */}
                <aside className="card" aria-label="Pre-Commit MCP Guard Simulator">
                  <div className="card-header">
                    <div>
                      <span className="small-caps">FastMCP Pre-Commit Guard</span>
                      <h3 className="card-title" style={{ marginTop: '4px', fontSize: '16px' }}>
                        {selectedFence.id} • {sourceConfig.matchedToken}
                      </h3>
                    </div>
                  </div>

                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <div className="small-caps" style={{ marginBottom: '4px' }}>
                        {t('labelDangerCondition')}
                      </div>
                      <p className="body-prose" style={{ fontSize: '13px', color: 'var(--danger)' }}>
                        <FormattedText text={selectedFence.danger_if_removed} />
                      </p>
                    </div>

                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <label className="form-label" htmlFor="mcp-diff-textarea">
                          Proposed AI Agent Diff (@@ hunk check)
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="filter-chip"
                            style={{ minHeight: '28px', padding: '0 10px', fontSize: '11.5px' }}
                            onClick={() => {
                              setProposedDiffInput(sourceConfig.naiveDiff);
                              setInterceptOutput(null);
                            }}
                          >
                            Load Naive Diff
                          </button>
                          <button
                            type="button"
                            className="filter-chip"
                            style={{ minHeight: '28px', padding: '0 10px', fontSize: '11.5px' }}
                            onClick={() => {
                              setProposedDiffInput(
                                `@@ -${sourceConfig.startLine + 20},3 +${sourceConfig.startLine + 20},4 @@\n // Safe non-overlapping telemetry update outside fenced AST lines\n+logger.debug("Preserving ${sourceConfig.matchedToken} invariant");`
                              );
                              setInterceptOutput({
                                decision: 'ALLOW_EDIT',
                                reason: `Diff hunk does not intersect protected lines [${sourceConfig.startLine}–${sourceConfig.endLine}] and preserves ${sourceConfig.matchedToken}.`,
                              });
                            }}
                          >
                            Load Safe Patch
                          </button>
                        </div>
                      </div>
                      <textarea
                        id="mcp-diff-textarea"
                        className="form-textarea mono-metric"
                        rows={4}
                        style={{ fontSize: '12px' }}
                        value={proposedDiffInput}
                        onChange={(e) => setProposedDiffInput(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: '1 1 180px' }}
                        onClick={handleSimulatePreCommitIntercept}
                      >
                        <ShieldWarning size={16} weight="fill" />
                        <span>{t('btnSimulateIntercept')}</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: '1 1 140px' }}
                        onClick={() => setActiveSubTab('voice')}
                      >
                        <Microphone size={16} weight="fill" />
                        <span>Open 10s Voice Tab</span>
                      </button>
                    </div>

                    {interceptOutput && (
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: `1px solid ${
                            interceptOutput.decision === 'ALLOW_EDIT' ? 'var(--success)' : 'var(--danger)'
                          }`,
                        }}
                      >
                        <div
                          className="mono-metric"
                          style={{
                            fontWeight: 700,
                            color:
                              interceptOutput.decision === 'ALLOW_EDIT' ? 'var(--success)' : 'var(--danger)',
                            fontSize: '12px',
                          }}
                        >
                          MCP Decision: {interceptOutput.decision || 'REJECT_EDIT'}
                        </div>
                        <p className="body-prose" style={{ fontSize: '12.5px', marginTop: '6px' }}>
                          {interceptOutput.reason || interceptOutput.spoken_warning_text}
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: 10s Voice Recorder (Gnani Prisma v3.0 ITN) & Auto-Compiled JUnit/Pytest */}
          {activeSubTab === 'voice' && (
            <article className="card">
              <div className="card-header">
                <div>
                  <span className="small-caps">Gnani Prisma v3.0 (indic-auto + ITN) & Fence Compiler</span>
                  <h2 className="card-title" style={{ marginTop: '4px' }}>
                    {selectedFence.id} • {t('labelVoicePrompt')}
                  </h2>
                </div>
                <StatusBadge status={selectedFence.status} />
              </div>

              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="chip-row">
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => handleVoiceInputChange(SAMPLE_TRANSCRIPTS_BY_LANG.te)}
                  >
                    {t('btnSampleTelugu')}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => handleVoiceInputChange(SAMPLE_TRANSCRIPTS_BY_LANG.hi)}
                  >
                    {t('btnSampleHindi')}
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => handleVoiceInputChange(SAMPLE_TRANSCRIPTS_BY_LANG.en)}
                  >
                    {t('btnSampleEnglish')}
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="studio-voice-textarea">
                    Spoken Explanation (Supports English, Telugu, Hindi & Spoken Numbers via ITN)
                  </label>
                  <textarea
                    id="studio-voice-textarea"
                    className="form-textarea"
                    rows={3}
                    value={voiceInput}
                    onChange={(e) => handleVoiceInputChange(e.target.value)}
                  />
                </div>

                {/* Gnani Prisma v3.0 ITN & AST Vocabulary Rescorer Output */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span className="small-caps" style={{ color: 'var(--accent)' }}>
                      {t('labelRescoredTokens')} • Auto-Detected: {itnMeta.detectedLang}
                    </span>
                    <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--success)' }}>
                      {itnMeta.itnConversions.join(' • ') || 'ITN Format: transcribe'}
                    </span>
                  </div>
                  <p className="mono-metric" style={{ fontSize: '13px', color: 'var(--ink)', margin: 0 }}>
                    {itnMeta.rescored.rescored}
                  </p>
                </div>

                {/* Interactive Frosted-Glass & 3D Audio Waveform Synced to 10s Voice Recording */}
                <InteractiveAudioWaveform
                  isRecording={isRecording}
                  isPlaying={isPlayingFenceAudio}
                  recordingSeconds={recordSeconds}
                  maxSeconds={10}
                  title={`${selectedFence.id} • Gnani Prisma v3.0 10s Voice Recorder & Timbre Player`}
                  subtitle="Record a 10-second voice explanation or scrub the 3D frequency bars"
                  recordLabel={t('btnRecordAudio')}
                  stopRecordLabel="Stop Recording"
                  finishRecordLabel="Transcribe & Rescore Now"
                  playLabel={t('btnPlayTimbre')}
                  pauseLabel="Stop Audio"
                  onToggleRecord={() => setIsRecording((prev) => !prev)}
                  onFinishRecord={finishStudioRecordingNow}
                  onTogglePlay={() => {
                    if (isPlayingFenceAudio) {
                      stopFenceAudio();
                    } else {
                      speakFenceExplanation(
                        reasonedFenceExplanation.spoken_reply,
                        selectedFence.audio_url || '/api/audio/fence-001.wav'
                      );
                    }
                  }}
                />

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={isRecording ? 'btn btn-danger' : 'btn btn-secondary'}
                    onClick={() => setIsRecording((prev) => !prev)}
                  >
                    <Microphone size={16} weight="fill" />
                    <span>{isRecording ? `Recording ${recordSeconds}s / 10s...` : t('btnRecordAudio')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleConfirmVoiceFence(selectedFence.id)}
                  >
                    <CheckCircle size={16} weight="fill" />
                    <span>{t('btnConfirmVoice')}</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      speakFenceExplanation(
                        reasonedFenceExplanation.spoken_reply,
                        selectedFence.audio_url || '/api/audio/fence-001.wav'
                      )
                    }
                  >
                    <SpeakerHigh size={16} weight="fill" />
                    <span>{t('btnPlayTimbre')}</span>
                  </button>
                </div>

                <CodeBlock
                  label={`${t('labelJunitTest')} (${selectedFence.id})`}
                  code={
                    junitSource ||
                    `@Test\nvoid enforce_${selectedFence.id.replace('-', '_')}_Invariant() {\n    // Auto-compiled from 10s Gnani Prisma v3.0 voice confirmation\n    assertTrue(sourceContains("${sourceConfig.matchedToken}"));\n}`
                  }
                />
              </div>
            </article>
          )}

          {/* SUB-TAB 3: Outage Postmortems, Branch Checkpoints, 10-Case Benchmark & Security Audit */}
          {activeSubTab === 'incidents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <h2 className="card-title">{t('recentIncidentsTitle')} &amp; {t('savedCheckpointsTitle')}</h2>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowIncidentFormModal((prev) => !prev)}
                >
                  <Plus size={15} weight="bold" />
                  <span>{studioLabels.btnLogIncident}</span>
                </button>
              </div>

              {showIncidentFormModal && (
                <article className="card" style={{ border: '2px solid var(--accent)' }}>
                  <form onSubmit={handleLogIncidentWebhook} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="two-col-grid" style={{ gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label" htmlFor="inc-id-modal">{t('labelIncidentId')}</label>
                        <input
                          id="inc-id-modal"
                          className="form-input mono-metric"
                          value={incidentIdInput}
                          onChange={(e) => setIncidentIdInput(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="inc-svc-modal">{t('labelService')}</label>
                        <input
                          id="inc-svc-modal"
                          className="form-input"
                          value={serviceNameInput}
                          onChange={(e) => setServiceNameInput(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="inc-postmortem-modal">{t('labelVoicePostmortem')}</label>
                      <textarea
                        id="inc-postmortem-modal"
                        className="form-textarea"
                        rows={2}
                        value={voicePostmortemInput}
                        onChange={(e) => setVoicePostmortemInput(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="btn btn-ghost" onClick={() => setShowIncidentFormModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {t('btnTriggerWebhook')}
                      </button>
                    </div>
                  </form>
                </article>
              )}

              <div className="two-col-grid" style={{ gap: '16px' }}>
                {/* Incidents List */}
                <article className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: '15px' }}>{t('recentIncidentsTitle')}</h3>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {incidents.map((inc) => (
                      <div
                        key={inc.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mono-metric" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)' }}>
                            {inc.id} → {inc.linked_fence_id}
                          </span>
                          <StatusBadge status="VERIFIED_ACTIVE" />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', marginTop: '4px' }}>{inc.title}</div>
                        <p className="body-prose" style={{ fontSize: '12.5px', color: 'var(--ink-muted)', marginTop: '4px' }}>
                          <FormattedText text={inc.voice_postmortem} />
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ minHeight: '28px', padding: '2px 10px', fontSize: '11.5px' }}
                            onClick={() => speakFenceExplanation(inc.voice_postmortem, '/api/audio/fence-001.wav')}
                          >
                            <SpeakerHigh size={13} weight="fill" />
                            <span>Speak Postmortem</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ minHeight: '28px', padding: '2px 10px', fontSize: '11.5px' }}
                            onClick={() => {
                              if (inc.linked_fence_id) setSelectedId(inc.linked_fence_id);
                              setActiveSubTab('code');
                            }}
                          >
                            <Code size={13} weight="bold" />
                            <span>Inspect {inc.linked_fence_id || 'Fence'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* Branch Checkpoints List */}
                <article className="card">
                  <div className="card-header">
                    <h3 className="card-title" style={{ fontSize: '15px' }}>{t('savedCheckpointsTitle')}</h3>
                  </div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {checkpoints.map((chk) => (
                      <div
                        key={chk.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mono-metric" style={{ fontWeight: 700, fontSize: '12px' }}>
                            {chk.id} • {chk.branch_name}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ minHeight: '28px', padding: '2px 8px', fontSize: '11.5px' }}
                            onClick={() => speakFenceExplanation(chk.summary, chk.audio_url)}
                          >
                            <SpeakerHigh size={13} weight="fill" />
                            <span>{t('btnPlayCheckpoint')}</span>
                          </button>
                        </div>
                        <p className="body-prose" style={{ fontSize: '12.5px', marginTop: '6px' }}>
                          <strong>{t('checkpointNextLabel')}</strong> <FormattedText text={chk.next_untested_action} />
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>

              {/* 10-Case Seeded Benchmark Matrix */}
              <article className="card">
                <div className="card-header">
                  <h3 className="card-title" style={{ fontSize: '16px' }}>{t('assumptionsTitle')}</h3>
                  <span className="mono-metric">10 / 10 Intercepted</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>{t('colAgentAction')}</th>
                        <th>{t('colRealInvariant')}</th>
                        <th>{t('colOutcome')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assumptions.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedId(row.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="mono-metric" style={{ fontWeight: 600 }}>{row.id}</td>
                          <td><FormattedText text={row.agent_action} /></td>
                          <td><FormattedText text={row.real_invariant} /></td>
                          <td><StatusBadge status={row.status || 'BLOCKED'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
