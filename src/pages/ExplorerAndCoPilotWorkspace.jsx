import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowsClockwise,
  ChatCircleText,
  Code,
  GitBranch,
  Lightbulb,
  Microphone,
  Pause,
  Play,
  SkipForward,
  Sparkle,
  SpeakerHigh,
  Stop,
  Waveform,
} from '@phosphor-icons/react';
import { useI18n, toBcp47 } from '../i18n';
import { apiFetch as fetch, getLocalizedStrategies } from '../api/mockApi';
import { resolveSafeSpeechLang, rescoreSpokenTranscriptWithAst } from '../utils/fenceLogic';
import { buildReasonedCodebaseExplanation } from '../utils/codebaseReasoning';
import { applyGnaniPrismaItn, detectIndicLanguageAuto } from '../utils/fenceSourceCatalog';
import StatusBadge from '../components/StatusBadge';
import { CodeBlock, FormattedText } from '../components/CodeText';
import InteractiveFlowchartSvg from '../components/InteractiveFlowchartSvg';
import InteractiveAudioWaveform from '../components/InteractiveAudioWaveform';
import { WaveformIllustration } from '../components/illustrations/FieldIllustrations';

const DEMO_REPOS = [
  {
    labelKey: 'presetRepoWhyline',
    fallback: 'Anjanikumarkarlapati/Whyline',
    url: 'https://github.com/Anjanikumarkarlapati/Whyline',
  },
  {
    labelKey: 'presetRepoHealthConnect',
    fallback: 'healthconnect-india/payment-gateway',
    url: 'https://github.com/healthconnect-india/payment-gateway-service',
  },
  {
    labelKey: 'presetRepoDicom',
    fallback: 'whyline-labs/clinical-dicom-pipeline',
    url: 'https://github.com/whyline-labs/clinical-dicom-pipeline',
  },
];

const GNANI_VOICES = [
  { id: 'Nalini', label: 'Nalini (en-IN • Timbre v3.0)', defaultLang: 'en-IN' },
  { id: 'Vani', label: 'Vani (te-IN • Timbre v3.0)', defaultLang: 'te-IN' },
  { id: 'Aarav', label: 'Aarav (hi-IN • Timbre v3.0)', defaultLang: 'hi-IN' },
];

const SPEED_OPTIONS = [0.85, 1.0, 1.15, 1.25];

function buildInstantCopilotState(activeQ, bcp47, fenceId = 'FENCE-001', repoSlug = 'Anjanikumarkarlapati/Whyline') {
  const reasoned = buildReasonedCodebaseExplanation({
    question: activeQ,
    fenceId,
    language: bcp47,
    repoSlug,
  });
  const strategies = getLocalizedStrategies(bcp47);
  return {
    question: activeQ,
    fence_id: fenceId,
    language: bcp47,
    spoken_reply: reasoned.spoken_reply,
    simple_explanation: reasoned.simple_explanation,
    real_world_example: reasoned.real_world_example,
    reasoning_steps: reasoned.reasoning_steps,
    reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.MEDIUM)',
    strategies,
  };
}

export default function ExplorerAndCoPilotWorkspace({ initialSection = 'explorer' }) {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const bcp47 = toBcp47(lang);

  // Gnani Vachana v3.0 Voice Agent State
  const [selectedVoice, setSelectedVoice] = useState(() =>
    lang === 'te' ? 'Vani' : lang === 'hi' ? 'Aarav' : 'Nalini'
  );
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [gnaniModel, setGnaniModel] = useState('timbre-v3.0');
  const [lastRequestId, setLastRequestId] = useState('req_v3_ready');

  // Repo Flowchart State
  const [githubUrl, setGithubUrl] = useState('https://github.com/Anjanikumarkarlapati/Whyline');
  const [flowData, setFlowData] = useState(null);
  const [gitGraphData, setGitGraphData] = useState(null);
  const [showSvgCommitGraph, setShowSvgCommitGraph] = useState(initialSection === 'git');
  const [flowLoading, setFlowLoading] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);
  const [isWalkthroughPlaying, setIsWalkthroughPlaying] = useState(false);
  const [isStepSpeaking, setIsStepSpeaking] = useState(false);

  // Gemini Simple-Terms Co-Pilot State
  const [question, setQuestion] = useState(() => t('presetQuestionDoubleCharge'));
  const [activeFenceId, setActiveFenceId] = useState('FENCE-001');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [itnStatus, setItnStatus] = useState(null);
  const [response, setResponse] = useState(() =>
    buildInstantCopilotState(t('presetQuestionDoubleCharge'), bcp47, 'FENCE-001')
  );
  const [isCopilotSpeaking, setIsCopilotSpeaking] = useState(false);

  const audioRef = useRef(null);
  const walkthroughTimerRef = useRef(null);
  const walkthroughActiveRef = useRef(false);
  const copilotSectionRef = useRef(null);
  const prevLangRef = useRef(lang);

  // Sync default voice when UI language switches
  useEffect(() => {
    setSelectedVoice(lang === 'te' ? 'Vani' : lang === 'hi' ? 'Aarav' : 'Nalini');
  }, [lang]);

  const stopAllAudio = () => {
    walkthroughActiveRef.current = false;
    setIsWalkthroughPlaying(false);
    setIsStepSpeaking(false);
    setIsCopilotSpeaking(false);
    if (walkthroughTimerRef.current) {
      clearTimeout(walkthroughTimerRef.current);
      walkthroughTimerRef.current = null;
    }
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
  };

  const speakWithGnaniTimbreV3 = (textToSpeak, targetLangCode, audioUrlFallback = null, onDone = null) => {
    if (!textToSpeak) {
      if (onDone) onDone();
      return;
    }
    const reqId = `req_tts_${Date.now().toString(36)}`;
    setLastRequestId(reqId);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(textToSpeak);
        utter.lang = resolveSafeSpeechLang(textToSpeak, targetLangCode);
        utter.rate = speechSpeed;
        utter.onend = () => {
          setIsCopilotSpeaking(false);
          if (onDone) onDone();
        };
        utter.onerror = () => {
          setIsCopilotSpeaking(false);
          if (onDone) onDone();
        };
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore browser TTS error
      }
    }

    if (audioUrlFallback) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrlFallback);
      } else {
        audioRef.current.src = audioUrlFallback;
      }
      audioRef.current.playbackRate = speechSpeed;
      audioRef.current.play().catch(() => {});
    }
  };

  const fetchRepoAndGitFlowchart = async (targetUrl, targetLangCode, autoPlayWalkthrough = false) => {
    stopAllAudio();
    setFlowLoading(true);
    try {
      const [flowResp, gitResp] = await Promise.all([
        fetch('/api/repo/scan-flowchart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo_url: targetUrl || githubUrl,
            github_url: targetUrl || githubUrl,
            language: targetLangCode || bcp47,
          }),
        }),
        fetch('/api/git/scan-narrated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo_path_or_url: targetUrl || githubUrl,
            language: targetLangCode || bcp47,
          }),
        }),
      ]);
      const flowJson = await flowResp.json();
      const gitJson = await gitResp.json();
      setFlowData(flowJson);
      if (gitResp.ok) {
        setGitGraphData(gitJson);
      }
      setActiveStepIdx(0);
      if (autoPlayWalkthrough && flowJson?.steps?.length > 0) {
        startStepWalkthrough(flowJson.steps, 0);
      }
    } catch {
      // Keep existing state
    } finally {
      setFlowLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoAndGitFlowchart(githubUrl, bcp47, false);
    return () => stopAllAudio();
  }, [lang]);

  const handleAskCopilot = async (overrideQuestion, overrideLang, overrideFenceId) => {
    const activeQ = overrideQuestion !== undefined ? overrideQuestion : question;
    const activeLang = overrideLang || lang;
    const targetBcp47 = toBcp47(activeLang);
    const fenceIdToUse = overrideFenceId || activeFenceId || 'FENCE-001';

    const instant = buildInstantCopilotState(activeQ, targetBcp47, fenceIdToUse, githubUrl);
    setResponse(instant);
    setIsCopilotSpeaking(true);
    speakWithGnaniTimbreV3(instant.spoken_reply, targetBcp47, '/api/audio/fence-001_confirmed.wav');

    setCopilotLoading(true);
    try {
      const res = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQ,
          fence_id: fenceIdToUse,
          language: targetBcp47,
          output_mode: 'voice',
        }),
      });
      const data = await res.json();
      setResponse(data);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Keep Co-Pilot localized when language changes
  useEffect(() => {
    if (prevLangRef.current !== lang) {
      prevLangRef.current = lang;
      const nextQ = t('presetQuestionDoubleCharge');
      setQuestion(nextQ);
      handleAskCopilot(nextQ, lang, activeFenceId);
    }
  }, [lang]);

  // Select a flowchart step and sync the Gemini Simple-Terms Co-Pilot to it
  const handleSelectFlowStep = (idx, speakNow = true) => {
    const steps = flowData?.steps || [];
    const stepObj = steps[idx];
    if (!stepObj) return;
    stopAllAudio();
    setActiveStepIdx(idx);

    const fenceId = stepObj.fence_id || 'FENCE-001';
    setActiveFenceId(fenceId);

    // Sync Co-Pilot explanation directly to the clicked flowchart stage
    if (stepObj.simple_explanation && stepObj.real_world_example) {
      setQuestion(`${stepObj.title} (${stepObj.module})`);
      setResponse((prev) => ({
        ...prev,
        question: `${stepObj.title} (${stepObj.module})`,
        fence_id: fenceId,
        spoken_reply: stepObj.spoken_narration,
        simple_explanation: stepObj.simple_explanation,
        real_world_example: stepObj.real_world_example,
      }));
    }

    if (speakNow) {
      setIsStepSpeaking(true);
      speakWithGnaniTimbreV3(
        stepObj.spoken_narration,
        stepObj.tts_language || bcp47,
        stepObj.audio_url,
        () => setIsStepSpeaking(false)
      );
    }
  };

  const startStepWalkthrough = (stepsList, startIndex = 0) => {
    const steps = stepsList || flowData?.steps || [];
    if (!steps.length) return;
    stopAllAudio();
    walkthroughActiveRef.current = true;
    setIsWalkthroughPlaying(true);

    const runStep = (idx) => {
      if (!walkthroughActiveRef.current || idx >= steps.length) {
        walkthroughActiveRef.current = false;
        setIsWalkthroughPlaying(false);
        setIsStepSpeaking(false);
        return;
      }
      setActiveStepIdx(idx);
      setIsStepSpeaking(true);
      const stepObj = steps[idx];
      speakWithGnaniTimbreV3(
        stepObj.spoken_narration,
        stepObj.tts_language || bcp47,
        stepObj.audio_url
      );
      walkthroughTimerRef.current = setTimeout(() => {
        runStep(idx + 1);
      }, Math.max(1200, Math.round(2200 / speechSpeed)));
    };

    runStep(startIndex);
  };

  const finishVoiceRecordingNow = () => {
    setRecording(false);
    const rawSpoken =
      lang === 'te'
        ? 'gateway router lo retry count ఐదు మరియు timeout 4500 ఎందుకు ఉందో సులభంగా వివరించండి'
        : lang === 'hi'
        ? 'gateway router mein retry count पाँच aur timeout 4500 kyun hai aasan shabdon mein samjhaiye'
        : 'Explain why retry count five and one hundred twenty milliseconds sleep are required in simple terms';
    const detected = detectIndicLanguageAuto(rawSpoken, bcp47);
    const itn = applyGnaniPrismaItn(rawSpoken);
    const rescored = rescoreSpokenTranscriptWithAst(itn.normalizedTranscript);
    setItnStatus({
      model: 'prisma-v3.0',
      detectedLang: detected,
      itnConversions: itn.itnConversions,
      requestId: `req_stt_${Date.now().toString(36)}`,
    });
    setQuestion(rescored.rescored);
    handleAskCopilot(rescored.rescored, lang, activeFenceId);
  };

  // Simulated 10s Voice Mic with Gnani Prisma v3.0 indic-auto + ITN digit conversion
  useEffect(() => {
    if (!recording) {
      setRecordingSec(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setRecordingSec((prev) => {
        if (prev >= 10) {
          finishVoiceRecordingNow();
          return 10;
        }
        return prev + 1;
      });
    }, 450);
    return () => clearInterval(timer);
  }, [recording, lang]);

  const handlePresetClick = (presetKey, fenceId = 'FENCE-001') => {
    const presetText = t(presetKey);
    setActiveFenceId(fenceId);
    setQuestion(presetText);
    handleAskCopilot(presetText, lang, fenceId);
  };

  const steps = flowData?.steps || [];
  const activeStep = steps[activeStepIdx] || steps[0] || null;
  const repoSlug = flowData?.repo_slug || 'Anjanikumarkarlapati/Whyline';

  const workspaceCopy = {
    en: {
      kicker: 'Workspace 01 • Visual Architecture Flowchart & Gemini Simple-Terms Co-Pilot',
      title: 'Codebase Explorer & Voice Co-Pilot',
      subtitle:
        'Scan any GitHub repository to explore its 5-step architecture visually, click any module, or ask any question to get a Gemini-reasoned explanation in simple everyday terms with real-life examples.',
      svgToggleShow: 'Show Commit SVG Graph',
      svgToggleHide: 'Hide Commit SVG Graph',
      voiceBarTitle: 'Gnani Vachana v3.0 Voice Agent Controls',
      voiceSelectLabel: 'Voice Catalog',
      speedSelectLabel: 'Speed',
      openInStudioBtn: 'Open & Test in Fence Studio →',
      clickNodeHint: 'Tip: Click any Step 01–05 box below to hear its voice walkthrough and sync the Gemini Simple-Terms explanation.',
    },
    te: {
      kicker: 'వర్క్‌స్పేస్ 01 • విజువల్ ఆర్కిటెక్చర్ ఫ్లోచార్ట్ & జెమిని సులభ వివరణ కో-పైలట్',
      title: 'కోడ్‌బేస్ ఎక్స్‌ప్లోరర్ & వాయిస్ కో-పైలట్',
      subtitle:
        'ఏదైనా GitHub రిపోజిటరీని స్కాన్ చేసి 5-దశల ఫ్లోచార్ట్‌ను చూడండి, లేదా ఏ ప్రశ్నైనా అడిగి సులభమైన మాటల్లో నిజ-జీవిత ఉదాహరణతో సమాధానం పొందండి.',
      svgToggleShow: 'SVG కమిట్ గ్రాఫ్ చూపించు',
      svgToggleHide: 'SVG కమిట్ గ్రాఫ్ దాచు',
      voiceBarTitle: 'Gnani Vachana v3.0 వాయిస్ ఏజెంట్ కంట్రోల్స్',
      voiceSelectLabel: 'వాయిస్ ఎంపిక',
      speedSelectLabel: 'వేగం (Speed)',
      openInStudioBtn: 'ఫెన్స్ & కోడ్ స్టూడియోలో తెరవండి →',
      clickNodeHint: 'సూచన: క్రింద ఉన్న ఏ దశ (Step 01–05) మీద క్లిక్ చేసినా దాని సులభమైన వివరణ మరియు ఉదాహరణ వెంటనే కనిపిస్తాయి.',
    },
    hi: {
      kicker: 'वर्कस्पेस 01 • विज़ुअल आर्किटेक्चर फ़्लोचार्ट और जेमिनी सरल व्याख्या को-पायलट',
      title: 'कोडबेस एक्सप्लोरर और वॉइस को-पायलट',
      subtitle:
        'किसी भी GitHub रिपॉज़िटरी को स्कैन करके उसका 5-चरण का फ़्लोचार्ट देखें, या कोई भी प्रश्न पूछकर सरल शब्दों और वास्तविक जीवन के उदाहरण के साथ समझें।',
      svgToggleShow: 'SVG कमिट ग्राफ़ दिखाएँ',
      svgToggleHide: 'SVG कमिट ग्राफ़ छिपाएँ',
      voiceBarTitle: 'Gnani Vachana v3.0 वॉइस एजेंट नियंत्रण',
      voiceSelectLabel: 'वॉइस कैटलॉग',
      speedSelectLabel: 'गति (Speed)',
      openInStudioBtn: 'फ़ेंस और कोड स्टूडियो में खोलें →',
      clickNodeHint: 'सुझाव: नीचे किसी भी चरण (Step 01–05) पर क्लिक करके उसकी वॉइस व्याख्या और सरल उदाहरण तुरंत देखें।',
    },
  }[lang === 'te' ? 'te' : lang === 'hi' ? 'hi' : 'en'];

  return (
    <div className="page-stack">
      {/* Unified Header */}
      <section className="context-header">
        <div>
          <p className="context-meta">
            {workspaceCopy.kicker} • {bcp47}
          </p>
          <h1 className="page-title">{workspaceCopy.title}</h1>
          <p className="body-prose" style={{ color: 'var(--ink-muted)', marginTop: '6px' }}>
            {workspaceCopy.subtitle}
          </p>
        </div>
        <WaveformIllustration size={96} active={recording || isStepSpeaking || isCopilotSpeaking} />
      </section>

      {/* Gnani Vachana v3.0 Unified Voice Control Strip */}
      <section
        className="card"
        style={{
          padding: '12px 18px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <SpeakerHigh size={18} weight="fill" style={{ color: 'var(--accent)' }} />
            <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
              {workspaceCopy.voiceBarTitle}
            </strong>
            <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
              https://api.vachana.ai • {gnaniModel} • prisma-v3.0 (indic-auto + ITN) • {lastRequestId}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-muted)' }}
            >
              <span>{workspaceCopy.voiceSelectLabel}:</span>
              <select
                className="form-select"
                aria-label={workspaceCopy.voiceSelectLabel}
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                style={{ width: 'auto', minHeight: '32px', padding: '0 26px 0 8px', fontSize: '12px' }}
              >
                {GNANI_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-muted)' }}
            >
              <span>{workspaceCopy.speedSelectLabel}:</span>
              <select
                className="form-select"
                aria-label={workspaceCopy.speedSelectLabel}
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(Number(e.target.value))}
                style={{ width: 'auto', minHeight: '32px', padding: '0 24px 0 8px', fontSize: '12px' }}
              >
                {SPEED_OPTIONS.map((spd) => (
                  <option key={spd} value={spd}>
                    {spd}x
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setGnaniModel((m) => (m === 'timbre-v3.0' ? 'timbre-v2.5' : 'timbre-v3.0'))}
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
            >
              <span>Model: {gnaniModel}</span>
            </button>
          </div>
        </div>
      </section>

      {/* PART 1: Interactive 5-Step Repository Flowchart + Optional SVG Commit Graph */}
      <article className="card" aria-label={t('explorerTitle')}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p className="context-meta" style={{ marginBottom: '4px' }}>
              <GitBranch size={14} weight="bold" aria-hidden="true" />
              <span>{t('explorerContext')}</span>
            </p>
            <h2 className="card-title">{t('explorerTitle')}</h2>
            <p className="form-helper" style={{ marginTop: '4px' }}>
              {workspaceCopy.clickNodeHint}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSvgCommitGraph((prev) => !prev)}
            >
              <GitBranch size={15} weight="bold" />
              <span>{showSvgCommitGraph ? workspaceCopy.svgToggleHide : workspaceCopy.svgToggleShow}</span>
            </button>
            <StatusBadge status={isWalkthroughPlaying || isStepSpeaking ? 'NEEDS_ATTENTION' : 'VERIFIED_ACTIVE'} />
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* GitHub URL Input & Action Row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input mono-metric"
              style={{ flex: '1 1 320px' }}
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/Anjanikumarkarlapati/Whyline"
              aria-label={t('gitInputAria')}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fetchRepoAndGitFlowchart(githubUrl, bcp47, false)}
              disabled={flowLoading}
            >
              <ArrowsClockwise size={16} weight="bold" aria-hidden="true" />
              <span>{flowLoading ? t('explorerBtnScanning') : t('explorerBtnScan')}</span>
            </button>

            {!isWalkthroughPlaying ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => startStepWalkthrough(steps, 0)}
                disabled={flowLoading || steps.length === 0}
              >
                <SpeakerHigh size={16} weight="fill" aria-hidden="true" />
                <span>{t('explorerBtnPlayAll')}</span>
              </button>
            ) : (
              <button type="button" className="btn btn-danger" onClick={stopAllAudio}>
                <Pause size={16} weight="fill" aria-hidden="true" />
                <span>{t('explorerBtnStopVoice')}</span>
              </button>
            )}
          </div>

          {/* Preset Repo Selector Chips + Language Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <div className="chip-row">
              {DEMO_REPOS.map((repo) => (
                <button
                  key={repo.url}
                  type="button"
                  className={`filter-chip ${githubUrl === repo.url ? 'active' : ''}`}
                  aria-pressed={githubUrl === repo.url}
                  onClick={() => {
                    setGithubUrl(repo.url);
                    fetchRepoAndGitFlowchart(repo.url, bcp47, false);
                  }}
                >
                  {t(repo.labelKey) || repo.fallback}
                </button>
              ))}
            </div>

            <div className="segmented-control" role="group" aria-label={t('explorerVoiceLang')}>
              {[
                { code: 'en', label: 'English (EN)' },
                { code: 'te', label: 'తెలుగు (TE)' },
                { code: 'hi', label: 'हिंदी (HI)' },
              ].map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`segmented-btn ${lang === l.code ? 'active' : ''}`}
                  aria-pressed={lang === l.code}
                  onClick={() => setLang(l.code)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Interactive SVG Commit & Dependency Graph */}
          {showSvgCommitGraph && gitGraphData?.flowchart && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <InteractiveFlowchartSvg
                graph={gitGraphData.flowchart}
                activeId={gitGraphData.narration?.[activeStepIdx]?.node_id}
                doneIds={[]}
                onSelect={(nodeId) => {
                  const idx = (gitGraphData.narration || []).findIndex((n) => n.node_id === nodeId);
                  if (idx >= 0 && idx < steps.length) {
                    handleSelectFlowStep(idx, true);
                  }
                }}
              />
            </div>
          )}

          {/* 5-Step Interactive Flowchart Pipeline */}
          {steps.length > 0 && (
            <div
              style={{
                padding: '16px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  {repoSlug} • {t('explorerNodesCount')}: {steps.length} • {t('explorerStepCounter')}:{' '}
                  {activeStepIdx + 1} / {steps.length}
                </span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                    onClick={() =>
                      handleSelectFlowStep((activeStepIdx - 1 + steps.length) % steps.length, true)
                    }
                  >
                    <span>← Prev Step</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleSelectFlowStep(activeStepIdx, true)}
                  >
                    <Play size={13} weight="fill" />
                    <span>
                      {t('explorerBtnSpeakPart')} {activeStepIdx + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleSelectFlowStep((activeStepIdx + 1) % steps.length, true)}
                  >
                    <SkipForward size={13} weight="fill" />
                    <span>
                      {t('explorerBtnNextPart')} ({((activeStepIdx + 1) % steps.length) + 1}/{steps.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Interactive 3D Frosted-Glass Audio Waveform Synced to Walkthrough Steps */}
              <div style={{ marginBottom: '14px' }}>
                <InteractiveAudioWaveform
                  compact
                  isPlaying={isWalkthroughPlaying || isStepSpeaking}
                  progressPercent={Math.round(((activeStepIdx + 1) / Math.max(1, steps.length)) * 100)}
                  stepLabel={`STEP 0${activeStepIdx + 1} / 0${steps.length}`}
                  title={`Step 0${activeStepIdx + 1}: ${activeStep?.title || 'Architecture Walkthrough'}`}
                  playLabel={`${t('explorerBtnSpeakPart')} ${activeStepIdx + 1}`}
                  pauseLabel={t('explorerBtnStopVoice')}
                  onPrevStep={() =>
                    handleSelectFlowStep((activeStepIdx - 1 + steps.length) % steps.length, true)
                  }
                  onNextStep={() => handleSelectFlowStep((activeStepIdx + 1) % steps.length, true)}
                  onTogglePlay={() => {
                    if (isWalkthroughPlaying || isStepSpeaking) {
                      stopAllAudio();
                    } else {
                      handleSelectFlowStep(activeStepIdx, true);
                    }
                  }}
                  onSeekPercent={(pct) => {
                    const targetIdx = Math.min(
                      steps.length - 1,
                      Math.max(0, Math.floor((pct / 100) * steps.length))
                    );
                    handleSelectFlowStep(targetIdx, true);
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '10px',
                }}
              >
                {steps.map((s, idx) => {
                  const isActive = idx === activeStepIdx;
                  return (
                    <button
                      key={s.step_number}
                      type="button"
                      onClick={() => handleSelectFlowStep(idx, true)}
                      style={{
                        textAlign: 'left',
                        padding: '12px',
                        borderRadius: '8px',
                        border: isActive
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border-subtle)',
                        background: isActive ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono-metric" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
                          Step 0{s.step_number}
                        </span>
                        <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                          {isActive && isStepSpeaking ? '● speaking' : s.fence_id}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.3 }}>
                        {s.title}
                      </div>
                      <div className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                        {s.symbol}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Active Step Simple Explanation + Real-Life Analogy + Code */}
              {activeStep && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <span className="mono-metric" style={{ fontSize: '12px', color: 'var(--accent)' }}>
                        {activeStep.stage_badge} • {activeStep.fence_id} ({activeStep.pr_ref})
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '2px', color: 'var(--ink)' }}>
                        Step {activeStep.step_number}: {activeStep.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate(`/fences?id=${activeStep.fence_id || 'FENCE-001'}`)}
                      style={{ minHeight: '34px', fontSize: '12px' }}
                    >
                      <span>{workspaceCopy.openInStudioBtn}</span>
                    </button>
                  </div>

                  {activeStep.simple_explanation && activeStep.real_world_example && (
                    <div className="two-col-grid" style={{ gap: '12px' }}>
                      <div
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-canvas)',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--accent)',
                        }}
                      >
                        <div className="small-caps" style={{ color: 'var(--accent)', marginBottom: '4px' }}>
                          {t('simpleTermsTitle')}
                        </div>
                        <p className="body-prose" style={{ margin: 0, fontSize: '13.5px' }}>
                          <FormattedText text={activeStep.simple_explanation} />
                        </p>
                      </div>
                      <div
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-canvas)',
                          borderRadius: '6px',
                          borderLeft: '3px solid var(--success)',
                        }}
                      >
                        <div className="small-caps" style={{ color: 'var(--success)', marginBottom: '4px' }}>
                          {t('realWorldExampleTitle')}
                        </div>
                        <p className="body-prose" style={{ margin: 0, fontSize: '13.5px' }}>
                          <FormattedText text={activeStep.real_world_example} />
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="two-col-grid" style={{ gap: '12px' }}>
                    <div>
                      <p className="body-prose" style={{ fontSize: '13.5px', marginBottom: '6px' }}>
                        <strong>{t('explorerChestertonWhy')}</strong> <FormattedText text={activeStep.why_summary} />
                      </p>
                      <p className="body-prose" style={{ fontSize: '13.5px', color: 'var(--danger)' }}>
                        <strong>{t('explorerImpactRemoved')}</strong>{' '}
                        <FormattedText text={activeStep.danger_if_removed} />
                      </p>
                    </div>
                    <div>
                      <CodeBlock
                        label={`${activeStep.module} • ${t('explorerGuardedToken')} ${activeStep.guarded_token}`}
                        code={activeStep.code_snippet}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {/* PART 2: Unified Gemini Simple-Terms & Real-Life Example Co-Pilot */}
      <article className="card" ref={copilotSectionRef}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="chip-row" style={{ flex: 1 }}>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionTelugu', 'FENCE-001')}
            >
              {t('presetLabelTelugu')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionHindi', 'FENCE-001')}
            >
              {t('presetLabelHindi')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionDoubleCharge', 'FENCE-001')}
            >
              {t('presetLabelDoubleCharge')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionDicom', 'FENCE-002')}
            >
              {t('presetLabelDicom')}
            </button>
            <button
              type="button"
              className="filter-chip"
              onClick={() => handlePresetClick('presetQuestionWhylineArch', 'FENCE-001')}
            >
              {t('presetLabelWhylineArch')}
            </button>
          </div>
        </div>

        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question Input + Prisma v3.0 Mic */}
          <div className="form-group">
            <label className="form-label" htmlFor="copilot-query-input">
              {t('labelAskQuestion')}
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                id="copilot-query-input"
                type="text"
                className="form-input"
                style={{ flex: '1 1 320px' }}
                placeholder={t('placeholderQuestion')}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskCopilot();
                }}
              />
              <button
                type="button"
                className={recording ? 'btn btn-danger' : 'btn btn-secondary'}
                onClick={() => setRecording(!recording)}
                aria-label="Record question with microphone"
              >
                {recording ? (
                  <>
                    <Stop size={16} weight="fill" aria-hidden="true" />
                    <span className="mono-metric">{recordingSec}s / 10s</span>
                  </>
                ) : (
                  <>
                    <Microphone size={16} weight="regular" aria-hidden="true" />
                    <span>{t('btnRecord10s')}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleAskCopilot()}
                disabled={copilotLoading}
              >
                <Sparkle size={16} weight="fill" aria-hidden="true" />
                <span>{copilotLoading ? t('stateThinking') : t('btnAskCopilot')}</span>
              </button>
            </div>

            {/* Interactive Frosted-Glass & 3D Audio Waveform Synced to Voice Recording & Co-Pilot Speech */}
            <div style={{ marginTop: '10px' }}>
              <InteractiveAudioWaveform
                isRecording={recording}
                isPlaying={isCopilotSpeaking}
                recordingSeconds={recordingSec}
                maxSeconds={10}
                title="Voice Co-Pilot • Gnani Prisma v3.0 Recorder & Timbre v3.0 Player"
                subtitle="Record a 10s voice query or click any bar to scrub Co-Pilot narration"
                recordLabel={t('btnRecord10s')}
                stopRecordLabel="Stop Mic"
                finishRecordLabel="Transcribe Now"
                playLabel={t('btnPlayWav')}
                pauseLabel={t('explorerBtnStopVoice')}
                onToggleRecord={() => setRecording((prev) => !prev)}
                onFinishRecord={finishVoiceRecordingNow}
                onTogglePlay={() => {
                  if (isCopilotSpeaking) {
                    stopAllAudio();
                  } else if (response?.spoken_reply) {
                    setIsCopilotSpeaking(true);
                    speakWithGnaniTimbreV3(
                      response.spoken_reply,
                      bcp47,
                      '/api/audio/fence-001_confirmed.wav'
                    );
                  }
                }}
              />
            </div>

            {itnStatus && (
              <div
                className="mono-metric"
                style={{
                  fontSize: '12px',
                  color: 'var(--success)',
                  marginTop: '6px',
                }}
              >
                Gnani {itnStatus.model} • Auto-Detected: {itnStatus.detectedLang} •{' '}
                {itnStatus.itnConversions.join(', ') || 'ITN Active'} • {itnStatus.requestId}
              </div>
            )}
          </div>

          {/* Gemini Reasoned Simple Terms + Real-Life Analogy Output */}
          {response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '18px 20px',
                  background: 'var(--bg-elevated)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ChatCircleText size={18} weight="regular" style={{ color: 'var(--accent)' }} />
                    <span className="small-caps">{t('spokenAnswerHeader')}</span>
                    <span className="mono-metric" style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>
                      • {selectedVoice} ({speechSpeed}x)
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: '32px', padding: '4px 10px', fontSize: '12px' }}
                      onClick={() =>
                        speakWithGnaniTimbreV3(
                          response.spoken_reply,
                          bcp47,
                          '/api/audio/fence-001_confirmed.wav'
                        )
                      }
                    >
                      <SpeakerHigh size={14} weight="fill" />
                      <span>{t('btnPlayWav')}</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ minHeight: '32px', padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => navigate(`/fences?id=${response.fence_id || activeFenceId || 'FENCE-001'}`)}
                    >
                      <span>{workspaceCopy.openInStudioBtn}</span>
                    </button>
                  </div>
                </div>

                <p className="body-prose" style={{ color: 'var(--ink)' }}>
                  <FormattedText text={response.spoken_reply} />
                </p>

                {/* In Simple Terms + Real-Life Example Side-by-Side */}
                {(response.simple_explanation || response.real_world_example) && (
                  <div className="two-col-grid" style={{ gap: '12px' }}>
                    {response.simple_explanation && (
                      <div
                        style={{
                          padding: '14px 16px',
                          background: 'var(--bg-surface)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: '3px solid var(--accent)',
                        }}
                      >
                        <div className="small-caps" style={{ color: 'var(--accent)', marginBottom: '6px' }}>
                          {t('simpleTermsTitle')}
                        </div>
                        <p className="body-prose" style={{ color: 'var(--ink)', margin: 0 }}>
                          <FormattedText text={response.simple_explanation} />
                        </p>
                      </div>
                    )}

                    {response.real_world_example && (
                      <div
                        style={{
                          padding: '14px 16px',
                          background: 'var(--bg-surface)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                          borderLeft: '3px solid var(--success)',
                        }}
                      >
                        <div className="small-caps" style={{ color: 'var(--success)', marginBottom: '6px' }}>
                          {t('realWorldExampleTitle')}
                        </div>
                        <p className="body-prose" style={{ color: 'var(--ink)', margin: 0 }}>
                          <FormattedText text={response.real_world_example} />
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 1-2-3 Step-by-Step Reasoning */}
                {Array.isArray(response.reasoning_steps) && response.reasoning_steps.length > 0 && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'var(--bg-canvas)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="small-caps" style={{ color: 'var(--ink-muted)', marginBottom: '8px' }}>
                      {t('reasoningTraceTitle')} • {response.reasoning_engine || 'gemini-3.8-flash'}
                    </div>
                    <ol
                      style={{
                        margin: 0,
                        paddingLeft: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {response.reasoning_steps.map((stepText, idx) => (
                        <li key={idx} className="body-prose" style={{ fontSize: '13px', color: 'var(--ink)' }}>
                          <FormattedText text={stepText} />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* 3 Ranked Architectural Strategies */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="small-caps">{t('strategiesHeader')}</span>
                <div className="three-col-grid">
                  {(response.strategies || []).map((strat, index) => (
                    <div
                      key={strat.rank || index}
                      className="card"
                      style={{
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mono-metric" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                            {t('strategyLabel')} 0{strat.rank || index + 1}
                          </span>
                          <StatusBadge
                            status={
                              index === 0
                                ? 'VERIFIED_ACTIVE'
                                : index === 1
                                ? 'PENDING_CONFIRMATION'
                                : 'UNVERIFIED_HISTORICAL'
                            }
                          />
                        </div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>{strat.title}</h3>
                        <p className="body-prose" style={{ fontSize: '13.5px', color: 'var(--ink-secondary)' }}>
                          <FormattedText text={strat.summary} />
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span className="form-helper">
                          {strat.risk} • {(strat.badges || []).join(' • ')}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ minHeight: '32px', padding: '0 10px', fontSize: '12px' }}
                            onClick={() => {
                              setIsCopilotSpeaking(true);
                              speakWithGnaniTimbreV3(
                                `${strat.title}. ${strat.summary}`,
                                bcp47,
                                '/api/audio/fence-001_confirmed.wav'
                              );
                            }}
                          >
                            <SpeakerHigh size={13} weight="fill" />
                            <span>Speak Strategy</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ minHeight: '32px', padding: '0 12px', fontSize: '12px' }}
                            onClick={() =>
                              navigate(`/fences?id=${response.fence_id || activeFenceId || 'FENCE-001'}`)
                            }
                          >
                            <Code size={13} weight="bold" />
                            <span>Test in Studio</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
