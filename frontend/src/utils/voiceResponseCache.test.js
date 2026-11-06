import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVoiceCacheKey,
  getCachedVoiceResponse,
  setCachedVoiceResponse,
  getVoiceCacheStats,
  clearVoiceResponseCache,
} from './voiceResponseCache.js';

test('buildVoiceCacheKey normalizes repository name, language locale, and whitespace', () => {
  const k1 = buildVoiceCacheKey({
    repoFullName: 'Sindresorhus/Ky',
    question: '  How does   Ky clone request? ',
    language: 'en',
  });
  const k2 = buildVoiceCacheKey({
    repoFullName: 'sindresorhus/ky',
    question: 'how does ky clone request?',
    language: 'en-IN',
  });
  assert.equal(k1, k2);
  assert.equal(k1, 'sindresorhus/ky::en-IN::how does ky clone request?');
});

test('voiceResponseCache stores, retrieves, tracks hits, and isolates languages', () => {
  clearVoiceResponseCache();

  const queryParamsEn = {
    repoFullName: 'expressjs/express',
    question: 'How does app.use mount middleware?',
    language: 'en-IN',
    voice: 'Pranav',
  };

  // 1. Initial lookup should be a miss
  const miss = getCachedVoiceResponse(queryParamsEn);
  assert.equal(miss, null);

  // 2. Store English synthesized response
  const mockResponseEn = {
    question: 'How does app.use mount middleware?',
    language: 'en-IN',
    spoken_reply: 'In expressjs/express, app.use mounts middleware in lib/application.js.',
    audio_url: '/api/audio/copilot_english_3b6737bf.wav',
  };
  setCachedVoiceResponse(queryParamsEn, {
    response: mockResponseEn,
    sttTelemetry: { rescored_transcript: 'How does app.use mount middleware in application.js?' },
  });

  // 3. Repeat same query in English -> Cache HIT
  const hitEn = getCachedVoiceResponse(queryParamsEn);
  assert.ok(hitEn);
  assert.equal(hitEn.hit, true);
  assert.equal(hitEn.hitCount, 1);
  assert.equal(hitEn.audioUrl, '/api/audio/copilot_english_3b6737bf.wav');
  assert.equal(hitEn.spokenReply, mockResponseEn.spoken_reply);

  // 4. Lookup under rescored transcript -> Also a Cache HIT
  const hitRescored = getCachedVoiceResponse({
    repoFullName: 'expressjs/express',
    question: 'How does app.use mount middleware in application.js?',
    language: 'en-IN',
  });
  assert.ok(hitRescored);
  assert.equal(hitRescored.hit, true);

  // 5. Same query in Telugu ('te-IN') -> Cache MISS (language isolation)
  const missTe = getCachedVoiceResponse({
    repoFullName: 'expressjs/express',
    question: 'How does app.use mount middleware?',
    language: 'te-IN',
  });
  assert.equal(missTe, null);

  const stats = getVoiceCacheStats();
  assert.ok(stats.hits >= 2);
  assert.ok(stats.savedApiCalls >= 4);

  clearVoiceResponseCache();
  assert.equal(getVoiceCacheStats().totalEntries, 0);
});
