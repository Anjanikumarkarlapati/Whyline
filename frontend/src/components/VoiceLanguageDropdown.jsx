import React, { useEffect, useMemo, useState } from 'react';
import {
  GlobeHemisphereWest,
  SpeakerHigh,
  Waveform,
  Sliders,
  CaretDown,
} from '@phosphor-icons/react';

export const VOICE_LANGUAGE_OPTIONS = [
  {
    code: 'en',
    locale: 'en-IN',
    voice: 'Pranav',
    v3Voice: 'Shivani',
    label: 'English (en-IN)',
    shortLabel: 'English',
    nativeLabel: 'English',
    gender: 'Male',
  },
  {
    code: 'hi',
    locale: 'hi-IN',
    voice: 'Bhavna',
    v3Voice: 'Kalpana',
    label: 'हिंदी / Hindi (hi-IN)',
    shortLabel: 'Hindi (हिंदी)',
    nativeLabel: 'हिंदी',
    gender: 'Female',
  },
  {
    code: 'te',
    locale: 'te-IN',
    voice: 'Suhana',
    v3Voice: 'Avinash',
    label: 'తెలుగు / Telugu (te-IN)',
    shortLabel: 'Telugu (తెలుగు)',
    nativeLabel: 'తెలుగు',
    gender: 'Female',
  },
];

export const GNANI_V3_VOICES = [
  { name: 'Shivani', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Female' },
  { name: 'Avinash', model: 'timbre-v3.0', code: 'te', locale: 'te-IN', language: 'Telugu / Indic', gender: 'Male' },
  { name: 'Kalpana', model: 'timbre-v3.0', code: 'hi', locale: 'hi-IN', language: 'Hindi / Indic', gender: 'Female' },
  { name: 'Lakshmi', model: 'timbre-v3.0', code: 'te', locale: 'te-IN', language: 'Telugu / Indic', gender: 'Female' },
  { name: 'Shubham', model: 'timbre-v3.0', code: 'hi', locale: 'hi-IN', language: 'Hindi / Indic', gender: 'Male' },
  { name: 'Prakash', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Male' },
  { name: 'Devansh', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Male' },
  { name: 'Yashraj', model: 'timbre-v3.0', code: 'hi', locale: 'hi-IN', language: 'Hindi / Indic', gender: 'Male' },
  { name: 'Chetana', model: 'timbre-v3.0', code: 'te', locale: 'te-IN', language: 'Telugu / Indic', gender: 'Female' },
  { name: 'Vasudha', model: 'timbre-v3.0', code: 'hi', locale: 'hi-IN', language: 'Hindi / Indic', gender: 'Female' },
  { name: 'Harshad', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Male' },
  { name: 'Riyaa', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Female' },
  { name: 'Tarika', model: 'timbre-v3.0', code: 'en', locale: 'en-IN', language: 'English / Indic', gender: 'Female' },
];

// Official 42 Timbre v2.5 voices from https://docs.gnani.ai/api/TTS/available-voices
export const GNANI_V2_VOICES = [
  { name: 'Pranav', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Male' },
  { name: 'Kaveri', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Female' },
  { name: 'Trupti', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Female' },
  { name: 'Devika', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Female' },
  { name: 'Shlok', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Male' },
  { name: 'Girish', model: 'timbre-v2.5', code: 'en', locale: 'en-IN', language: 'English', gender: 'Male' },
  { name: 'Bhavna', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Nalini', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Yashvi', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Urmila', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Jwala', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Chitra', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Ambuja', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Female' },
  { name: 'Deepak', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Roopesh', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Vikrant', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Hemraj', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Jalaj', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Omkar', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hindi', gender: 'Male' },
  { name: 'Poorvi', model: 'timbre-v2.5', code: 'hi', locale: 'hi-IN', language: 'Hinglish', gender: 'Female' },
  { name: 'Suhana', model: 'timbre-v2.5', code: 'te', locale: 'te-IN', language: 'Telugu', gender: 'Female' },
  { name: 'Lehara', model: 'timbre-v2.5', code: 'te', locale: 'te-IN', language: 'Telugu', gender: 'Female' },
  { name: 'Lavanya', model: 'timbre-v2.5', code: 'te', locale: 'te-IN', language: 'Telugu', gender: 'Female' },
  { name: 'Yukti', model: 'timbre-v2.5', code: 'te', locale: 'te-IN', language: 'Telugu', gender: 'Female' },
  { name: 'Varuni', model: 'timbre-v2.5', code: 'te', locale: 'te-IN', language: 'Telugu', gender: 'Female' },
  { name: 'Asmita', model: 'timbre-v2.5', code: 'ta', locale: 'ta-IN', language: 'Tamil', gender: 'Female' },
  { name: 'Trisha', model: 'timbre-v2.5', code: 'ta', locale: 'ta-IN', language: 'Tamil', gender: 'Female' },
  { name: 'Brinda', model: 'timbre-v2.5', code: 'ta', locale: 'ta-IN', language: 'Tamil', gender: 'Female' },
  { name: 'Vedika', model: 'timbre-v2.5', code: 'ta', locale: 'ta-IN', language: 'Tamil', gender: 'Female' },
  { name: 'Noopur', model: 'timbre-v2.5', code: 'ta', locale: 'ta-IN', language: 'Tamil', gender: 'Female' },
  { name: 'Saanvi', model: 'timbre-v2.5', code: 'kn', locale: 'kn-IN', language: 'Kannada', gender: 'Female' },
  { name: 'Kavin', model: 'timbre-v2.5', code: 'kn', locale: 'kn-IN', language: 'Kannada', gender: 'Male' },
  { name: 'Reshma', model: 'timbre-v2.5', code: 'ml', locale: 'ml-IN', language: 'Malayalam', gender: 'Female' },
  { name: 'Riyaan', model: 'timbre-v2.5', code: 'ml', locale: 'ml-IN', language: 'Malayalam', gender: 'Male' },
  { name: 'Zahira', model: 'timbre-v2.5', code: 'mr', locale: 'mr-IN', language: 'Marathi', gender: 'Female' },
  { name: 'Ishaan', model: 'timbre-v2.5', code: 'mr', locale: 'mr-IN', language: 'Marathi', gender: 'Male' },
  { name: 'Kirra', model: 'timbre-v2.5', code: 'bn', locale: 'bn-IN', language: 'Bengali', gender: 'Female' },
  { name: 'Dhruva', model: 'timbre-v2.5', code: 'bn', locale: 'bn-IN', language: 'Bengali', gender: 'Male' },
  { name: 'Falak', model: 'timbre-v2.5', code: 'gu', locale: 'gu-IN', language: 'Gujarati', gender: 'Female' },
  { name: 'Veera', model: 'timbre-v2.5', code: 'gu', locale: 'gu-IN', language: 'Gujarati', gender: 'Male' },
  { name: 'Mehuli', model: 'timbre-v2.5', code: 'pa', locale: 'pa-IN', language: 'Punjabi', gender: 'Female' },
  { name: 'Zayan', model: 'timbre-v2.5', code: 'pa', locale: 'pa-IN', language: 'Punjabi', gender: 'Male' },
];

export const GNANI_STT_MODELS = [
  { id: 'prisma-v3.0', label: 'Gnani Prisma v3.0 (Multilingual STT)' },
  { id: 'prisma-v2.5', label: 'Gnani Prisma v2.5 (Fast Indic STT)' },
];

export const VOICE_PROVIDERS = [
  {
    id: 'gnani',
    name: 'Gnani Timbre',
    label: 'Gnani Timbre & Prisma (Live Neural)',
    shortLabel: 'Gnani Voice',
    badge: 'Live Neural',
    tagline: '24kHz Indic Neural TTS & Prisma STT via Vachana',
    icon: Waveform,
  },
];

function formatPersona(entry) {
  return {
    ...entry,
    label: `${entry.name} (${entry.language} • ${entry.gender})`,
    badge: `${entry.locale} • ${entry.gender}`,
  };
}

export const VOICE_PERSONAS = [...GNANI_V3_VOICES, ...GNANI_V2_VOICES].map(formatPersona);

export const NARRATION_PACINGS = [
  {
    id: 'slow',
    rate: 0.8,
    label: 'Slow Paced (0.8x)',
    shortLabel: 'Slow (0.8x)',
    desc: 'Deep focus, learner-friendly cadence',
  },
  {
    id: 'normal',
    rate: 1.0,
    label: 'Normal (1.0x)',
    shortLabel: 'Normal (1.0x)',
    desc: 'Standard professional narration pacing',
  },
  {
    id: 'brisk',
    rate: 1.25,
    label: 'Brisk (1.25x)',
    shortLabel: 'Brisk (1.25x)',
    desc: 'Fast walkthrough for experienced developers',
  },
];

let cachedVoiceCatalog = null;
let voiceCatalogPromise = null;

function buildStaticCatalog() {
  return {
    models: ['timbre-v3.0', 'timbre-v2.5'],
    sttModels: GNANI_STT_MODELS.map((m) => m.id),
    gnaniV3: GNANI_V3_VOICES,
    gnaniV2: GNANI_V2_VOICES,
  };
}

function normalizeFetchedCatalog(payload) {
  const staticCatalog = buildStaticCatalog();
  if (!payload || payload.status !== 'ok') return staticCatalog;

  const mapByName = (list) => new Map(list.map((item) => [item.name.toLowerCase(), item]));
  const staticV3 = mapByName(GNANI_V3_VOICES);
  const staticV2 = mapByName(GNANI_V2_VOICES);

  const fetchedVoices = Array.isArray(payload.voices) ? payload.voices : [];
  const mergedV3 = new Map(staticV3);
  const mergedV2 = new Map(staticV2);

  for (const item of fetchedVoices) {
    const rawName = typeof item === 'string' ? item : item?.name;
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    const model = typeof item === 'object' ? item?.model : null;
    if (model === 'timbre-v3.0' || staticV3.has(key)) {
      const base = staticV3.get(key) || {
        name: rawName,
        model: 'timbre-v3.0',
        code: 'en',
        locale: item?.locale || 'en-IN',
        language: item?.language || 'Indic',
        gender: item?.gender || 'Neutral',
      };
      mergedV3.set(key, { ...base, ...(typeof item === 'object' ? item : {}), name: base.name, model: 'timbre-v3.0' });
    } else if (model === 'timbre-v2.5' || staticV2.has(key)) {
      const base = staticV2.get(key) || {
        name: rawName,
        model: 'timbre-v2.5',
        code: 'en',
        locale: item?.locale || 'en-IN',
        language: item?.language || 'Indic',
        gender: item?.gender || 'Neutral',
      };
      mergedV2.set(key, { ...base, ...(typeof item === 'object' ? item : {}), name: base.name, model: 'timbre-v2.5' });
    }
  }

  return {
    models: Array.isArray(payload.models) && payload.models.length > 0 ? payload.models : ['timbre-v3.0', 'timbre-v2.5'],
    sttModels: Array.isArray(payload.stt_models) && payload.stt_models.length > 0
      ? payload.stt_models.map((m) => (typeof m === 'string' ? m : m.id))
      : GNANI_STT_MODELS.map((m) => m.id),
    gnaniV3: Array.from(mergedV3.values()),
    gnaniV2: Array.from(mergedV2.values()),
  };
}

export function inferModelForVoice(voiceName) {
  const lower = String(voiceName || '').trim().toLowerCase();
  if (GNANI_V3_VOICES.some((v) => v.name.toLowerCase() === lower)) {
    return 'timbre-v3.0';
  }
  return 'timbre-v2.5';
}

export function getDefaultVoice(lang = 'en', _provider = 'gnani', model = null) {
  const norm = lang === 'hi' || lang === 'hi-IN' ? 'hi' : lang === 'te' || lang === 'te-IN' ? 'te' : 'en';
  const opt = VOICE_LANGUAGE_OPTIONS.find((o) => o.code === norm) || VOICE_LANGUAGE_OPTIONS[0];
  return model === 'timbre-v3.0' ? opt.v3Voice : opt.voice;
}

export function encodeFloat32ToWavBase64(chunks, inputSampleRate = 48000, targetSampleRate = 16000) {
  let totalLen = 0;
  for (const ch of chunks) totalLen += ch.length;
  if (!totalLen) return null;
  const merged = new Float32Array(totalLen);
  let offset = 0;
  for (const ch of chunks) {
    merged.set(ch, offset);
    offset += ch.length;
  }
  const ratio = Math.max(1, inputSampleRate / targetSampleRate);
  const outLen = Math.max(1, Math.floor(merged.length / ratio));
  const buffer = new ArrayBuffer(44 + outLen * 2);
  const view = new DataView(buffer);
  const writeStr = (pos, s) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(pos + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + outLen * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, outLen * 2, true);
  for (let i = 0; i < outLen; i += 1) {
    const idx = Math.min(merged.length - 1, Math.floor(i * ratio));
    const clamped = Math.max(-1, Math.min(1, merged[idx]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let bin = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export async function createGnaniMicRecorder() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const zeroGain = ctx.createGain();
  zeroGain.gain.value = 0;
  const chunks = [];
  const startedAt = Date.now();
  processor.onaudioprocess = (ev) => {
    const data = ev.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(data));
  };
  source.connect(processor);
  processor.connect(zeroGain);
  zeroGain.connect(ctx.destination);
  return {
    async stop() {
      const durationMs = Date.now() - startedAt;
      try { processor.disconnect(); } catch {}
      try { zeroGain.disconnect(); } catch {}
      try { source.disconnect(); } catch {}
      stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      const sampleRate = ctx.sampleRate || 48000;
      try { await ctx.close(); } catch {}
      const base64 = encodeFloat32ToWavBase64(chunks, sampleRate, 16000);
      return base64 ? { base64, mimeType: 'audio/wav', durationMs } : null;
    },
    cancel() {
      try { processor.disconnect(); } catch {}
      try { zeroGain.disconnect(); } catch {}
      try { source.disconnect(); } catch {}
      stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      try { ctx.close(); } catch {}
    },
  };
}

export function getAvailableBrowserVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

export function resolveSpeechSynthesisVoice(voiceName, langCode = 'en-IN') {
  const voices = getAvailableBrowserVoices();
  if (!voices.length) return null;

  const targetName = String(voiceName || '').trim().toLowerCase();
  if (targetName) {
    const exact = voices.find(
      (v) =>
        v.name?.toLowerCase() === targetName ||
        v.voiceURI?.toLowerCase() === targetName
    );
    if (exact) return exact;

    const partial = voices.find((v) => v.name?.toLowerCase().includes(targetName));
    if (partial) return partial;
  }

  const normalizedLang = String(langCode || 'en-IN').toLowerCase();
  const baseLang = normalizedLang.split('-')[0];
  return (
    voices.find((v) => v.lang?.toLowerCase() === normalizedLang) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(baseLang)) ||
    voices.find((v) => v.default) ||
    voices[0]
  );
}

/**
 * Browser SpeechSynthesis is disabled; WhyLine uses Gnani Timbre TTS exclusively.
 */
export function speakWithBrowserSpeechSynthesis({ onEnd } = {}) {
  if (onEnd) onEnd();
  return () => {};
}

export function useBrowserVoices() {
  const [browserVoices, setBrowserVoices] = useState(() => getAvailableBrowserVoices());

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    const synth = window.speechSynthesis;

    const refresh = () => {
      setBrowserVoices(getAvailableBrowserVoices());
    };

    refresh();
    if (synth.addEventListener) {
      synth.addEventListener('voiceschanged', refresh);
      return () => synth.removeEventListener('voiceschanged', refresh);
    }

    const prevHandler = synth.onvoiceschanged;
    synth.onvoiceschanged = (...args) => {
      refresh();
      if (typeof prevHandler === 'function') prevHandler(...args);
    };
    return () => {
      if (synth.onvoiceschanged) synth.onvoiceschanged = prevHandler || null;
    };
  }, []);

  return browserVoices;
}

export default function VoiceLanguageDropdown({
  value = 'en',
  onChange,
  provider = 'gnani',
  onProviderChange,
  model = null,
  onModelChange,
  sttModel = 'prisma-v3.0',
  onSttModelChange,
  voice = null,
  onVoiceChange,
  pacing = 1.0,
  onPacingChange,
  id = 'query-voice-lang-select',
  disabled = false,
  compact = false,
  showAllControls = true,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [catalog, setCatalog] = useState(() => cachedVoiceCatalog || buildStaticCatalog());

  useEffect(() => {
    if (cachedVoiceCatalog) {
      setCatalog(cachedVoiceCatalog);
      return undefined;
    }
    if (!voiceCatalogPromise && typeof fetch === 'function') {
      voiceCatalogPromise = fetch('/api/gnani/voices')
        .then((res) => (res.ok ? res.json() : null))
        .then((payload) => {
          const normalized = normalizeFetchedCatalog(payload);
          if (payload?.status === 'ok') {
            cachedVoiceCatalog = normalized;
          } else {
            voiceCatalogPromise = null;
          }
          return normalized;
        })
        .catch(() => {
          voiceCatalogPromise = null;
          return buildStaticCatalog();
        });
    }
    let active = true;
    voiceCatalogPromise?.then((resolved) => {
      if (active && resolved) setCatalog(resolved);
    });
    return () => {
      active = false;
    };
  }, []);

  const normalizedLangCode =
    value === 'hi' || value === 'hi-IN'
      ? 'hi'
      : value === 'te' || value === 'te-IN'
        ? 'te'
        : 'en';

  const activeOption =
    VOICE_LANGUAGE_OPTIONS.find((opt) => opt.code === normalizedLangCode) ||
    VOICE_LANGUAGE_OPTIONS[0];

  const activeProvider = VOICE_PROVIDERS[0];

  const inferredGnaniModel = useMemo(() => {
    if (model === 'timbre-v3.0' || model === 'timbre-v2.5') return model;
    return inferModelForVoice(voice);
  }, [model, voice]);

  const availableVoices = useMemo(
    () => (inferredGnaniModel === 'timbre-v3.0' ? catalog.gnaniV3 : catalog.gnaniV2),
    [catalog, inferredGnaniModel]
  );

  const activePersona = useMemo(() => {
    const vLower = String(voice || '').trim().toLowerCase();
    const matched = availableVoices.find((item) => item.name.toLowerCase() === vLower);
    if (matched) return formatPersona(matched);

    const fallbackName = getDefaultVoice(normalizedLangCode, 'gnani', inferredGnaniModel);
    const fallbackItem =
      availableVoices.find((item) => item.name === fallbackName) || availableVoices[0];
    return formatPersona(
      fallbackItem || {
        name: fallbackName,
        model: inferredGnaniModel,
        code: normalizedLangCode,
        locale: activeOption.locale,
        language: activeOption.shortLabel,
        gender: 'Neutral',
      }
    );
  }, [voice, availableVoices, normalizedLangCode, activeOption, inferredGnaniModel]);

  const activePacing =
    NARRATION_PACINGS.find((p) => Math.abs(p.rate - Number(pacing)) < 0.05) ||
    NARRATION_PACINGS[1];

  const handleLanguageSelect = (e) => {
    const nextCode = e.target.value;
    const found =
      VOICE_LANGUAGE_OPTIONS.find((opt) => opt.code === nextCode) ||
      VOICE_LANGUAGE_OPTIONS[0];

    const nextVoice = inferredGnaniModel === 'timbre-v3.0' ? found.v3Voice : found.voice;

    if (onVoiceChange) {
      onVoiceChange(nextVoice, { model: inferredGnaniModel, provider: 'gnani', fromCascade: true });
    }
    if (onChange) {
      onChange(found.code, { ...found, voice: nextVoice, model: inferredGnaniModel, provider: 'gnani' });
    }
  };

  const handleVoiceSelectChange = (e) => {
    if (disabled) return;
    const chosenName = e.target.value;
    const matched = availableVoices.find((item) => item.name === chosenName) || availableVoices[0];
    if (!matched) return;
    if (onVoiceChange) {
      onVoiceChange(matched.name, matched);
    }
    if (matched.model && onModelChange && matched.model !== inferredGnaniModel) {
      onModelChange(matched.model, matched.name, { fromCascade: true });
    }
  };

  const handleModelSelectChange = (e) => {
    if (disabled) return;
    const nextModel = e.target.value;
    const nextDefaultVoice = getDefaultVoice(normalizedLangCode, 'gnani', nextModel);
    if (onVoiceChange) {
      onVoiceChange(nextDefaultVoice, { model: nextModel, provider: 'gnani', fromCascade: true });
    }
    if (onModelChange) {
      onModelChange(nextModel, nextDefaultVoice);
    }
  };

  const handleProviderSelect = (_providerId) => {
    if (disabled) return;
    const nextModel =
      model === 'timbre-v3.0' || model === 'timbre-v2.5'
        ? model
        : 'timbre-v3.0';
    const nextVoice = getDefaultVoice(normalizedLangCode, 'gnani', nextModel);
    if (onVoiceChange) {
      onVoiceChange(nextVoice, { model: nextModel, provider: 'gnani', fromCascade: true });
    }
    if (onModelChange) {
      onModelChange(nextModel, nextVoice, { fromCascade: true });
    }
    if (onProviderChange) {
      onProviderChange('gnani', { voice: nextVoice, model: nextModel });
    }
  };

  const handlePacingSelect = (rate) => {
    if (disabled) return;
    if (onPacingChange) {
      onPacingChange(rate);
    }
  };

  // Compact inline mode (used in drawer header strip)
  if (compact) {
    return (
      <div
        className="voice-language-dropdown compact"
        data-testid="voice-language-dropdown-wrapper"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px',
          padding: '4px 8px',
        }}
      >
        <GlobeHemisphereWest
          size={14}
          weight="duotone"
          style={{ color: 'var(--accent)', flexShrink: 0 }}
          aria-hidden="true"
        />
        <select
          data-testid="voice-provider-select"
          aria-label="TTS Provider Engine"
          className="form-select"
          value={activeProvider.id}
          disabled={disabled}
          onChange={(e) => handleProviderSelect(e.target.value)}
          style={{
            minHeight: '26px',
            padding: '2px 20px 2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'DM Mono, monospace',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {VOICE_PROVIDERS.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.shortLabel}
            </option>
          ))}
        </select>

        <select
          data-testid="voice-model-select"
          aria-label="Gnani Timbre Model"
          className="form-select"
          value={inferredGnaniModel}
          disabled={disabled}
          onChange={handleModelSelectChange}
          style={{
            minHeight: '26px',
            padding: '2px 20px 2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'DM Mono, monospace',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <option value="timbre-v3.0">timbre-v3.0</option>
          <option value="timbre-v2.5">timbre-v2.5</option>
        </select>

        <select
          data-testid="voice-stt-model-select"
          aria-label="Gnani Prisma STT Model"
          className="form-select"
          value={sttModel}
          disabled={disabled}
          onChange={(e) => onSttModelChange?.(e.target.value)}
          style={{
            minHeight: '26px',
            padding: '2px 20px 2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'DM Mono, monospace',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {GNANI_STT_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>

        <select
          id={id}
          data-testid="voice-language-select"
          aria-label="Voice synthesis output language"
          className="form-select"
          value={normalizedLangCode}
          disabled={disabled}
          onChange={handleLanguageSelect}
          style={{
            minHeight: '26px',
            padding: '2px 20px 2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'DM Mono, monospace',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {VOICE_LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          data-testid="voice-persona-select"
          aria-label="Voice speaker persona"
          className="form-select"
          value={activePersona.name}
          disabled={disabled}
          onChange={handleVoiceSelectChange}
          style={{
            minHeight: '26px',
            maxWidth: '170px',
            padding: '2px 20px 2px 6px',
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'DM Mono, monospace',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {availableVoices.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name} ({item.gender})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      className="voice-model-provider-selector"
      data-testid="voice-model-provider-selector"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '10px 14px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header bar: summary and quick toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '999px',
              background: 'var(--accent-wash)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeakerHigh size={15} weight="fill" aria-hidden="true" />
          </div>
          <div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Voice Model &amp; Provider Engine
            </span>
            <div
              data-testid="voice-active-summary"
              style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                fontFamily: 'DM Mono, monospace',
              }}
            >
              {activeProvider.shortLabel} ({inferredGnaniModel}) • {activePersona.name} ({activeOption.shortLabel}) • {activePacing.rate}x
            </div>
          </div>
        </div>

        {showAllControls && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            style={{
              minHeight: '26px',
              padding: '0 8px',
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              borderRadius: '999px',
            }}
            title="Configure Provider Engine, Persona and Narration Pacing"
          >
            <Sliders size={12} weight="bold" />
            <span>{isExpanded ? 'Collapse Engine Settings' : 'Customize Voice Settings'}</span>
            <CaretDown
              size={11}
              weight="bold"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            />
          </button>
        )}
      </div>

      {/* Primary Selector Row: Provider, Model, Language, Voice Persona, Pacing */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          gap: '10px',
          marginTop: '2px',
        }}
      >
        {/* 1. Provider Engine Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="voice-provider-engine-select"
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            Provider Engine:
          </label>
          <select
            id="voice-provider-engine-select"
            data-testid="voice-provider-select"
            className="form-select"
            value={activeProvider.id}
            disabled={disabled}
            onChange={(e) => handleProviderSelect(e.target.value)}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {VOICE_PROVIDERS.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.shortLabel} ({prov.badge})
              </option>
            ))}
          </select>
        </div>

        {/* 2. Gnani Timbre Model Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="voice-model-select"
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            Timbre Model:
          </label>
          <select
            id="voice-model-select"
            data-testid="voice-model-select"
            className="form-select"
            value={inferredGnaniModel}
            disabled={disabled}
            onChange={handleModelSelectChange}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="timbre-v3.0">
              timbre-v3.0 ({catalog.gnaniV3.length} voices)
            </option>
            <option value="timbre-v2.5">
              timbre-v2.5 ({catalog.gnaniV2.length} voices)
            </option>
          </select>
        </div>

        {/* 3. Output Language Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor={id}
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            Output Language:
          </label>
          <select
            id={id}
            data-testid="voice-language-select"
            className="form-select"
            value={normalizedLangCode}
            disabled={disabled}
            onChange={handleLanguageSelect}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {VOICE_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Voice Persona Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="voice-persona-select"
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            Voice Persona ({availableVoices.length}):
          </label>
          <select
            id="voice-persona-select"
            data-testid="voice-persona-select"
            className="form-select"
            value={activePersona.name}
            disabled={disabled}
            onChange={handleVoiceSelectChange}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {availableVoices.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} ({p.language} • {p.gender})
              </option>
            ))}
          </select>
        </div>

        {/* 5. Narration Pacing Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="narration-pacing-select"
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            Narration Pacing:
          </label>
          <select
            id="narration-pacing-select"
            data-testid="narration-pacing-select"
            className="form-select"
            value={String(activePacing.rate)}
            disabled={disabled}
            onChange={(e) => handlePacingSelect(Number(e.target.value))}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {NARRATION_PACINGS.map((p) => (
              <option key={p.id} value={String(p.rate)}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* 6. Gnani Prisma STT Model Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="voice-stt-model-select"
            className="small-caps"
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}
          >
            STT Model (Mic):
          </label>
          <select
            id="voice-stt-model-select"
            data-testid="voice-stt-model-select"
            className="form-select"
            value={sttModel}
            disabled={disabled}
            onChange={(e) => onSttModelChange?.(e.target.value)}
            style={{
              minHeight: '32px',
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              fontFamily: 'DM Mono, monospace',
              background: 'var(--bg-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {GNANI_STT_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Provider Pill Strip for 1-click switching */}
      <div
        role="radiogroup"
        aria-label="Quick Provider Engine Switcher"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        {VOICE_PROVIDERS.map((prov) => {
          const isSelected = activeProvider.id === prov.id;
          const ProvIcon = prov.icon;
          return (
            <button
              key={prov.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-testid={`provider-option-${prov.id}`}
              disabled={disabled}
              onClick={() => handleProviderSelect(prov.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: isSelected ? 700 : 500,
                borderRadius: '999px',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: isSelected ? 'var(--accent)' : 'var(--bg-raised)',
                color: isSelected ? 'var(--on-accent)' : 'var(--text-secondary)',
                transition: 'background 120ms ease, color 120ms ease',
                whiteSpace: 'nowrap',
              }}
              title={prov.label}
            >
              <ProvIcon size={12} weight={isSelected ? 'fill' : 'regular'} />
              <span>{prov.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Expanded Engine Details & Specs Drawer */}
      {isExpanded && (
        <div
          data-testid="voice-engine-details"
          style={{
            marginTop: '4px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'var(--bg-raised)',
            border: '1px dashed var(--border-strong)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Engine Specification &amp; Audio Routing
            </span>
            <span
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--accent-wash)',
                color: 'var(--accent)',
                fontWeight: 600,
              }}
            >
              Endpoint: Gnani {inferredGnaniModel} + {sttModel} -&gt; 24kHz PCM WAV
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', color: 'var(--text-secondary)' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Current Provider:</strong> {activeProvider.label}
              <div style={{ fontSize: '10px' }}>{activeProvider.tagline}</div>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Active Persona:</strong> {activePersona.name} ({activePersona.locale})
              <div style={{ fontSize: '10px' }}>Model: {activePersona.model} • {activePersona.gender}</div>
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Cadence:</strong> {activePacing.label}
              <div style={{ fontSize: '10px' }}>{activePacing.desc}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
