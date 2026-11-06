/**
 * Two-Tier (In-Memory LRU + localStorage) Cache for Synthesized Voice & Gemini Brain Responses.
 * Prevents redundant STT / Gemini Brain / TTS API calls when a user repeats a query
 * or toggles back to a previously synthesized language (English, Hindi, Telugu).
 */

const STORAGE_KEY = 'whyline-voice-response-cache-v1';
const MAX_CACHE_ENTRIES = 50;

const memoryCache = new Map();
let stats = {
  hits: 0,
  misses: 0,
  savedApiCalls: 0,
};

function normalizeLangLocale(language = 'en-IN') {
  const raw = String(language || '').toLowerCase().trim();
  if (raw.startsWith('hi')) return 'hi-IN';
  if (raw.startsWith('te')) return 'te-IN';
  return 'en-IN';
}

function normalizeQuestionText(question = '') {
  return String(question || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeRepoName(repoFullName = '') {
  return (
    String(repoFullName || 'HealthConnect/payment-gateway-v1')
      .trim()
      .toLowerCase() || 'healthconnect/payment-gateway-v1'
  );
}

/**
 * Builds a deterministic cache key for a given repository, question, and output language.
 */
export function buildVoiceCacheKey({
  repoFullName = 'HealthConnect/payment-gateway-v1',
  question = '',
  language = 'en-IN',
} = {}) {
  const repo = normalizeRepoName(repoFullName);
  const lang = normalizeLangLocale(language);
  const q = normalizeQuestionText(question);
  return `${repo}::${lang}::${q}`;
}

function readLocalStorageMap() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

function writeLocalStorageMap(entriesObj) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesObj));
    }
  } catch {
    // Ignore quota or storage write errors
  }
}

function syncMemoryToLocalStorage() {
  const obj = {};
  for (const [k, v] of memoryCache.entries()) {
    obj[k] = v;
  }
  writeLocalStorageMap(obj);
}

/**
 * Hydrates the in-memory cache from localStorage if not already populated.
 */
function ensureHydrated() {
  if (memoryCache.size > 0) return;
  const stored = readLocalStorageMap();
  for (const [key, val] of Object.entries(stored)) {
    if (val && typeof val === 'object' && val.response) {
      memoryCache.set(key, val);
    }
  }
}

/**
 * Looks up a cached synthesized voice & Gemini Brain response.
 * Returns null on cache miss, or the cached entry metadata on hit.
 */
export function getCachedVoiceResponse({
  repoFullName = 'HealthConnect/payment-gateway-v1',
  question = '',
  language = 'en-IN',
} = {}) {
  const qNorm = normalizeQuestionText(question);
  if (!qNorm) return null;

  ensureHydrated();
  const key = buildVoiceCacheKey({ repoFullName, question, language });

  if (memoryCache.has(key)) {
    const existing = memoryCache.get(key);
    // LRU refresh
    memoryCache.delete(key);
    const updated = {
      ...existing,
      hitCount: (existing.hitCount || 0) + 1,
      lastAccessedAt: Date.now(),
    };
    memoryCache.set(key, updated);
    syncMemoryToLocalStorage();

    stats.hits += 1;
    stats.savedApiCalls += 2; // Saves both /api/gnani/stt and /api/copilot/ask calls

    return {
      hit: true,
      key,
      source: existing.fromStorage ? 'localStorage+memory' : 'memory',
      hitCount: updated.hitCount,
      cachedAt: updated.cachedAt,
      ageMs: Math.max(0, Date.now() - (updated.cachedAt || Date.now())),
      response: updated.response,
      sttTelemetry: updated.sttTelemetry,
      audioUrl: updated.audioUrl,
      spokenReply: updated.spokenReply,
      language: updated.language,
    };
  }

  stats.misses += 1;
  return null;
}

/**
 * Stores a synthesized voice & Gemini Brain response in both in-memory LRU and localStorage.
 */
export function setCachedVoiceResponse(
  {
    repoFullName = 'HealthConnect/payment-gateway-v1',
    question = '',
    language = 'en-IN',
    voice = 'Pranav',
  } = {},
  { response, sttTelemetry } = {}
) {
  const qNorm = normalizeQuestionText(question);
  if (!qNorm || !response) return null;

  ensureHydrated();
  const langLocale = normalizeLangLocale(language);
  const key = buildVoiceCacheKey({ repoFullName, question, language: langLocale });

  const entry = {
    key,
    repoFullName: normalizeRepoName(repoFullName),
    question: String(question).trim(),
    language: langLocale,
    voice,
    audioUrl: response.audio_url || '/api/audio/fence-001.wav',
    spokenReply: response.spoken_reply || response.spoken_answer || '',
    response,
    sttTelemetry: sttTelemetry || response.stt_telemetry || null,
    cachedAt: Date.now(),
    lastAccessedAt: Date.now(),
    hitCount: 0,
  };

  if (memoryCache.has(key)) {
    memoryCache.delete(key);
  } else if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }

  memoryCache.set(key, entry);

  // Also index under the rescored transcript if different from raw question
  const rescoredQ = sttTelemetry?.rescored_transcript || response?.question;
  if (rescoredQ && normalizeQuestionText(rescoredQ) !== qNorm) {
    const rescoredKey = buildVoiceCacheKey({
      repoFullName,
      question: rescoredQ,
      language: langLocale,
    });
    memoryCache.set(rescoredKey, { ...entry, key: rescoredKey });
  }

  syncMemoryToLocalStorage();
  return entry;
}

/**
 * Returns live cache telemetry statistics.
 */
export function getVoiceCacheStats() {
  ensureHydrated();
  return {
    totalEntries: memoryCache.size,
    hits: stats.hits,
    misses: stats.misses,
    savedApiCalls: stats.savedApiCalls,
  };
}

/**
 * Clears both the in-memory LRU cache and the localStorage persisted cache.
 */
export function clearVoiceResponseCache() {
  memoryCache.clear();
  stats = { hits: 0, misses: 0, savedApiCalls: 0 };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage error
  }
}
