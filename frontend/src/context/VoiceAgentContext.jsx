import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { VOICE_AGENTS, getDefaultVoiceForLang } from '../config/voiceAgents';

const STORAGE_KEY = 'whyline_voice_agent';
const FIRST_RUN_KEY = 'whyline_voice_picker_seen';

const VoiceAgentContext = createContext(null);

export function VoiceAgentProvider({ children }) {
  const [selectedId, setSelectedId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && VOICE_AGENTS.some((a) => a.id === saved)) return saved;
    } catch {
      // ignore storage errors
    }
    return VOICE_AGENTS[0].id;
  });

  const [firstRunOpen, setFirstRunOpen] = useState(() => {
    try {
      return !localStorage.getItem(FIRST_RUN_KEY);
    } catch {
      return false;
    }
  });

  const [previewingId, setPreviewingId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const selectedAgent = useMemo(
    () => VOICE_AGENTS.find((a) => a.id === selectedId) || VOICE_AGENTS[0],
    [selectedId]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, selectedAgent.id);
      localStorage.setItem('whyline_voice_name', selectedAgent.voiceName);
      localStorage.setItem('whyline_voice_model', selectedAgent.model);
    } catch {
      // ignore storage errors
    }
  }, [selectedAgent]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setPreviewingId(null);
    setIsSpeaking(false);
  }, []);

  const speakWithAgent = useCallback(
    async (text, agentOverride = null, { isPreview = false } = {}) => {
      const agent = agentOverride || selectedAgent;
      const content = String(text || '').trim();
      if (!content || !agent) return false;

      stopSpeaking();
      if (isPreview) setPreviewingId(agent.id);
      else setIsSpeaking(true);

      try {
        const res = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: content,
            voice: agent.voiceName,
            model: agent.model,
            language: agent.locale,
            lang: agent.language,
            provider: 'gnani',
          }),
        });
        if (!res.ok) throw new Error('Gnani TTS unavailable');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
          setPreviewingId(null);
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (audioRef.current === audio) audioRef.current = null;
          setPreviewingId(null);
          setIsSpeaking(false);
        };

        await audio.play();
        return true;
      } catch {
        setPreviewingId(null);
        setIsSpeaking(false);
        return false;
      }
    },
    [selectedAgent, stopSpeaking]
  );

  const selectAgent = useCallback((id) => {
    const found = VOICE_AGENTS.find((a) => a.id === id);
    if (!found) return;
    setSelectedId(found.id);
    try {
      localStorage.setItem(FIRST_RUN_KEY, '1');
    } catch {
      // ignore
    }
    setFirstRunOpen(false);
  }, []);

  const previewAgent = useCallback(
    (agent) => {
      if (!agent) return Promise.resolve(false);
      if (previewingId === agent.id) {
        stopSpeaking();
        return Promise.resolve(true);
      }
      return speakWithAgent(agent.sampleText, agent, { isPreview: true });
    },
    [previewingId, speakWithAgent, stopSpeaking]
  );

  const dismissFirstRun = useCallback(() => {
    try {
      localStorage.setItem(FIRST_RUN_KEY, '1');
    } catch {
      // ignore
    }
    setFirstRunOpen(false);
  }, []);

  const openFirstRun = useCallback(() => setFirstRunOpen(true), []);

  const value = useMemo(
    () => ({
      agents: VOICE_AGENTS,
      selectedAgent,
      selectAgent,
      previewAgent,
      previewingId,
      speakText: (text) => speakWithAgent(text, selectedAgent, { isPreview: false }),
      stopSpeaking,
      isSpeaking,
      firstRunOpen,
      dismissFirstRun,
      openFirstRun,
      getDefaultForLanguage: getDefaultVoiceForLang,
    }),
    [
      selectedAgent,
      selectAgent,
      previewAgent,
      previewingId,
      speakWithAgent,
      stopSpeaking,
      isSpeaking,
      firstRunOpen,
      dismissFirstRun,
      openFirstRun,
    ]
  );

  return <VoiceAgentContext.Provider value={value}>{children}</VoiceAgentContext.Provider>;
}

export function useVoiceAgent() {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error('useVoiceAgent must be used inside VoiceAgentProvider');
  }
  return ctx;
}
