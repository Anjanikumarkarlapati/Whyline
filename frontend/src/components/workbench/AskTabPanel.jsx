import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Code,
  FileCode,
  GitBranch,
  Graph,
  Microphone,
  SpeakerHigh,
  Stop,
} from '@phosphor-icons/react';
import { QUICK_GITHUB_REPOS, useWorkbenchSelection } from '../../context/WorkbenchContext';
import { useI18n } from '../../i18n';
import {
  clearVoiceResponseCache,
  getCachedVoiceResponse,
  getVoiceCacheStats,
  setCachedVoiceResponse,
} from '../../utils/voiceResponseCache';
import AudioWaveform from '../AudioWaveform';
import VoiceLanguageDropdown from '../VoiceLanguageDropdown';

export default function AskTabPanel({ compact = false, onQuestionAnswered }) {
  const navigate = useNavigate();
  const { lang, setLang } = useI18n();
  const {
    repoContext,
    repoLoading,
    loadGitHubRepo,
    selectLocation,
    currentQuery,
    setCurrentQuery,
    latestResponse,
    setLatestResponse,
    latestSttTelemetry,
    setLatestSttTelemetry,
    latestAudioUrl,
    setLatestAudioUrl,
    cacheTelemetry,
    setCacheTelemetry,
    addQaHistoryEntry,
  } = useWorkbenchSelection();

  const [repoInput, setRepoInput] = useState(
    repoContext?.url || 'https://github.com/HealthConnect/payment-gateway-v1'
  );
  const [selectedVoice, setSelectedVoice] = useState(() =>
    lang === 'te' ? 'Nalini' : lang === 'hi' ? 'Bhavna' : 'Pranav'
  );
  const [loading, setLoading] = useState(false);
  const [pipelineStage, setPipelineStage] = useState('idle'); // 'idle' | 'recording' | 'stt' | 'rrf' | 'done'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(10);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  const query = currentQuery;
  const setQuery = setCurrentQuery;
  const response = latestResponse;
  const setResponse = setLatestResponse;
  const sttTelemetry = latestSttTelemetry;
  const setSttTelemetry = setLatestSttTelemetry;
  const audioUrl = latestAudioUrl;
  const setAudioUrl = setLatestAudioUrl;

  useEffect(() => {
    if (repoContext?.url) {
      setRepoInput(repoContext.url);
    }
  }, [repoContext?.url]);

  useEffect(() => {
    if (lang === 'te') setSelectedVoice('Nalini');
    else if (lang === 'hi') setSelectedVoice('Bhavna');
    else setSelectedVoice('Pranav');
  }, [lang]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      setPipelineStage('recording');
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      if (typeof window !== 'undefined') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
            rec.interimResults = true;
            rec.continuous = true;
            rec.onresult = (event) => {
              let transcript = '';
              for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
              }
              if (transcript.trim()) {
                setQuery(transcript.trim());
              }
            };
            rec.start();
            recognitionRef.current = rec;
          } catch {
            // fallback to simulated mic capture
          }
        }
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, lang, setQuery]);

  const handleLoadRepo = async (targetUrl, sampleQuestion = null) => {
    const urlToLoad = targetUrl || repoInput;
    if (!urlToLoad || !String(urlToLoad).trim()) return;
    setRepoInput(urlToLoad);
    const loaded = await loadGitHubRepo(urlToLoad);
    if (loaded) {
      const nextQuestion =
        sampleQuestion ||
        (loaded.isLocal
          ? 'How do we fix the double-charge bug in GatewayRouter.java without breaking retryCount = 5?'
          : `How does ${loaded.files?.[0]?.shortName || loaded.repo} work in ${loaded.fullName} and how do we change it safely?`);
      setQuery(nextQuestion);
    }
  };

  const applyCachedEntry = (cached) => {
    const data = cached.response;
    setResponse(data);
    if (cached.sttTelemetry) {
      setSttTelemetry(cached.sttTelemetry);
      if (cached.sttTelemetry.rescored_transcript) {
        setQuery(cached.sttTelemetry.rescored_transcript);
      }
    }
    if (data?.executed_task?.target_file) {
      selectLocation({
        file: data.executed_task.target_file,
        line: data.executed_task.target_line || 1,
        fenceId: data.executed_task.fence_id,
      });
    }
    setPipelineStage('done');
    setCacheTelemetry({
      hit: true,
      hitCount: cached.hitCount,
      source: cached.source,
      ...getVoiceCacheStats(),
    });
    const replyUrl = cached.audioUrl || data?.audio_url || '/api/audio/fence-001.wav';
    const replyText = cached.spokenReply || data?.spoken_reply || data?.spoken_answer || '';
    setAudioUrl(replyUrl);
    handlePlayAudio(replyUrl, replyText);
    if (onQuestionAnswered) {
      onQuestionAnswered(data);
    }
  };

  const runSttAndExecuteTask = async (rawHint, explicitLang = null) => {
    const targetLang = explicitLang || lang;
    const langCode = targetLang === 'hi' ? 'hi-IN' : targetLang === 'te' ? 'te-IN' : 'en-IN';
    const rawQ = (rawHint || query || '').trim();
    if (!rawQ) return;

    const cached = getCachedVoiceResponse({
      repoFullName: repoContext?.fullName,
      question: rawQ,
      language: langCode,
    });
    if (cached && cached.response) {
      applyCachedEntry(cached);
      return;
    }

    setLoading(true);
    setPipelineStage('stt');

    try {
      const sttResp = await fetch('/api/gnani/stt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_text_hint: rawQ,
          language: langCode,
        }),
      });
      const sttData = sttResp.ok ? await sttResp.json() : null;
      const rescoredQuery = sttData?.rescored_transcript || rawQ;
      if (sttData) {
        setSttTelemetry(sttData);
        setQuery(rescoredQuery);
      }
      await handleAsk(rescoredQuery, sttData, targetLang, rawQ);
    } catch {
      await handleAsk(rawQ, null, targetLang, rawQ);
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      runSttAndExecuteTask(query);
    } else {
      setIsRecording(true);
    }
  };

  const handleAsk = async (
    explicitQuery,
    existingStt = null,
    explicitLang = null,
    originalRawQuery = null
  ) => {
    const q = (explicitQuery || query || '').trim();
    if (!q) return;

    const targetLang = explicitLang || lang;
    const langCode = targetLang === 'hi' ? 'hi-IN' : targetLang === 'te' ? 'te-IN' : 'en-IN';
    const voiceForLang = targetLang === 'te' ? 'Nalini' : targetLang === 'hi' ? 'Bhavna' : 'Pranav';

    if (!existingStt) {
      const cached = getCachedVoiceResponse({
        repoFullName: repoContext?.fullName,
        question: q,
        language: langCode,
      });
      if (cached && cached.response) {
        applyCachedEntry(cached);
        return;
      }
    }

    setLoading(true);
    setPipelineStage('rrf');
    try {
      const resp = await fetch('/api/copilot/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          language: langCode,
          voice: voiceForLang,
          output_mode: 'voice_and_text',
        }),
      });

      if (!resp.ok) throw new Error('Request failed');
      const data = await resp.json();
      setResponse(data);
      const finalStt = data?.stt_telemetry || existingStt || null;
      if (finalStt) {
        setSttTelemetry(finalStt);
      }

      setCachedVoiceResponse(
        {
          repoFullName: repoContext?.fullName,
          question: originalRawQuery || q,
          language: langCode,
          voice: voiceForLang,
        },
        { response: data, sttTelemetry: finalStt }
      );
      if (originalRawQuery && originalRawQuery !== q) {
        setCachedVoiceResponse(
          {
            repoFullName: repoContext?.fullName,
            question: q,
            language: langCode,
            voice: voiceForLang,
          },
          { response: data, sttTelemetry: finalStt }
        );
      }

      addQaHistoryEntry({
        question: q,
        repoFullName: repoContext?.fullName,
        language: langCode,
        response: data,
        sttTelemetry: finalStt,
      });

      setCacheTelemetry({
        hit: false,
        hitCount: 0,
        source: 'live-api',
        ...getVoiceCacheStats(),
      });

      if (data?.executed_task?.target_file) {
        selectLocation({
          file: data.executed_task.target_file,
          line: data.executed_task.target_line || 1,
          fenceId: data.executed_task.fence_id,
        });
      }
      setPipelineStage('done');
      const replyUrl = data?.audio_url || '/api/audio/fence-001.wav';
      const replyText = data?.spoken_reply || data?.spoken_answer || '';
      setAudioUrl(replyUrl);
      handlePlayAudio(replyUrl, replyText);
      if (onQuestionAnswered) {
        onQuestionAnswered(data);
      }
    } catch {
      setPipelineStage('done');
    } finally {
      setLoading(false);
    }
  };

  const startSimulatedWaveformPlayback = (speechText) => {
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    setIsPlayingAudio(true);
    setAudioCurrentTime(0);
    setAudioDuration(8);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && speechText) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(speechText);
        utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore speechSynthesis error
      }
    }

    playbackTimerRef.current = setInterval(() => {
      setAudioCurrentTime((prev) => {
        if (prev >= 8) {
          clearInterval(playbackTimerRef.current);
          setIsPlayingAudio(false);
          return 0;
        }
        return Number((prev + 0.25).toFixed(2));
      });
    }, 250);
  };

  const handlePlayAudio = (url, textToSpeak = null) => {
    const target = url || audioUrl;
    const spokenText = textToSpeak || response?.spoken_reply || response?.spoken_answer || '';
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);

    try {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(target);
      audioRef.current = a;
      a.ontimeupdate = () => setAudioCurrentTime(a.currentTime);
      a.onloadedmetadata = () => {
        if (a.duration && Number.isFinite(a.duration)) setAudioDuration(a.duration);
      };
      a.onended = () => {
        setIsPlayingAudio(false);
        setAudioCurrentTime(0);
      };
      a.onerror = () => {
        startSimulatedWaveformPlayback(spokenText);
      };
      a.play()
        .then(() => {
          setIsPlayingAudio(true);
          if (
            typeof window !== 'undefined' &&
            'speechSynthesis' in window &&
            spokenText &&
            !String(target).includes('gemini_tts_')
          ) {
            try {
              window.speechSynthesis.cancel();
              const utter = new SpeechSynthesisUtterance(spokenText);
              utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
              window.speechSynthesis.speak(utter);
            } catch {}
          }
        })
        .catch(() => {
          startSimulatedWaveformPlayback(spokenText);
        });
    } catch {
      startSimulatedWaveformPlayback(spokenText);
    }
  };

  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      if (audioRef.current) audioRef.current.pause();
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    } else {
      handlePlayAudio(audioUrl, response?.spoken_reply);
    }
  };

  const activeStarterRepo =
    QUICK_GITHUB_REPOS.find(
      (r) => r.fullName.toLowerCase() === (repoContext?.fullName || '').toLowerCase()
    ) || QUICK_GITHUB_REPOS[0];

  const stages = [
    { id: 'recording', label: '1. Speak or Type Question' },
    { id: 'stt', label: '2. Match Code Names' },
    { id: 'rrf', label: '3. Find Answer in Repo' },
    { id: 'done', label: '4. Play Voice Answer' },
  ];

  return (
    <div className="ask-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Step 1: Pick a GitHub Repository */}
      <div
        className="card"
        data-testid="github-repo-loader-card"
        style={{
          padding: '16px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitBranch size={16} weight="bold" style={{ color: 'var(--accent)' }} aria-hidden="true" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Step 1: Pick a GitHub Repository
            </span>
          </div>
          <span
            className="status-badge status-good"
            data-testid="active-github-repo-badge"
            style={{ fontSize: '11px', padding: '2px 10px' }}
          >
            {repoContext?.fullName || 'HealthConnect/payment-gateway-v1'} •{' '}
            {repoContext?.files?.length || 4} files loaded
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
          {activeStarterRepo?.simpleDescription ||
            repoContext?.description ||
            'Paste any GitHub repository URL below or click a sample project to start.'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoadRepo(repoInput);
          }}
          style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}
        >
          <input
            id="github-repo-url-input"
            data-testid="github-repo-url-input"
            type="text"
            className="form-input"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="Paste GitHub URL or owner/repo (for example: https://github.com/expressjs/express)"
            aria-label="GitHub repository URL or owner/repo"
            style={{
              flex: '1 1 260px',
              minHeight: '38px',
              fontSize: '13px',
              padding: '6px 12px',
              fontFamily: 'DM Mono, monospace',
            }}
          />
          <button
            type="submit"
            data-testid="load-github-repo-btn"
            className="btn btn-secondary"
            disabled={repoLoading}
            style={{ minHeight: '38px', padding: '0 16px', fontSize: '13px', whiteSpace: 'nowrap' }}
          >
            <span>{repoLoading ? 'Loading Repo...' : 'Load Repo'}</span>
          </button>
        </form>

        {/* Sample GitHub Repositories */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Sample repos:
          </span>
          {QUICK_GITHUB_REPOS.map((qr) => {
            const isActive = repoContext?.fullName?.toLowerCase() === qr.fullName.toLowerCase();
            return (
              <button
                key={qr.fullName}
                type="button"
                data-testid={`quick-repo-${qr.fullName.replace('/', '-')}`}
                className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  minHeight: '28px',
                  padding: '0 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                }}
                onClick={() => handleLoadRepo(qr.url, qr.sampleQuestion)}
              >
                {qr.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Ask Your Question by Voice or Text */}
      <div
        className="card"
        style={{
          padding: '16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <label
            htmlFor="workbench-ask-input"
            style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}
          >
            Step 2: Ask Any Question About This Repository
          </label>
          <VoiceLanguageDropdown
            id="query-voice-lang-select"
            value={lang}
            disabled={loading || isRecording}
            onChange={(nextCode, option) => {
              setLang(nextCode);
              setSelectedVoice(option.voice);
              if (response || query.trim()) {
                runSttAndExecuteTask(query, nextCode);
              }
            }}
          />
        </div>

        {/* Starter Questions for Beginners */}
        {activeStarterRepo?.starterQuestions && activeStarterRepo.starterQuestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Starter questions:
            </span>
            {activeStarterRepo.starterQuestions.map((sq) => (
              <button
                key={sq.label}
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => {
                  setQuery(sq.query);
                  if (sq.file) {
                    selectLocation({ file: sq.file, line: sq.line || 1 });
                  }
                  runSttAndExecuteTask(sq.query);
                }}
              >
                {sq.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <textarea
            id="workbench-ask-input"
            data-testid="workbench-ask-input"
            ref={inputRef}
            className="form-input"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                runSttAndExecuteTask(query);
              }
            }}
            placeholder={`Type a question or click the microphone to ask about ${repoContext?.fullName || 'this repository'}...`}
            style={{ paddingRight: '52px', fontSize: '14px', lineHeight: '1.5' }}
          />

          <button
            type="button"
            data-testid="voice-mic-btn"
            className={`btn btn-icon ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleToggleRecord}
            aria-label={isRecording ? 'Stop recording and ask question' : 'Speak question with microphone'}
            style={{
              position: 'absolute',
              right: '10px',
              bottom: '10px',
              minHeight: '36px',
              minWidth: '36px',
            }}
          >
            {isRecording ? <Stop size={16} weight="fill" /> : <Microphone size={16} weight="regular" />}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            data-testid="stt-execute-btn"
            className="btn btn-primary"
            onClick={() => runSttAndExecuteTask(query)}
            disabled={loading || isRecording}
            style={{ minHeight: '40px', flex: '1 1 220px', whiteSpace: 'nowrap' }}
          >
            <Microphone size={16} weight="fill" aria-hidden="true" />
            <span>
              {loading ? 'Finding Answer & Generating Voice...' : 'Ask Question (Voice + Text Answer)'}
            </span>
          </button>

          <button
            type="button"
            data-testid="ask-copilot-btn"
            className="btn btn-secondary"
            onClick={() => handleAsk()}
            disabled={loading || isRecording}
            style={{ minHeight: '40px', padding: '0 16px', whiteSpace: 'nowrap' }}
          >
            <span>Quick Ask</span>
          </button>
        </div>

        {/* 4-Step Progress Bar */}
        <div
          role="region"
          aria-label="Question Progress"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '6px',
            padding: '6px',
            borderRadius: '10px',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-default)',
          }}
        >
          {stages.map((st) => {
            const isCurrent = pipelineStage === st.id;
            const isDone =
              pipelineStage === 'done' ||
              (pipelineStage === 'rrf' && (st.id === 'recording' || st.id === 'stt')) ||
              (pipelineStage === 'stt' && st.id === 'recording');
            return (
              <div
                key={st.id}
                className={`pipeline-stage ${isCurrent ? 'voice-active-stage' : ''}`}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: isCurrent || isDone ? 600 : 500,
                  textAlign: 'center',
                  background: isCurrent
                    ? 'var(--accent)'
                    : isDone
                      ? 'var(--success-tint)'
                      : 'var(--bg-surface)',
                  color: isCurrent
                    ? 'var(--on-accent)'
                    : isDone
                      ? 'var(--success)'
                      : 'var(--text-secondary)',
                  border: `1px solid ${
                    isCurrent ? 'var(--accent)' : isDone ? 'var(--success)' : 'var(--border-default)'
                  }`,
                }}
              >
                {st.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Listen and Read the Answer */}
      <div
        className="card"
        data-testid="voice-answer-deck"
        style={{
          padding: '16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Step 3: Listen to the Voice Explanation &amp; Read the Answer
          </span>
          {!compact && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="open-full-answers-btn"
                className="btn btn-secondary"
                style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/answers')}
              >
                <Code size={14} weight="regular" />
                <span>Open Full Answer &amp; Code Viewer</span>
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                data-testid="open-flowcharts-btn"
                className="btn btn-secondary"
                style={{ minHeight: '30px', padding: '0 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                onClick={() => navigate('/flowcharts')}
              >
                <Graph size={14} weight="regular" />
                <span>See Repo Flowchart</span>
              </button>
            </div>
          )}
        </div>

        <AudioWaveform
          isPlaying={isPlayingAudio}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          maxRecordingSeconds={10}
          currentTime={audioCurrentTime}
          duration={audioDuration}
          onTogglePlay={handleToggleAudio}
          onToggleRecord={handleToggleRecord}
          onSeek={(seekTime) => {
            if (audioRef.current) {
              audioRef.current.currentTime = seekTime;
            }
            setAudioCurrentTime(seekTime);
          }}
          title={`Voice Answer (${repoContext?.fullName || 'Repository'})`}
          subtitle={`Voice: ${selectedVoice} (${
            lang === 'hi' ? 'Hindi' : lang === 'te' ? 'Telugu' : 'English'
          })`}
        />

        {cacheTelemetry && (
          <div
            data-testid="voice-cache-telemetry"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: cacheTelemetry.hit ? 'var(--success-tint)' : 'var(--bg-raised)',
              border: `1px solid ${cacheTelemetry.hit ? 'var(--success)' : 'var(--border-default)'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <span
              className="mono-metric"
              data-testid="voice-cache-status-badge"
              style={{
                fontWeight: 600,
                color: cacheTelemetry.hit ? 'var(--success)' : 'var(--text-secondary)',
              }}
            >
              {cacheTelemetry.hit
                ? `Voice Cache HIT (0ms • Hit #${cacheTelemetry.hitCount} • ${cacheTelemetry.savedApiCalls} API calls saved)`
                : `Saved in Memory + localStorage (${cacheTelemetry.totalEntries} entries)`}
            </span>
            <button
              type="button"
              data-testid="clear-voice-cache-btn"
              className="btn btn-secondary"
              style={{ minHeight: '24px', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
              onClick={() => {
                clearVoiceResponseCache();
                setCacheTelemetry({
                  hit: false,
                  hitCount: 0,
                  source: 'cleared',
                  ...getVoiceCacheStats(),
                });
              }}
            >
              Clear Saved Cache
            </button>
          </div>
        )}

        {response?.spoken_reply && (
          <div
            data-testid="spoken-answer-transcript"
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border-default)',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-primary)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>
                Plain-English Answer ({response.language || 'en-IN'})
              </span>
              <button
                type="button"
                data-testid="replay-voice-btn"
                className="btn btn-secondary"
                style={{ minHeight: '26px', padding: '0 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                onClick={() => handlePlayAudio(audioUrl, response.spoken_reply)}
              >
                <SpeakerHigh size={13} weight="fill" />
                <span>Replay Voice</span>
              </button>
            </div>
            <div>{response.spoken_reply}</div>
          </div>
        )}
      </div>

      {/* Matched Code Terms (if voice transcript was cleaned up) */}
      {sttTelemetry && (
        <div
          className="card"
          data-testid="stt-telemetry-card"
          style={{
            padding: '12px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700 }}>
              Voice-to-Code Name Matcher
            </span>
            <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
              Matched ({Math.round((sttTelemetry.confidence || 0.98) * 100)}%)
            </span>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>Understood Question:</strong>{' '}
            <span className="mono-metric" style={{ color: 'var(--text-primary)' }}>
              {sttTelemetry.rescored_transcript}
            </span>
          </div>

          {sttTelemetry.ast_replacements && sttTelemetry.ast_replacements.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {sttTelemetry.ast_replacements.map((rep, idx) => (
                <span
                  key={idx}
                  className="mono-metric"
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'var(--bg-raised)',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  "{rep.spoken}" matched to <strong>{rep.symbol}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Why This Code Matters & Suggested Code Fix */}
      {response?.executed_task && (
        <div
          className="card"
          data-testid="executed-task-card"
          style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            <span
              className="mono-metric"
              style={{ fontWeight: 700, fontSize: '12px', color: 'var(--status-good)' }}
            >
              Why This Code Is Written This Way • {response.executed_task.task_id}
            </span>
            <span className="status-badge status-good" style={{ fontSize: '11px', padding: '1px 8px' }}>
              {response.executed_task.guardrail_status}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
            {response.executed_task.action_taken}
          </p>

          {response.guardrail_rule && (
            <div
              style={{
                fontSize: '13px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--accent-wash)',
                color: 'var(--text-primary)',
                lineHeight: '1.5',
              }}
            >
              <strong>Important Rule to Keep in Mind:</strong> {response.guardrail_rule}
            </div>
          )}

          {response.recommended_patch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Suggested Safe Code Fix:
              </span>
              <pre
                className="code-block"
                style={{
                  margin: 0,
                  padding: '12px',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  background: 'var(--bg-raised)',
                  borderRadius: '8px',
                  overflowX: 'auto',
                }}
              >
                {response.recommended_patch}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Files & Line Numbers Used in the Answer */}
      {response?.referenced_files && response.referenced_files.length > 0 && (
        <div
          className="card"
          data-testid="repo-citations-card"
          style={{
            padding: '16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Files and Line Numbers in {response.repo_full_name || repoContext?.fullName}:
          </span>

          {response.referenced_files.map((cite, idx) => (
            <div
              key={`${cite.file_path}-${idx}`}
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}
              >
                <span className="mono-metric" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
                  {cite.file_path} (Line {cite.line_number})
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: '28px', padding: '0 10px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    selectLocation({
                      file: cite.file_path,
                      line: cite.line_number || 1,
                    });
                    if (!compact) {
                      navigate(
                        `/answers?file=${encodeURIComponent(cite.file_path)}&line=${cite.line_number || 1}`
                      );
                    }
                  }}
                >
                  <FileCode size={13} weight="regular" />
                  <span>Go to Line {cite.line_number}</span>
                </button>
              </div>
              {cite.explanation && (
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  {cite.explanation}
                </p>
              )}
              {cite.snippet && (
                <pre
                  className="code-block"
                  style={{
                    margin: 0,
                    padding: '8px 10px',
                    fontSize: '12px',
                    background: 'var(--bg-surface)',
                    borderRadius: '6px',
                    overflowX: 'auto',
                  }}
                >
                  {cite.snippet}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
