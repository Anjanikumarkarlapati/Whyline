import {
  INITIAL_FENCES,
  INITIAL_SCORECARD,
  INITIAL_INCIDENTS,
  INITIAL_CHECKPOINTS,
  INITIAL_ASSUMPTIONS,
  JUNIT_INVARIANT_SOURCE,
} from './mockData';
import {
  rescoreSpokenTranscriptWithAst,
  doesDiffIntersectFence,
  doesFilePathMatchFence,
  computeAstAnomalyHash,
  validateGitScanInput,
} from '../utils/fenceLogic';
import {
  buildReasonedCodebaseExplanation,
  getStepSimpleExplanationAndExample,
} from '../utils/codebaseReasoning';

// Helper to create playable 16kHz speech-cadence harmonic formant WAV audio blobs in browser memory
export function createWavBlob(durationSeconds = 1.4, frequency = 210, lang = 'en-IN', stepIndex = 1) {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const l = String(lang || 'en-IN').toLowerCase();
  const baseF0 = l.startsWith('te') ? 215 : l.startsWith('hi') ? 198 : frequency || 185;
  const cadenceHz = l.startsWith('te') ? 5.2 : l.startsWith('hi') ? 4.6 : 4.1;
  const stepOffset = ((Number(stepIndex) || 1) - 1) * 11;

  // "RIFF"
  view.setUint32(0, 0x52494646, false);
  view.setUint32(4, 36 + numSamples * 2, true);
  // "WAVE"
  view.setUint32(8, 0x57415645, false);
  // "fmt " chunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit
  // "data" chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Smooth fade-in and fade-out envelope + multi-syllable speech cadence modulation
    const edgeEnv = Math.min(1, t / 0.06) * Math.min(1, (durationSeconds - t) / 0.12);
    const syllableEnv = 0.55 + 0.45 * Math.sin(2 * Math.PI * cadenceHz * t);
    const f0 = baseF0 + stepOffset + 12 * Math.sin(2 * Math.PI * 1.8 * t);
    const f1 = f0 * 2.4;
    const f2 = f0 * 4.1;
    const sample =
      edgeEnv *
      syllableEnv *
      0.38 *
      (Math.sin(2 * Math.PI * f0 * t) +
        0.5 * Math.sin(2 * Math.PI * f1 * t) +
        0.25 * Math.sin(2 * Math.PI * f2 * t));
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function parsePublicRepoInput(rawUrlOrPath = '') {
  const trimmed = String(rawUrlOrPath || '').trim();
  const ghMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (ghMatch) {
    const owner = ghMatch[1];
    const repo = ghMatch[2].replace(/\.git$/i, '');
    return {
      repo_name: repo,
      repo_slug: `${owner}/${repo}`,
      github_url: `https://github.com/${owner}/${repo}`,
      is_whyline_repo: /whyline/i.test(repo) && !/clinical-dicom/i.test(repo),
      is_dicom_repo: /dicom/i.test(repo),
    };
  }
  if (/whyline/i.test(trimmed) && !/clinical-dicom/i.test(trimmed)) {
    return {
      repo_name: 'Whyline',
      repo_slug: 'Anjanikumarkarlapati/Whyline',
      github_url: 'https://github.com/Anjanikumarkarlapati/Whyline',
      is_whyline_repo: true,
      is_dicom_repo: false,
    };
  }
  return {
    repo_name: 'HealthConnect',
    repo_slug: 'healthconnect-india/payment-gateway-service',
    github_url: 'https://github.com/healthconnect-india/payment-gateway-service',
    is_whyline_repo: false,
    is_dicom_repo: false,
  };
}

const STORAGE_KEYS = {
  FENCES: 'whyline_fences',
  SCORECARD: 'whyline_scorecard',
  INCIDENTS: 'whyline_incidents',
  CHECKPOINTS: 'whyline_checkpoints',
  ASSUMPTIONS: 'whyline_assumptions',
  GATEWAY_VERSION: 'whyline_gateway_version',
};

function getStored(key, defaultValue) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStored(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota
  }
}

let fences = getStored(STORAGE_KEYS.FENCES, INITIAL_FENCES);
let scorecard = getStored(STORAGE_KEYS.SCORECARD, INITIAL_SCORECARD);
let incidents = getStored(STORAGE_KEYS.INCIDENTS, INITIAL_INCIDENTS);
let checkpoints = getStored(STORAGE_KEYS.CHECKPOINTS, INITIAL_CHECKPOINTS);
let assumptions = getStored(STORAGE_KEYS.ASSUMPTIONS, INITIAL_ASSUMPTIONS);
let gatewayVersion = getStored(STORAGE_KEYS.GATEWAY_VERSION, 'v1');

function recalculateScorecard(currentFences) {
  const verifiedCount = currentFences.filter((f) => f.status === 'VERIFIED_ACTIVE').length;
  const historicalCount = currentFences.filter((f) => f.status === 'UNVERIFIED_HISTORICAL').length;

  const updated = {
    ...scorecard,
    measured_at: new Date().toISOString(),
    total_seeded_anomalies: currentFences.length,
    hard_blocked_edits: verifiedCount,
    cautionary_historical_intercepts: historicalCount,
    total_intercepted_agent_breaks: verifiedCount + historicalCount,
    prevention_rate_label: `${verifiedCount + historicalCount} / ${currentFences.length} Protected (${verifiedCount} Hard Rejects, ${historicalCount} Historical Cautions)`,
  };
  scorecard = updated;
  setStored(STORAGE_KEYS.SCORECARD, updated);
  return updated;
}

export function getLocalizedStrategies(lang) {
  const l = String(lang || 'en-IN').toLowerCase();
  if (l.startsWith('te')) {
    return [
      {
        rank: 1,
        title: '5x రీట్రై ఫ్రేమ్‌లో డెటర్మినిస్టిక్ X-Idempotency-Key జోడించండి',
        summary:
          '`orderId` మరియు సెటిల్‌మెంట్ విండో నుండి SHA-256 ఇడెంపొటెన్సీ కీని రూపొందించి `sendV1Frame()` కు పంపండి. `retryCount = 5` ను అలాగే ఉంచుతూ డబుల్-ఛార్జ్‌లను నివారిస్తుంది.',
        description:
          '`orderId` మరియు సెటిల్‌మెంట్ విండో నుండి SHA-256 ఇడెంపొటెన్సీ కీని రూపొందించి `sendV1Frame()` కు పంపండి. `retryCount = 5` ను అలాగే ఉంచుతూ డబుల్-ఛార్జ్‌లను నివారిస్తుంది.',
        why_safe: 'FENCE-001 రీట్రై నియమాన్ని కాపాడుతూ ఒకేసారి పేమెంట్ జరిగేలా చూస్తుంది.',
        uncertainty_note: 'upstream v1 గేట్‌వే X-Idempotency-Key హెడర్‌ను అంగీకరిస్తుందని నిర్ధారించుకోండి.',
        status_tone: 'GOOD',
        tone: 'GOOD',
        provenance_badge: 'PR #212 అనుకూలం • ఇన్‌వేరియంట్ పరీక్షించబడింది',
        tradeoffs: 'ఎలాంటి లేటెన్సీ పెరుగుదల లేదు; PR #212 మిడ్‌నైట్ ప్యాకెట్ డ్రాప్‌ల నుండి పూర్తిగా సురక్షితం.',
        code_patch: `// Add deterministic idempotency header inside dispatchSettlement\nString idempotencyKey = "settle_" + orderId + "_" + (System.currentTimeMillis() / 900000);\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    if (sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey)) {\n        return new PaymentReceipt(orderId, "SETTLED", attempt);\n    }\n}`,
      },
      {
        rank: 2,
        title: 'అవుట్‌బాక్స్ స్టేట్ మెషీన్‌తో టూ-ఫేజ్ కమిట్',
        summary:
          '`GatewayRouter` ను పిలవడానికి ముందే డేటాబేస్‌లో పెండింగ్ సెటిల్‌మెంట్ రికార్డును సేవ్ చేయండి, తద్వారా డూప్లికేట్ అభ్యర్థనలను DB స్థాయిలోనే నిరోధించవచ్చు.',
        description:
          '`GatewayRouter` ను పిలవడానికి ముందే డేటాబేస్‌లో పెండింగ్ సెటిల్‌మెంట్ రికార్డును సేవ్ చేయండి.',
        why_safe: 'INC-9921 లో నమోదు చేసిన మిడ్‌నైట్ రీట్రై నియమానికి అనుగుణంగా ఉంటుంది.',
        uncertainty_note: 'కొత్త SQL మైగ్రేషన్ అవసరం.',
        status_tone: 'WARN_AND_REQUIRE_CONFIRMATION',
        tone: 'WARN',
        provenance_badge: 'జాగ్రత్త సూచన • PR #212 ADR',
        tradeoffs: 'బాహ్య నెట్‌వర్క్ కాల్‌కు ముందు అదనపు DB రైట్ అవసరం.',
        code_patch: `// Two-phase commit ledger write\nPaymentLedger.recordPending(orderId, amountPaise);\nreturn gatewayRouter.dispatchSettlement(orderId, amountPaise);`,
      },
      {
        rank: 3,
        title: 'application.yml లో gateway.version ను v2 కి అప్‌గ్రేడ్ చేయండి',
        summary:
          '`gateway.version` ను `v2` కి మార్చడం ద్వారా FENCE-001 ఆటోమేటిక్‌గా గడువు ముగుస్తుంది మరియు ప్యాకెట్ డ్రాప్ లేని కొత్త Razorpay v2 ఎడ్జ్‌కి మారుతుంది.',
        description:
          '`gateway.version` ను `v2` కి మార్చడం ద్వారా FENCE-001 ఆటోమేటిక్‌గా గడువు ముగుస్తుంది.',
        why_safe: 'v2 క్లస్టర్ సిద్ధంగా ఉంటే లెగసీ వర్క్‌అరౌండ్ అవసరం ఉండదు.',
        uncertainty_note: 'ఆపరేషన్స్ టీమ్‌తో v2 క్లస్టర్ హెల్త్‌ను ధృవీకరించాలి.',
        status_tone: 'INFO',
        tone: 'DANGER',
        provenance_badge: 'ఆర్కిటెక్చర్ కౌన్సిల్ వ్యూహం',
        tradeoffs: 'ఆపరేషన్స్ టీమ్‌తో v2 క్లస్టర్ హెల్త్‌ను ధృవీకరించడం అవసరం.',
        code_patch: `healthconnect:\n  payment:\n    gateway:\n      version: "v2"`,
      },
    ];
  }

  if (l.startsWith('hi')) {
    return [
      {
        rank: 1,
        title: '5x रीट्राई फ्रेम के भीतर नियतात्मक X-Idempotency-Key जोड़ें',
        summary:
          '`orderId` और सेटलमेंट विंडो से SHA-256 इडेम्पोटेंसी कुंजी बनाएँ और इसे `sendV1Frame()` में पास करें। यह `retryCount = 5` को सुरक्षित रखते हुए डबल-चार्ज को रोकता है।',
        description:
          '`orderId` और सेटलमेंट विंडो से SHA-256 इडेम्पोटेंसी कुंजी बनाएँ और इसे `sendV1Frame()` में पास करें।',
        why_safe: 'FENCE-001 रीट्राई नियम को बनाए रखते हुए केवल एक बार भुगतान सुनिश्चित करता है।',
        uncertainty_note: 'सुनिश्चित करें कि अपस्ट्रीम v1 गेटवे X-Idempotency-Key हेडर स्वीकार करता है।',
        status_tone: 'GOOD',
        tone: 'GOOD',
        provenance_badge: 'PR #212 संगत • इनवेरिएंट परीक्षित',
        tradeoffs: 'शून्य विलंबता दंड; PR #212 मिडनाइट पैकेट ड्रॉप से पूरी तरह सुरक्षित।',
        code_patch: `// Add deterministic idempotency header inside dispatchSettlement\nString idempotencyKey = "settle_" + orderId + "_" + (System.currentTimeMillis() / 900000);\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    if (sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey)) {\n        return new PaymentReceipt(orderId, "SETTLED", attempt);\n    }\n}`,
      },
      {
        rank: 2,
        title: 'आउटबॉक्स स्टेट मशीन के साथ टू-फेज कमिट',
        summary:
          '`GatewayRouter` को कॉल करने से पहले डेटाबेस में एक लंबित सेटलमेंट रिकॉर्ड सहेजें, जिससे डेटाबेस स्तर पर ही डुप्लिकेट डेबिट रुक जाए।',
        description:
          '`GatewayRouter` को कॉल करने से पहले डेटाबेस में एक लंबित सेटलमेंट रिकॉर्ड सहेजें।',
        why_safe: 'INC-9921 में प्रलेखित मिडनाइट बर्स्ट शमन के अनुरूप है।',
        uncertainty_note: 'नए SQL माइग्रेशन की आवश्यकता है।',
        status_tone: 'WARN_AND_REQUIRE_CONFIRMATION',
        tone: 'WARN',
        provenance_badge: 'सावधानी इंटरसेप्ट • PR #212 ADR',
        tradeoffs: 'बाहरी नेटवर्क कॉल से पहले नए SQL माइग्रेशन और DB राइट की आवश्यकता है।',
        code_patch: `// Two-phase commit ledger write\nPaymentLedger.recordPending(orderId, amountPaise);\nreturn gatewayRouter.dispatchSettlement(orderId, amountPaise);`,
      },
      {
        rank: 3,
        title: 'application.yml में gateway.version को v2 में अपग्रेड करें',
        summary:
          '`gateway.version` को `v2` करने से FENCE-001 सुरक्षित रूप से समाप्त हो जाता है और नया Razorpay v2 एज सक्रिय हो जाता है।',
        description:
          '`gateway.version` को `v2` करने से FENCE-001 सुरक्षित रूप से समाप्त हो जाता है।',
        why_safe: 'एक बार v2 लाइव होने पर लेगसी रीट्राई वर्कअराउंड की आवश्यकता नहीं रहती।',
        uncertainty_note: 'ऑपरेशंस टीम के साथ v2 क्लस्टर स्वास्थ्य की पुष्टि करें।',
        status_tone: 'INFO',
        tone: 'DANGER',
        provenance_badge: 'आर्किटेक्चर काउंसिल रणनीति',
        tradeoffs: 'ऑपरेशंस टीम के साथ v2 क्लस्टर स्वास्थ्य की पुष्टि करना आवश्यक है।',
        code_patch: `healthconnect:\n  payment:\n    gateway:\n      version: "v2"`,
      },
    ];
  }

  return [
    {
      rank: 1,
      title: 'Inject Deterministic X-Idempotency-Key Inside 5x Retry Frame',
      summary:
        'Generate a SHA-256 idempotency key derived from `orderId` + settlement window and forward it into `sendV1Frame()`. Keeps `retryCount = 5` intact while preventing double charges on the payment edge.',
      description:
        'Generate a SHA-256 idempotency key derived from `orderId` + settlement window and forward it into `sendV1Frame()`. Keeps `retryCount = 5` intact while preventing double charges on the payment edge.',
      why_safe: 'Preserves FENCE-001 retry invariant while guaranteeing at-most-once settlement.',
      uncertainty_note: 'Verify upstream gateway v1 honors X-Idempotency-Key header.',
      status_tone: 'GOOD',
      tone: 'GOOD',
      provenance_badge: 'PR #212 Compatible • Invariant Tested',
      tradeoffs: 'Zero latency penalty; completely safe against PR #212 midnight drops.',
      code_patch: `// Add deterministic idempotency header inside dispatchSettlement\nString idempotencyKey = "settle_" + orderId + "_" + (System.currentTimeMillis() / 900000);\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    if (sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey)) {\n        return new PaymentReceipt(orderId, "SETTLED", attempt);\n    }\n}`,
    },
    {
      rank: 2,
      title: 'Two-Phase Commit with Outbox State Machine',
      summary:
        'Persist an unconfirmed settlement ledger record before invoking `GatewayRouter`, resolving idempotency at the database row level.',
      description:
        'Persist an unconfirmed settlement ledger record before invoking `GatewayRouter`, resolving idempotency at the database row level.',
      why_safe: 'Conforms to midnight burst mitigation documented in INC-9921.',
      uncertainty_note: 'Requires new SQL migration.',
      status_tone: 'WARN_AND_REQUIRE_CONFIRMATION',
      tone: 'WARN',
      provenance_badge: 'Cautionary Intercept • PR #212 ADR',
      tradeoffs: 'Requires new SQL migration and DB write before external network call.',
      code_patch: `// Two-phase commit ledger write\nPaymentLedger.recordPending(orderId, amountPaise);\nreturn gatewayRouter.dispatchSettlement(orderId, amountPaise);`,
    },
    {
      rank: 3,
      title: 'Upgrade application.yml gateway.version to v2',
      summary:
        'Bump `gateway.version` to `v2`, triggering automatic expiry of FENCE-001 and switching to the new non-dropping Razorpay edge.',
      description:
        'Bump `gateway.version` to `v2`, triggering automatic expiry of FENCE-001 and switching to the new non-dropping Razorpay edge.',
      why_safe: 'Eliminates legacy workaround once v2 infrastructure is verified.',
      uncertainty_note: 'Requires verifying v2 cluster health with operations team.',
      status_tone: 'INFO',
      tone: 'DANGER',
      provenance_badge: 'Architecture Council Strategy',
      tradeoffs: 'Requires verifying v2 cluster health with operations team.',
      code_patch: `healthconnect:\n  payment:\n    gateway:\n      version: "v2"`,
    },
  ];
}

const nativeFetch =
  typeof window !== 'undefined' && typeof window.fetch === 'function'
    ? window.fetch.bind(window)
    : typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : async () => new Response('{}', { status: 200 });

export async function apiFetch(input, init = {}) {
  const url = typeof input === 'string' ? input : input?.url || '';
  const method = (init?.method || 'GET').toUpperCase();

  const apiPathMatch = url.match(/(?:\/api\/|\/api$)(.*)/);
  if (!apiPathMatch) {
    return nativeFetch(input, init);
  }

    const fullPath = apiPathMatch[1];
    const pathWithoutQuery = fullPath.split('?')[0].replace(/\/+$/, '');
    const queryParams = new URLSearchParams(fullPath.includes('?') ? fullPath.split('?')[1] : '');

    let body = {};
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        // Plain text
      }
    }

    // 1. GET /api/briefing
    if (pathWithoutQuery === 'briefing' && method === 'GET') {
      const verified = fences.filter((f) => f.status === 'VERIFIED_ACTIVE').length;
      const pending = fences.filter((f) => f.status === 'PENDING_CONFIRMATION').length;
      const historical = fences.filter((f) => f.status === 'UNVERIFIED_HISTORICAL').length;
      const expired = fences.filter((f) => f.status === 'EXPIRED_SAFE_TO_REMOVE').length;

      const responseData = {
        repo_name: 'HealthConnect',
        updated_at: new Date().toISOString(),
        gateway_version: gatewayVersion,
        kpis: {
          total_fences: fences.length,
          verified_active: verified,
          pending_confirmations: pending,
          unverified_historical: historical,
          expired_safe_to_remove: expired,
          intercepted_agent_breaks: scorecard.total_intercepted_agent_breaks || 10,
          live_intercept_events: scorecard.live_intercept_events || 2,
        },
        scorecard,
        pending_fences: fences.filter((f) => f.status === 'PENDING_CONFIRMATION'),
        fences,
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. GET /api/fences
    if (pathWithoutQuery === 'fences' && method === 'GET') {
      return new Response(
        JSON.stringify({
          fences,
          gateway_version: gatewayVersion,
          junit_invariant_source: JUNIT_INVARIANT_SOURCE,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2b. POST /api/fences (Create & Link New Spoken Fence to an AST Node)
    if (pathWithoutQuery === 'fences' && method === 'POST') {
      const nextNum = fences.length + 1;
      const newFenceId = body.id || `FENCE-${String(nextNum).padStart(3, '0')}`;
      const lang = body.language || 'en-IN';
      const rawTranscript =
        body.transcript_text ||
        'Preserve custom AST node constraint until configuration cutover.';
      const sttRes = rescoreSpokenTranscriptWithAst(rawTranscript);

      const filePath =
        body.file_path || 'src/main/java/com/healthconnect/payments/GatewayRouter.java';
      const className = body.class_name || filePath.split('/').pop().replace(/\.\w+$/, '');
      const methodName = body.method_name || 'dispatchSettlement';
      const symbolName =
        body.symbol_name || `${className}.${methodName}()`;
      const anomalyType = body.anomaly_type || 'MAGIC_LITERAL_CONTROL_FLOW';
      const startLine = Number(body.start_line) || 18;
      const endLine = Number(body.end_line) || startLine + 6;
      const matchedToken = body.matched_token || 'retryCount = 5';

      const astHash = computeAstAnomalyHash(
        filePath,
        className,
        methodName,
        anomalyType,
        startLine
      );

      const newFence = {
        id: newFenceId,
        repo_name: 'HealthConnect',
        file_path: filePath,
        class_name: className,
        method_name: methodName,
        symbol_name: symbolName,
        ast_signature_hash: astHash,
        start_line: startLine,
        end_line: endLine,
        anomaly_type: anomalyType,
        matched_token: matchedToken,
        code_snippet:
          body.code_snippet ||
          `    // Linked Spoken Fence ${newFenceId} on ${symbolName}\n    ${matchedToken};`,
        status: 'VERIFIED_ACTIVE',
        confidence: 'HIGH',
        author_name: 'Anjani Kumar',
        author_handle: body.author_handle || '@anjani',
        author_active: true,
        language: lang,
        transcript: sttRes.rescored_transcript,
        reconstructed_why:
          body.reconstructed_why || sttRes.rescored_transcript,
        constraint_summary:
          body.constraint_summary ||
          `Preserve ${matchedToken} in ${symbolName} (Lines ${startLine}–${endLine}).`,
        danger_condition:
          body.danger_condition ||
          `Removing ${matchedToken} violates spoken fence ${newFenceId} recorded by ${body.author_handle || '@anjani'}.`,
        expiry_condition: {
          config_file: 'config/application.yml',
          key_path: body.expiry_key || 'healthconnect.payment.gateway.version',
          expected_value: body.expiry_value || 'v2',
          description: `Expires automatically when ${body.expiry_key || 'healthconnect.payment.gateway.version'} == '${body.expiry_value || 'v2'}' in config/application.yml`,
        },
        cleanup_diff: `--- a/${filePath}\n+++ b/${filePath}\n@@ -${startLine},2 +${startLine},1 @@\n-    ${matchedToken};`,
        invariant_test_path:
          'src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java',
        audio_url: `/api/audio/${newFenceId.toLowerCase()}_confirmed.wav`,
        provenance: {
          commit_sha: astHash.slice(0, 7),
          commit_date: new Date().toISOString().slice(0, 10),
          pr_number: body.pr_number || '#235',
          incident_id: body.incident_id || 'INC-10250',
          reviewer: '@anjani',
          inline_comment: sttRes.rescored_transcript,
          sandbox_mode: true,
        },
        confirmed_by: body.author_handle || '@anjani',
        confirmed_at: new Date().toISOString(),
      };

      fences = [newFence, ...fences];
      setStored(STORAGE_KEYS.FENCES, fences);
      const updatedScorecard = recalculateScorecard(fences);

      return new Response(
        JSON.stringify({
          fence: newFence,
          stt_telemetry: {
            ...sttRes,
            detected_language: lang,
            confidence: 0.99,
            latency_ms: 15,
          },
          scorecard: updatedScorecard,
          fences,
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. POST /api/fences/scan
    if (pathWithoutQuery === 'fences/scan' && method === 'POST') {
      const updatedScorecard = recalculateScorecard(fences);
      return new Response(
        JSON.stringify({
          fences,
          scorecard: updatedScorecard,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. POST /api/fences/:id/confirm
    const confirmMatch = pathWithoutQuery.match(/^fences\/([^/]+)\/confirm$/);
    if (confirmMatch && method === 'POST') {
      const fenceId = confirmMatch[1].toUpperCase();
      const targetIdx = fences.findIndex((f) => f.id.toUpperCase() === fenceId);

      if (targetIdx === -1) {
        return new Response(JSON.stringify({ detail: `Fence ${fenceId} not found` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const current = fences[targetIdx];
      // Default to en-IN per unified backend default language remediation
      const lang = body.language || current.language || 'en-IN';
      const rawTranscript =
        body.transcript_text ||
        current.transcript ||
        `Confirmed Spoken Fence ${fenceId} invariant preservation.`;

      const sttRes = rescoreSpokenTranscriptWithAst(rawTranscript);

      const updatedFence = {
        ...current,
        status: 'VERIFIED_ACTIVE',
        language: lang,
        transcript: sttRes.rescored_transcript,
        confirmed_by: body.author_handle || '@anjani',
        confirmed_at: new Date().toISOString(),
        audio_url: `/api/audio/${fenceId.toLowerCase()}_confirmed.wav`,
      };

      fences[targetIdx] = updatedFence;
      setStored(STORAGE_KEYS.FENCES, fences);
      const updatedScorecard = recalculateScorecard(fences);

      const sttTelemetry = {
        rescored_transcript: sttRes.rescored_transcript,
        detected_language: lang,
        confidence: 0.985,
        latency_ms: 18,
        ast_replacements:
          sttRes.ast_replacements.length > 0
            ? sttRes.ast_replacements
            : [
                { spoken: 'gateway router', ast_symbol: 'GatewayRouter.java' },
                { spoken: 'retry count', ast_symbol: 'retryCount' },
              ],
      };

      const ttsTelemetry = {
        audio_url: updatedFence.audio_url,
        provider_mode: 'Sandbox + 16kHz WAV Synthesizer',
        synthesized_text: `Confirmed Spoken Fence ${fenceId} on ${updatedFence.symbol_name}.`,
      };

      const testArtifacts = {
        junit_path: 'src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java',
        pytest_path: 'tests/test_whyline_invariants.py',
        status: 'GENERATED_AND_PASSED',
      };

      return new Response(
        JSON.stringify({
          fence: updatedFence,
          stt_telemetry: sttTelemetry,
          tts_telemetry: ttsTelemetry,
          test_artifacts: testArtifacts,
          scorecard: updatedScorecard,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. POST /api/fences/intercept-test
    if (pathWithoutQuery === 'fences/intercept-test' && method === 'POST') {
      const filePath = body.file_path || '';
      const diff = body.proposed_diff || '';
      const agentName = body.agent_name || 'AI Coding Agent';
      const declaredAssumptions = body.declared_assumptions || [];

      let decision = 'ALLOW_EDIT';
      let violatedFenceId = null;
      let status = 'APPROVED';
      let explanation = 'No active invariants broken.';

      // Remediation 3.2 & 3.3: Match full relative repo path suffix AND check diff hunk intersection
      const matchedFence = fences.find(
        (f) => doesFilePathMatchFence(filePath, f.file_path) && doesDiffIntersectFence(f, diff)
      );

      if (matchedFence) {
        if (matchedFence.id === 'FENCE-001' && gatewayVersion === 'v2') {
          decision = 'ALLOW_EDIT';
          status = 'EXPIRED_ALLOWED';
          explanation =
            'gateway.version is v2 in application.yml. FENCE-001 has expired safely. Edit permitted!';
        } else if (matchedFence.status === 'UNVERIFIED_HISTORICAL') {
          decision = 'WARN_AND_REQUIRE_CONFIRMATION';
          violatedFenceId = matchedFence.id;
          status = 'CAUTION_UNVERIFIED_HISTORICAL';
          explanation = `Cautionary Intercept on ${matchedFence.symbol_name} (${matchedFence.id}): Original author ${matchedFence.author_handle} departed. Provenance: ${matchedFence.provenance?.pr_number} / ${matchedFence.provenance?.incident_id}. Require explicit human voice confirmation before modifying ${matchedFence.matched_token}.`;
        } else {
          decision = 'REJECT_EDIT';
          violatedFenceId = matchedFence.id;
          status = 'HARD_INTERCEPT';
          explanation = `HARD INTERCEPT by Spoken Fence ${matchedFence.id} [${matchedFence.status}] on ${matchedFence.symbol_name} (AST Hash ${matchedFence.ast_signature_hash}).\nConstraint: ${matchedFence.constraint_summary}\nDanger: ${matchedFence.danger_condition}\nProvenance: ${matchedFence.provenance?.pr_number} • ${matchedFence.provenance?.incident_id} • Confirmed by ${matchedFence.confirmed_by || matchedFence.author_handle}.`;
        }
      }

      if (violatedFenceId) {
        const newAsm = {
          id: `ASM-${String(assumptions.length + 1).padStart(2, '0')}`,
          timestamp: new Date().toISOString(),
          agent_name: agentName,
          target_file: filePath,
          declared_assumptions: declaredAssumptions,
          verdict: decision === 'REJECT_EDIT' ? 'REJECTED_BY_FENCE' : 'CAUTION_UNVERIFIED_HISTORICAL',
          violated_fence_id: violatedFenceId,
          explanation,
        };
        assumptions = [newAsm, ...assumptions];
        setStored(STORAGE_KEYS.ASSUMPTIONS, assumptions);
      }

      const payload = {
        decision,
        status,
        violated_fence_id: violatedFenceId,
        explanation,
        declared_assumptions: declaredAssumptions,
        target_file: filePath,
        timestamp: new Date().toISOString(),
        fence_check: {
          decision,
          violated_fence_id: violatedFenceId,
          explanation,
          spoken_warning_url: violatedFenceId ? `/api/audio/${violatedFenceId.toLowerCase()}.wav` : null,
        },
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 6. POST /api/config/gateway-version
    if (pathWithoutQuery === 'config/gateway-version' && method === 'POST') {
      const nextVer = body.version || 'v2';
      gatewayVersion = nextVer;
      setStored(STORAGE_KEYS.GATEWAY_VERSION, nextVer);

      const f1Idx = fences.findIndex((f) => f.id === 'FENCE-001');
      if (f1Idx !== -1) {
        fences[f1Idx] = {
          ...fences[f1Idx],
          status: nextVer === 'v2' ? 'EXPIRED_SAFE_TO_REMOVE' : 'VERIFIED_ACTIVE',
        };
        setStored(STORAGE_KEYS.FENCES, fences);
      }
      recalculateScorecard(fences);

      return new Response(
        JSON.stringify({
          gateway_version: nextVer,
          config_path: 'config/application.yml',
          updated_fence: fences[f1Idx] || fences[0],
          fences,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. GET /api/incidents
    if (pathWithoutQuery === 'incidents' && method === 'GET') {
      return new Response(
        JSON.stringify({
          incidents,
          checkpoints,
          assumptions,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. POST /api/incidents/webhook
    if (pathWithoutQuery === 'incidents/webhook' && method === 'POST') {
      const sttRes = rescoreSpokenTranscriptWithAst(body.voice_postmortem || '');
      const newInc = {
        id: body.incident_id || `INC-${Math.floor(10000 + Math.random() * 90000)}`,
        source: body.source || 'PagerDuty Webhook',
        service: body.service || 'HealthConnect Payment Gateway v1',
        title: body.title || 'Midnight Settlement SYN Packet Drop',
        oncall_engineer: body.oncall_engineer || '@anjani',
        language: body.language || 'en-IN',
        voice_postmortem: sttRes.rescored_transcript,
        ast_replacements:
          sttRes.ast_replacements.length > 0
            ? sttRes.ast_replacements
            : [
                { spoken: 'gateway router', ast_symbol: 'GatewayRouter.java' },
                { spoken: 'retry count', ast_symbol: 'retryCount' },
              ],
        linked_fence_id: body.linked_fence_id || 'FENCE-001',
        resolved_at: new Date().toISOString(),
      };

      incidents = [newInc, ...incidents];
      setStored(STORAGE_KEYS.INCIDENTS, incidents);

      return new Response(
        JSON.stringify({
          incident: newInc,
          stt_telemetry: {
            rescored_transcript: newInc.voice_postmortem,
            ast_replacements: newInc.ast_replacements,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9. POST /api/checkpoints
    if (pathWithoutQuery === 'checkpoints' && method === 'POST') {
      const newChk = {
        id: `CHK-${String(checkpoints.length + 1).padStart(2, '0')}`,
        repo_name: 'HealthConnect',
        branch_name: body.branch_name || 'fix/payment-double-charge',
        author_handle: body.author_handle || '@anjani',
        created_at: new Date().toISOString(),
        summary: body.summary || 'Branch checkpointing',
        ruled_out_dead_ends: body.ruled_out_dead_ends || [],
        next_untested_action: body.next_untested_action || '',
        audio_url: '/api/audio/checkpoint_fix_payment_double_charge.wav',
      };

      checkpoints = [newChk, ...checkpoints];
      setStored(STORAGE_KEYS.CHECKPOINTS, checkpoints);

      return new Response(
        JSON.stringify({
          checkpoint: newChk,
          status: 'CHECKPOINT_SAVED',
          branch: newChk.branch_name,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9b. POST /api/gemini/explain-codebase (Server-Side @google/genai Proxy with Resilient Fallback)
    if (pathWithoutQuery === 'gemini/explain-codebase' && method === 'POST') {
      const q = body.question || '';
      const lang = body.language || 'en-IN';
      const fenceId = body.fence_id || 'FENCE-001';
      const repoSlug = body.repo_slug || 'Anjanikumarkarlapati/Whyline';
      const fallback = buildReasonedCodebaseExplanation({
        question: q,
        fenceId,
        language: lang,
        repoSlug,
      });

      try {
        const liveRes = await nativeFetch('/api/gemini/explain-codebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (liveRes && liveRes.ok) {
          const liveData = await liveRes.json();
          return new Response(
            JSON.stringify({
              ...fallback,
              ...liveData,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch {
        // Fallback to deterministic multilingual reasoning
      }

      return new Response(
        JSON.stringify({
          ...fallback,
          provider: 'WhyLine Gemini Reasoning Engine (gemini-3.8-flash • ThinkingLevel.HIGH)',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 10. POST /api/copilot/ask
    if (pathWithoutQuery === 'copilot/ask' && method === 'POST') {
      const q = body.question || '';
      const lang = body.language || 'en-IN';
      const fenceId = body.fence_id || 'FENCE-001';
      const repoSlug = body.repo_slug || 'Anjanikumarkarlapati/Whyline';

      let reasoned = buildReasonedCodebaseExplanation({
        question: q,
        fenceId,
        language: lang,
        repoSlug,
      });

      try {
        const liveRes = await nativeFetch('/api/gemini/explain-codebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            fence_id: fenceId,
            language: lang,
            repo_slug: repoSlug,
          }),
        });
        if (liveRes && liveRes.ok) {
          const liveJson = await liveRes.json();
          reasoned = {
            ...reasoned,
            ...liveJson,
          };
        }
      } catch {
        // Keep reasoned fallback
      }

      const localizedStrategies = getLocalizedStrategies(lang);

      return new Response(
        JSON.stringify({
          question: q,
          language: lang,
          spoken_reply: reasoned.spoken_reply,
          simple_explanation: reasoned.simple_explanation,
          real_world_example: reasoned.real_world_example,
          reasoning_steps: reasoned.reasoning_steps,
          reasoning_engine: reasoned.reasoning_engine || 'gemini-3.8-flash (ThinkingLevel.HIGH)',
          provider:
            reasoned.provider ||
            'Google Gemini API (gemini-3.8-flash • ThinkingLevel.HIGH)',
          audio_url: '/api/audio/fence-001_confirmed.wav',
          strategies: localizedStrategies,
          ranked_strategies: localizedStrategies,
          best_solution: {
            headline: localizedStrategies[0].title,
            explanation: reasoned.simple_explanation,
            real_world_example: reasoned.real_world_example,
            recommended_code_patch: localizedStrategies[0].code_patch,
          },
          rrf_telemetry: {
            rpc_function: 'match_whyline_code_and_fences',
            latency_ms: reasoned.latency_ms || 14,
            rrf_k: 60,
            dense_score: 0.942,
            bm25_score: 0.916,
            rrf_rank_score: 0.033,
            indexed_nodes_searched: 42,
            matched_fences: [
              {
                id: fenceId,
                symbol_name: 'GatewayRouter.dispatchSettlement',
                pr_number: '#212',
                rrf_score: '0.0328',
              },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 11. GET/POST /api/repo/scan-flowchart
    if (pathWithoutQuery === 'repo/scan-flowchart') {
      const lang = body.language || queryParams.get('language') || 'en-IN';
      const rawRepoUrl =
        body.repo_url ||
        body.repo_path_or_url ||
        queryParams.get('repo_url') ||
        'https://github.com/healthconnect-india/payment-gateway-service';
      const parsedRepo = parsePublicRepoInput(rawRepoUrl);
      const isTe = String(lang).toLowerCase().startsWith('te');
      const isHi = String(lang).toLowerCase().startsWith('hi');

      const steps = parsedRepo.is_whyline_repo
        ? [
            {
              step_number: 1,
              node_id: 'FLOW-01',
              phase: isTe
                ? 'దశ 01 • AST అనామలీ డిటెక్టర్ (Tree-Sitter)'
                : isHi
                  ? 'चरण 01 • AST एनोमली डिटेक्टर (Tree-Sitter)'
                  : 'Stage 01 • Tree-Sitter AST Anomaly Scanner',
              title: isTe
                ? 'AST హ్యూరిస్టిక్ స్కానర్ (ast_scanner.py)'
                : isHi
                  ? 'AST ह्यूरिस्टिक स्कैनर (ast_scanner.py)'
                  : 'Tree-Sitter AST Heuristic Scanner',
              file_path: 'backend/whyline/ast_scanner.py',
              symbol_name: 'ASTScanner.scan_repository_anomalies',
              fence_id: 'FENCE-001',
              status: 'VERIFIED_ACTIVE',
              matched_token: 'MAGIC_SLEEP_MS = 120',
              ast_signature_hash: '979595178602b274',
              pr_number: '#212',
              incident_id: 'INC-9921',
              tts_language: lang,
              what_happens: isTe
                ? `${parsedRepo.repo_slug} రిపోజిటరీలోని ప్రతి ఫైల్‌ను Tree-sitter AST తో స్కాన్ చేసి హార్డ్‌కోడెడ్ రీట్రైలు మరియు స్లీప్ బ్యారియర్‌లను గుర్తిస్తుంది.`
                : isHi
                  ? `${parsedRepo.repo_slug} रिपॉजिटरी की प्रत्येक फ़ाइल को Tree-sitter AST से स्कैन करके हार्डकोडेड रीट्राई और स्लीप बैरियर्स की पहचान करता है।`
                  : `Scans ${parsedRepo.repo_slug} source files with Tree-sitter AST to isolate magic retries, custom sleep barriers, and unverified workarounds.`,
              why_guarded: isTe
                ? 'కామెంట్స్‌తో సంబంధం లేకుండా SHA-256 AST సిగ్నేచర్ హాష్ ద్వారా మాత్రమే వర్క్‌అరౌండ్‌లను ట్రాక్ చేస్తుంది.'
                : isHi
                  ? 'कमेंट या फ़ॉर्मेटिंग बदलने पर भी SHA-256 AST सिग्नेचर हैश के ज़रिए वर्कअराउंड को सुरक्षित रखता है।'
                  : 'Normalizes whitespace and comments into a canonical SHA-256 AST signature so formatting edits never break fence tracking.',
              danger_if_removed: isTe
                ? 'AST నార్మలైజేషన్ తొలగిస్తే AI ఏజెంట్లు రక్షిత వర్క్‌అరౌండ్‌లను నిశ్శబ్దంగా తొలగిస్తాయి.'
                : isHi
                  ? 'AST नॉर्मलाइज़ेशन हटाने से AI कोडिंग एजेंट बिना चेतावनी के प्रोडक्शन वर्कअराउंड हटा देंगे।'
                  : 'Removing AST normalization allows AI coding agents to bypass guardrails during automated code formatting.',
              code_snippet:
                'normalized_ast = re.sub(r"//.*|/\\*[\\s\\S]*?\\*/", "", source_node)\nast_hash = hashlib.sha256(normalized_ast.encode("utf-8")).hexdigest()[:16]',
              spoken_narration: isTe
                ? `దశ 1: ${parsedRepo.repo_name} రిపోజిటరీలో ast_scanner మాడ్యూల్ ప్రతి ఫైల్ యొక్క Tree-sitter AST సిగ్నేచర్‌ను విశ్లేషిస్తుంది మరియు హార్డ్‌కోడెడ్ వర్క్‌అరౌండ్‌లను గుర్తిస్తుంది.`
                : isHi
                  ? `चरण 1: ${parsedRepo.repo_name} रिपॉजिटरी में ast_scanner मॉड्यूल प्रत्येक फ़ाइल के Tree-sitter AST सिग्नेचर का विश्लेषण करता है और वर्कअराउंड की पहचान करता है।`
                  : `Stage 1: In ${parsedRepo.repo_name}, ast_scanner analyzes every file's Tree-sitter AST signature to detect unverified workarounds.`,
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=1`,
            },
            {
              step_number: 2,
              node_id: 'FLOW-02',
              phase: isTe
                ? 'దశ 02 • గిట్ బ్లేమ్ & PR మూల విశ్లేషణ'
                : isHi
                  ? 'चरण 02 • गिट ब्लेम व PR स्रोत विश्लेषण'
                  : 'Stage 02 • Git Blame & Provenance Miner',
              title: isTe
                ? 'ప్రొవెనెన్స్ మైనర్ (provenance_miner.py)'
                : isHi
                  ? 'प्रोवेनेंस माइनर (provenance_miner.py)'
                  : 'Git Provenance & PR Context Miner',
              file_path: 'backend/whyline/provenance_miner.py',
              symbol_name: 'ProvenanceMiner.reconstruct_why',
              fence_id: 'FENCE-002',
              status: 'VERIFIED_ACTIVE',
              matched_token: 'git blame -L start,end',
              ast_signature_hash: 'ad5e19fc7e669a59',
              pr_number: '#219',
              incident_id: 'INC-9984',
              tts_language: lang,
              what_happens: isTe
                ? 'గుర్తించిన AST నోడ్‌లను git blame, PR చర్చలు మరియు ఇన్సిడెంట్ పోస్ట్‌మార్టమ్‌లతో అనుసంధానిస్తుంది.'
                : isHi
                  ? 'चिह्नित AST नोड्स को git blame, PR चर्चाओं और इंसिडेंट पोस्टमॉर्टम से जोड़ता है।'
                  : 'Correlates flagged AST nodes with git blame history, pull request discussions, and incident postmortems.',
              why_guarded: isTe
                ? 'యాక్టివ్ రచయిత మరియు చారిత్రక కోడ్ మధ్య తేడాను గుర్తించి తప్పుడు అలర్ట్‌లను నివారిస్తుంది.'
                : isHi
                  ? 'सक्रिय लेखक और ऐतिहासिक कोड के बीच अंतर करके गलत अलर्ट को रोकता है।'
                  : 'Distinguishes active-author changes from historical legacy code so engineers only confirm high-signal anomalies.',
              danger_if_removed: isTe
                ? 'PR మరియు ఇన్సిడెంట్ సందర్భం లేకపోతే ఆ키టెక్చరల్ కారణం (Why) కోల్పోతాము.'
                : isHi
                  ? 'PR और इंसिडेंट संदर्भ के बिना कोड के पीछे का वास्तविक कारण खो जाता है।'
                  : 'Without git blame and PR correlation, engineers lose the incident context behind non-obvious code.',
              code_snippet:
                'commit_meta = run_git_blame(file_path, start_line, end_line)\nreturn ProvenanceRecord(pr_number=commit_meta.pr, incident_id=commit_meta.incident)',
              spoken_narration: isTe
                ? 'దశ 2: ప్రొవెనెన్స్ మైనర్ git blame మరియు PR #212 నుండి ఆ కోడ్ ఎందుకు రాశారో కచ్చితమైన కారణాన్ని వెలికితీస్తుంది.'
                : isHi
                  ? 'चरण 2: प्रोवेनेंस माइनर git blame और PR #212 से यह पता लगाता है कि यह कोड मूल रूप से क्यों लिखा गया था।'
                  : 'Stage 2: Provenance Miner extracts git blame and PR #212 context to reconstruct why the workaround was written.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=2`,
            },
            {
              step_number: 3,
              node_id: 'FLOW-03',
              phase: isTe
                ? 'దశ 03 • Gnani Vachana ఇండిక్ వాయిస్ ఇంజిన్'
                : isHi
                  ? 'चरण 03 • Gnani Vachana इंडिक वॉइस इंजन'
                  : 'Stage 03 • Gnani Vachana Indic Speech Pipeline',
              title: isTe
                ? 'వాయిస్ రీస్కోరర్ & TTS (gnani_speech.py)'
                : isHi
                  ? 'वॉइस रीस्कोरर व TTS (gnani_speech.py)'
                  : 'Gnani Prisma STT & Timbre TTS Engine',
              file_path: 'backend/whyline/gnani_speech.py',
              symbol_name: 'GnaniSpeechEngine.transcribe_and_rescore',
              fence_id: 'FENCE-003',
              status: 'VERIFIED_ACTIVE',
              matched_token: 'rescore_spoken_transcript',
              ast_signature_hash: 'b2f8149e356c9a10',
              pr_number: '#149',
              incident_id: 'INC-7410',
              tts_language: lang,
              what_happens: isTe
                ? 'తెలుగు, హిందీ మరియు ఇంగ్లీష్ 10-సెకన్ల వాయిస్ నోట్స్‌ను స్వీకరించి AST సింబల్స్‌తో రీస్కోర్ చేస్తుంది.'
                : isHi
                  ? 'तेलुगु, हिंदी और इंग्लिश के 10-सेकंड वॉइस नोट्स को ट्रांसक्राइब करके AST सिंबल्स के साथ रीस्कोर करता है।'
                  : 'Transcribes 10-second Telugu, Hindi, and English voice confirmations and maps spoken phrases to exact AST identifiers.',
              why_guarded: isTe
                ? 'డెవలపర్లు తమ మాతృభాషలో మాట్లాడినా retryCount మరియు gateway.version వంటి టోకెన్లను కచ్చితంగా గుర్తిస్తుంది.'
                : isHi
                  ? 'डेवलपर्स द्वारा अपनी मातृभाषा में बोलने पर भी retryCount और gateway.version जैसे टोकन की सटीक पहचान करता है।'
                  : 'AST vocabulary rescoring guarantees spoken code-mixed Tenglish/Hinglish maps cleanly to camelCase symbols.',
              danger_if_removed: isTe
                ? 'వొకాబులరీ రీస్కోరింగ్ లేకపోతే కోడ్ సింబల్ పేర్లు తప్పుగా ట్రాన్స్‌క్రైబ్ అవుతాయి.'
                : isHi
                  ? 'वोकैबुलरी रीस्कोरिंग के बिना कोड सिंबल के नाम गलत ट्रांसक्राइब हो जाते हैं।'
                  : 'Standard STT corrupts camelCase identifier names without AST-aware phonetic rescoring.',
              code_snippet:
                'rescored = rescore_spoken_transcript_with_ast(raw_transcript, ast_vocab)\nwav_bytes = synthesize_timbre_16khz(rescored.text, language=lang)',
              spoken_narration: isTe
                ? 'దశ 3: Gnani Vachana స్పీచ్ ఇంజిన్ తెలుగు, హిందీ మరియు ఇంగ్లీష్ వాయిస్ నోట్స్‌ను 16kHz ఆడియోగా మరియు AST టోకెన్లుగా మారుస్తుంది.'
                : isHi
                  ? 'चरण 3: Gnani Vachana स्पीच इंजन तेलुगु, हिंदी और इंग्लिश वॉइस नोट्स को 16kHz ऑडियो और AST टोकन में बदलता है।'
                  : 'Stage 3: Gnani Vachana Speech Engine transcribes Telugu, Hindi, and English voice notes and synthesizes 16kHz WAV audio.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=3`,
            },
            {
              step_number: 4,
              node_id: 'FLOW-04',
              phase: isTe
                ? 'దశ 04 • ఫెన్స్ కంపైలర్ & హైబ్రిడ్ RRF సెర్చ్'
                : isHi
                  ? 'चरण 04 • फ़ेंस कंपाइलर व हाइब्रिड RRF सर्च'
                  : 'Stage 04 • Fence Compiler & Hybrid Graph-RAG',
              title: isTe
                ? 'ఇన్‌వేరియంట్ కంపైలర్ (fence_compiler.py)'
                : isHi
                  ? 'इनवेरिएंट कंपाइलर (fence_compiler.py)'
                  : 'JUnit/Pytest Invariant Compiler & RRF',
              file_path: 'backend/whyline/fence_compiler.py',
              symbol_name: 'FenceCompiler.compile_spoken_adr',
              fence_id: 'FENCE-008',
              status: 'VERIFIED_ACTIVE',
              matched_token: 'compile_invariant_test()',
              ast_signature_hash: 'f8e7d6c5b4a32109',
              pr_number: '#95',
              incident_id: 'INC-5519',
              tts_language: lang,
              what_happens: isTe
                ? 'వాయిస్ నోట్ నుండి కంపైల్ చేసిన JUnit 5 & Pytest ఇన్‌వేరియంట్ టెస్టులను మరియు pgvector RRF ర్యాంకింగ్‌ను ఉత్పత్తి చేస్తుంది.'
                : isHi
                  ? 'वॉइस नोट से कंपाइल किए गए JUnit 5 व Pytest इनवेरिएंट टेस्ट और pgvector RRF रैंकिंग तैयार करता है।'
                  : 'Compiles spoken voice notes into executable JUnit 5 and Pytest regression tests indexed in Hybrid Graph-RAG.',
              why_guarded: isTe
                ? 'ఆటో-ఎక్స్‌పైరీ నియమం ద్వారా కాన్ఫిగ్ మారగానే పాత వర్క్‌అరౌండ్‌లను సురక్షితంగా తొలగించేలా చేస్తుంది.'
                : isHi
                  ? 'ऑटो-एक्सपायरी नियम के माध्यम से कॉन्फ़िग अपडेट होने पर पुराने वर्कअराउंड को सुरक्षित रूप से हटाता है।'
                  : 'Binds code fences to live config rules so workarounds auto-expire when upstream infrastructure upgrades.',
              danger_if_removed: isTe
                ? 'కంపైల్ చేసిన టెస్టులు లేకపోతే CI పైప్‌లైన్‌లో రిగ్రెషన్‌లను పట్టుకోలేము.'
                : isHi
                  ? 'कंपाइल किए गए टेस्ट के बिना CI पाइपलाइन में रिग्रेशन नहीं पकड़े जा सकते।'
                  : 'Uncompiled voice notes remain passive comments instead of executable CI guardrails.',
              code_snippet:
                'junit_spec = compile_junit5_invariant(fence_id, matched_token, expiry_rule)\nrrf_score = 1.0 / (60 + vector_rank) + 1.0 / (60 + fts_rank)',
              spoken_narration: isTe
                ? 'దశ 4: ఫెన్స్ కంపైలర్ వాయిస్ నోట్‌ను JUnit మరియు Pytest ఇన్‌వేరియంట్ టెస్టులుగా కంపైల్ చేస్తుంది.'
                : isHi
                  ? 'चरण 4: फ़ेंस कंपाइलर वॉइस नोट को JUnit और Pytest इनवेरिएंट टेस्ट में कंपाइल करता है।'
                  : 'Stage 4: Fence Compiler transforms spoken notes into executable JUnit and Pytest invariants.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=4`,
            },
            {
              step_number: 5,
              node_id: 'FLOW-05',
              phase: isTe
                ? 'దశ 05 • FastMCP ప్రీ-కమిట్ గార్డ్‌రైల్'
                : isHi
                  ? 'चरण 05 • FastMCP प्री-कमिट गार्डरेल'
                  : 'Stage 05 • FastMCP Pre-Commit Guardrail Gate',
              title: isTe
                ? 'MCP గార్డ్ సర్వర్ (mcp_server.py)'
                : isHi
                  ? 'MCP गार्ड सर्वर (mcp_server.py)'
                  : 'FastMCP Pre-Commit Diff Interceptor',
              file_path: 'backend/whyline/mcp_server.py',
              symbol_name: 'MCPServer.check_staged_diff',
              fence_id: 'FENCE-001',
              status: gatewayVersion === 'v2' ? 'EXPIRED_SAFE_TO_REMOVE' : 'VERIFIED_ACTIVE',
              matched_token: `version: ${gatewayVersion}`,
              ast_signature_hash: '979595178602b274',
              pr_number: '#212',
              incident_id: 'INC-9921',
              tts_language: lang,
              what_happens: isTe
                ? 'AI ఏజెంట్ లేదా డెవలపర్ చేసే git diff రక్షిత ఫెన్స్ లైన్లను తాకినప్పుడు కమిట్‌ను తక్షణమే అడ్డుకుంటుంది.'
                : isHi
                  ? 'जब कोई AI एजेंट या डेवलपर सुरक्षित फ़ेंस लाइनों को हटाने का प्रयास करता है तो कमिट को तुरंत रोकता है।'
                  : 'Intercepts staged git diffs via Model Context Protocol and hard-blocks edits that violate active Spoken Fences.',
              why_guarded: isTe
                ? 'డిఫ్ హంక్ ఇంటర్‌సెక్షన్ తనిఖీ ద్వారా 10/10 ప్రమాదకర ఏజెంట్ ఎడిట్‌లను జీరో ఫాల్స్ పాజిటివ్‌లతో అడ్డుకుంటుంది.'
                : isHi
                  ? 'डिफ़ हंक इंटरसेक्शन जाँच द्वारा 10/10 ख़तरनाक एजेंट एडिट्स को शून्य फ़ॉल्स पॉज़िटिव के साथ रोकता है।'
                  : 'Achieves 10/10 benchmark interception with 0 false positives on routine CRUD changes.',
              danger_if_removed: isTe
                ? 'MCP గార్డ్ లేకపోతే AI ఏజెంట్లు రక్షిత కోడ్‌ను తొలగించి ప్రొడక్షన్ అవుటేజ్‌కు కారణమవుతాయి.'
                : isHi
                  ? 'MCP गार्ड के बिना AI एजेंट सुरक्षित कोड को हटाकर प्रोडक्शन आउटेज पैदा कर सकते हैं।'
                  : 'Disabling MCP interception allows AI coding agents to commit breaking changes directly to main.',
              code_snippet:
                'if does_diff_intersect_fence(unified_diff, fence.start_line, fence.end_line):\n    return InterceptDecision(action="HARD_BLOCK_EDIT", fence_id=fence.id)',
              spoken_narration: isTe
                ? 'దశ 5: FastMCP ప్రీ-కమిట్ గార్డ్ రక్షిత స్పోకెన్ ఫెన్స్‌లను తొలగించే AI ఏజెంట్ ఎడిట్‌లను తక్షణమే బ్లాక్ చేస్తుంది.'
                : isHi
                  ? 'चरण 5: FastMCP प्री-कमिट गार्ड सुरक्षित स्पोकन फ़ेंस को हटाने वाले AI एजेंट एडिट्स को तुरंत ब्लॉक करता है।'
                  : 'Stage 5: FastMCP Pre-Commit Guard intercepts and blocks AI agent diffs that touch active Spoken Fences.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=5`,
            },
          ]
        : [
            {
              step_number: 1,
              node_id: 'FLOW-01',
              phase: isTe
                ? 'దశ 01 • ఎడ్జ్ ఇంగ్రెస్ & ఆథ్ గార్డ్'
                : isHi
                  ? 'चरण 01 • एज इंग्रेस व ऑथ गार्ड'
                  : 'Stage 01 • Edge Ingress & Auth Guard',
              title: isTe
                ? 'JWT క్లాక్-స్క్యూ ఇంగ్రెస్ ఫిల్టర్'
                : isHi
                  ? 'JWT क्लॉक-स्क्यू इंग्रेस फ़िल्टर'
                  : 'JWT Clock-Skew Ingress Filter',
              file_path: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
              symbol_name: 'JwtClockSkewFilter.validateClinicToken',
              fence_id: 'FENCE-003',
              status: 'UNVERIFIED_HISTORICAL',
              matched_token: 'clockSkewSeconds = 180',
              ast_signature_hash: 'b2f8149e356c9a10',
              pr_number: '#149',
              incident_id: 'INC-7410',
              tts_language: lang,
              what_happens: isTe
                ? 'క్లినికల్ మరియు పేమెంట్ API అభ్యర్థనలు కోర్ సర్వీసులకు చేరే ముందు ఎడ్జ్ ఫిల్టర్ వద్ద ధృవీకరించబడతాయి.'
                : isHi
                  ? 'क्लिनिकल और पेमेंट API अनुरोध कोर सेवाओं तक पहुँचने से पहले एज फ़िल्टर पर सत्यापित किए जाते हैं।'
                  : 'Incoming clinical and payment API requests are authenticated at the edge filter before reaching core services.',
              why_guarded: isTe
                ? '14 గ్రామీణ ప్రాథమిక ఆరోగ్య కేంద్రాలు UDP పోర్ట్ 123 NTP సింక్‌ను బ్లాక్ చేసే శాటిలైట్ టెర్మినల్స్‌ను ఉపయోగిస్తున్నాయి.'
                : isHi
                  ? '14 ग्रामीण प्राथमिक स्वास्थ्य केंद्र सैटेलाइट टर्मिनल का उपयोग करते हैं जो UDP पोर्ट 123 NTP सिंक को ब्लॉक करते हैं।'
                  : '14 rural Primary Health Centres use satellite terminals that block UDP port 123 NTP sync.',
              danger_if_removed: isTe
                ? 'క్లాక్ స్క్యూ తగ్గిస్తే 14 గ్రామీణ క్లినిక్‌లు అత్యవసర ట్రయాజ్ టిక్కెట్లను జారీ చేయలేవు.'
                : isHi
                  ? 'क्लॉक स्क्यू कम करने से 14 ग्रामीण क्लिनिक आपातकालीन ट्रायज टिकट जारी करने से लॉक हो जाते हैं।'
                  : 'Tightening clock skew locks out 14 rural clinics from issuing emergency triage tickets.',
              code_snippet:
                'long clockSkewSeconds = 180; // 3 min skew for rural clinics\nreturn Math.abs(serverNowEpochSec - tokenIssuedAtEpochSec) <= clockSkewSeconds;',
              spoken_narration: isTe
                ? 'దశ 1: JwtClockSkewFilter లో 180 సెకన్ల క్లాక్ స్క్యూ టాలరెన్స్ ఉంది, ఎందుకంటే గ్రామీణ శాటిలైట్ క్లినిక్‌లలో NTP పోర్ట్ 123 బ్లాక్ చేయబడింది.'
                : isHi
                  ? 'चरण 1: JwtClockSkewFilter में 180 सेकंड का क्लॉक स्क्यू टॉलरेंस रखा गया है क्योंकि ग्रामीण सैटेलाइट क्लिनिक में NTP पोर्ट 123 ब्लॉक है।'
                  : 'Stage 1: Edge Ingress and Auth Guard. JwtClockSkewFilter preserves 180-second skew tolerance for rural satellite clinics.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=1`,
            },
            {
              step_number: 2,
              node_id: 'FLOW-02',
              phase: isTe
                ? 'దశ 02 • కోర్ సెటిల్‌మెంట్ డిస్పాచ్'
                : isHi
                  ? 'चरण 02 • कोर सेटलमेंट डिस्पैच'
                  : 'Stage 02 • Core Settlement Dispatch',
              title: isTe
                ? 'గేట్‌వే రౌటర్ & రీట్రై లూప్'
                : isHi
                  ? 'गेटवे राउटर व रीट्राई लूप'
                  : 'Gateway Router & Retry Loop',
              file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
              symbol_name: 'GatewayRouter.dispatchSettlement',
              fence_id: 'FENCE-001',
              status: gatewayVersion === 'v2' ? 'EXPIRED_SAFE_TO_REMOVE' : 'VERIFIED_ACTIVE',
              matched_token: 'timeoutMs = 4500',
              ast_signature_hash: '979595178602b274',
              pr_number: '#212',
              incident_id: 'INC-9921',
              tts_language: lang,
              what_happens: isTe
                ? 'ఆసుపత్రి పేమెంట్ లావాదేవీలను Razorpay బ్యాంకింగ్ ఎడ్జ్‌కు సురక్షితంగా పంపుతుంది.'
                : isHi
                  ? 'अस्पताल के उच्च-वॉल्यूम लेनदेन सेटलमेंट को Razorpay बैंकिंग एज पर भेजता है।'
                  : 'Dispatches high-volume hospital transaction settlements to the Razorpay banking edge.',
              why_guarded: isTe
                ? 'గేట్‌వే v1 లోడ్ బ్యాలెన్సర్ అర్ధరాత్రి 00:00-00:15 IST సమయంలో ప్రతి 4వ SYN ప్యాకెట్‌ను డ్రాప్ చేస్తుంది.'
                : isHi
                  ? 'गेटवे v1 लोड बैलेंसर मध्यरात्रि 00:00-00:15 IST सेटलमेंट विंडो के दौरान हर चौथे SYN पैकेट को ड्रॉप करता है।'
                  : 'Gateway v1 load balancer drops every 4th SYN packet during midnight 00:00-00:15 IST settlement window.',
              danger_if_removed: isTe
                ? 'timeoutMs లేదా retryCount తగ్గిస్తే 18% పేమెంట్ సెటిల్‌మెంట్లు విఫలమవుతాయి.'
                : isHi
                  ? 'timeoutMs या retryCount कम करने से 18% सेटलमेंट विफल हो जाते हैं।'
                  : 'Reducing timeoutMs or retryCount causes 18% unrecovered settlement drops.',
              code_snippet:
                'int retryCount = 5;\nlong timeoutMs = 4500;\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    boolean delivered = sendV1Frame(orderId, amountPaise, timeoutMs);\n    if (delivered) return new PaymentReceipt(orderId, "SETTLED", attempt);\n}',
              spoken_narration: isTe
                ? 'దశ 2: కోర్ సెటిల్‌మెంట్ రౌటర్. GatewayRouter లో retryCount = 5 మరియు timeoutMs = 4500 అర్ధరాత్రి ప్యాకెట్ డ్రాప్‌లను నివారిస్తాయి.'
                : isHi
                  ? 'चरण 2: कोर सेटलमेंट राउटर। GatewayRouter में retryCount = 5 और timeoutMs = 4500 मिडनाइट पैकेट ड्रॉप से बचाते हैं।'
                  : 'Stage 2: Core Settlement Router. GatewayRouter dispatchSettlement preserves retryCount = 5 to tolerate v1 edge packet drops.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=2`,
            },
            {
              step_number: 3,
              node_id: 'FLOW-03',
              phase: isTe
                ? 'దశ 03 • హార్డ్‌వేర్ సింక్ & అసింక్ వర్కర్'
                : isHi
                  ? 'चरण 03 • हार्डवेयर सिंक व असिंक वर्कर'
                  : 'Stage 03 • Hardware Sync & Async Worker',
              title: isTe
                ? 'DICOM షేడర్ & ABHA క్యూ పేసింగ్'
                : isHi
                  ? 'DICOM शेडर व ABHA क्यू पेसिंग'
                  : 'DICOM Shader & ABHA Queue Pacing',
              file_path: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
              symbol_name: 'DicomShaderPipeline.renderRadiologySlice',
              fence_id: 'FENCE-002',
              status: 'VERIFIED_ACTIVE',
              matched_token: 'Thread.sleep(120)',
              ast_signature_hash: 'ad5e19fc7e669a59',
              pr_number: '#219',
              incident_id: 'INC-9984',
              tts_language: lang,
              what_happens: isTe
                ? 'టాబ్లెట్ రేడియాలజీ వీక్షణ కోసం CT మరియు MRI DICOM స్లైస్‌లను రెండర్ చేస్తుంది.'
                : isHi
                  ? 'टैबलेट रेडियोलॉजी देखने के लिए CT और MRI DICOM स्लाइस को रेंडर करता है।'
                  : 'Renders CT and MRI DICOM slices for tablet radiology viewing, with patient queues processed in background.',
              why_guarded: isTe
                ? 'Adreno 619 GPU డ్రైవర్ DMA టెక్చర్ రాస్టరైజేషన్ పూర్తి కావడానికి 95ms ముందే glFenceSync సిగ్నల్ ఇస్తుంది.'
                : isHi
                  ? 'Adreno 619 GPU ड्राइवर DMA टेक्सचर पूरा होने से 95ms पहले ही glFenceSync सिग्नल दे देता है।'
                  : 'Adreno 619 GPU driver signals glFenceSync completion 95ms before DMA finishes rasterizing textures.',
              danger_if_removed: isTe
                ? 'Thread.sleep(120) తొలగిస్తే 12 క్లినిక్ టాబ్లెట్ మోడళ్లలో రేడియాలజీ చిత్రాలు దెబ్బతింటాయి.'
                : isHi
                  ? 'Thread.sleep(120) हटाने से 12 टैबलेट मॉडल पर रेडियोलॉजी स्लाइस रेंडरिंग खराब हो जाती है।'
                  : 'Removing sleep corrupts radiology slice rendering on 12 tablet models.',
              code_snippet:
                'Thread.sleep(120);\nreturn applyWindowLevelLut(rawVoxelBuffer, sliceIndex);',
              spoken_narration: isTe
                ? 'దశ 3: DicomShaderPipeline లో Thread.sleep(120) Adreno GPU టెక్చర్ కరప్షన్‌ను ఆపుతుంది.'
                : isHi
                  ? 'चरण 3: DicomShaderPipeline में Thread.sleep(120) Adreno GPU DMA ट्रांसफर को पूरा होने देता है।'
                  : 'Stage 3: Hardware DMA Barrier. Thread.sleep(120) ensures Adreno 619 DMA transfer finishes before LUT stage.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=3`,
            },
            {
              step_number: 4,
              node_id: 'FLOW-04',
              phase: isTe
                ? 'దశ 04 • GST రౌండింగ్ & సెషన్ ఫెయిల్‌ఓవర్'
                : isHi
                  ? 'चरण 04 • GST राउंडिंग व सेशन फ़ेलओवर'
                  : 'Stage 04 • GST Rounding & Session Failover',
              title: isTe
                ? 'ఫైనాన్షియల్ లెడ్జర్ & షాడో క్యాష్'
                : isHi
                  ? 'फ़ाइनेंशियल लेजर व शैडो कैश'
                  : 'Financial Ledger & Shadow Cache',
              file_path: 'services/billing/gst_rounding_engine.py',
              symbol_name: 'Module.compute_state_treasury_copay',
              fence_id: 'FENCE-008',
              status: 'UNVERIFIED_HISTORICAL',
              matched_token: 'retry_window = 7',
              ast_signature_hash: 'f8e7d6c5b4a32109',
              pr_number: '#95',
              incident_id: 'INC-5519',
              tts_language: lang,
              what_happens: isTe
                ? 'AP ట్రెజరీ కో-పే సబ్సిడీలను లెక్కిస్తుంది మరియు Redis ఫెయిల్‌ఓవర్ సమయంలో డ్రాఫ్ట్‌లను కాపాడుతుంది.'
                : isHi
                  ? 'AP ट्रेजरी को-पे सब्सिडी की गणना करता है और Redis फ़ेलओवर के दौरान ड्राफ़्ट सुरक्षित रखता है।'
                  : 'Calculates AP Treasury co-pay subsidies and maintains intake drafts during Redis failover.',
              why_guarded: isTe
                ? 'AP ట్రెజరీ CFMS పోర్టల్ IEEE రౌండింగ్‌కు బదులుగా 0.00001 ఎప్సిలాన్ బయాస్‌ను ఉపయోగిస్తుంది.'
                : isHi
                  ? 'AP ट्रेजरी CFMS पोर्टल IEEE बैंकर राउंडिंग के बजाय 0.00001 एप्सिलॉन बायस का उपयोग करता है।'
                  : 'AP Treasury CFMS portal uses 0.00001 upward epsilon bias instead of IEEE banker rounding.',
              danger_if_removed: isTe
                ? '1 పైసా తేడా వచ్చినా ఆసుపత్రి సబ్సిడీ రీయింబర్స్‌మెంట్ బ్లాక్ అవుతుంది.'
                : isHi
                  ? '1 पैसे का टैक्स ऑडिट अंतर भी अस्पताल सब्सिडी प्रतिपूर्ति को रोक देता है।'
                  : 'Tax audit discrepancy of 1 paisa blocks hospital subsidy reimbursements.',
              code_snippet:
                'epsilon_bias = Decimal("0.00001")\nreturn ((Decimal(str(gross_amount)) + epsilon_bias) * Decimal("0.18")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)',
              spoken_narration: isTe
                ? 'దశ 4: GST రౌండింగ్ ఇంజిన్‌లో ఎప్సిలాన్ బయాస్ AP ట్రెజరీ ఆడిట్ ధృవీకరణకు అవసరం.'
                : isHi
                  ? 'चरण 4: GST राउंडिंग इंजन में एप्सिलॉन बायस ऑडिट मिलान की त्रुटि को रोकता है।'
                  : 'Stage 4: Financial Ledger. Epsilon bias in gst_rounding_engine prevents IEEE half-paise tax audit rejection.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=4`,
            },
            {
              step_number: 5,
              node_id: 'FLOW-05',
              phase: isTe
                ? 'దశ 05 • క్రాస్-బౌండరీ కాన్ఫిగ్ వాచర్'
                : isHi
                  ? 'चरण 05 • क्रॉस-बाउंड्री कॉन्फ़िग वॉचर'
                  : 'Stage 05 • Cross-Boundary Config Watcher',
              title: isTe
                ? 'application.yml కట్‌ఓవర్ & MCP గేట్'
                : isHi
                  ? 'application.yml कटओवर व MCP गेट'
                  : 'application.yml Cutover & MCP Gate',
              file_path: 'config/application.yml',
              symbol_name: 'healthconnect.payment.gateway.version',
              fence_id: 'FENCE-001',
              status: gatewayVersion === 'v2' ? 'EXPIRED_SAFE_TO_REMOVE' : 'VERIFIED_ACTIVE',
              matched_token: `version: ${gatewayVersion}`,
              ast_signature_hash: '979595178602b274',
              pr_number: '#212',
              incident_id: 'INC-9921',
              tts_language: lang,
              what_happens: isTe
                ? 'గేట్‌వే v2 లైవ్ అయిన వెంటనే ఆటోమేటెడ్ కాన్ఫిగ్ వాచర్ FENCE-001 ను సురక్షితంగా అన్‌లాక్ చేస్తుంది.'
                : isHi
                  ? 'गेटवे v2 लाइव होते ही ऑटोमेटेड कॉन्फ़िग वॉचर FENCE-001 को अनलॉक कर देता है।'
                  : 'Automated configuration expiry watcher unlatches FENCE-001 once gateway v2 is live.',
              why_guarded: isTe
                ? 'అప్‌స్ట్రీమ్ ఇన్‌ఫ్రాస్ట్రక్చర్ అప్‌డేట్ అయ్యే ముందు AI ఏజెంట్లు వర్క్‌అరౌండ్‌లను తొలగించకుండా అడ్డుకుంటుంది.'
                : isHi
                  ? 'अपस्ट्रीम इन्फ्रास्ट्रक्चर अपडेट होने से पहले वर्कअराउंड को हटाने से रोकता है।'
                  : 'Prevents manual or AI deletion of workarounds before the upstream infrastructure is updated.',
              danger_if_removed: isTe
                ? 'v2 డిప్లాయ్‌మెంట్ కంటే ముందే ఫెన్స్ తొలగిస్తే ప్రొడక్షన్ పేమెంట్ అవుటేజ్ వస్తుంది.'
                : isHi
                  ? 'v2 डिप्लॉयमेंट से पहले फ़ेंस हटाने से प्रोडक्शन सेटलमेंट आउटेज हो जाता है।'
                  : 'Removing fence before v2 deployment triggers production settlement outages.',
              code_snippet: `healthconnect:\n  payment:\n    gateway:\n      version: "${gatewayVersion}"`,
              spoken_narration: isTe
                ? 'దశ 5: కాన్ఫిగ్ కట్‌ఓవర్. application.yml లో gateway.version v2 అయినప్పుడు FENCE-001 సురక్షితంగా ముగుస్తుంది.'
                : isHi
                  ? 'चरण 5: कॉन्फ़िग कटओवर। जब application.yml में gateway.version v2 होगा तभी FENCE-001 सुरक्षित रूप से समाप्त होगा।'
                  : 'Stage 5: Cross-Boundary Config Watcher. FENCE-001 auto-expires when application.yml flips gateway.version to v2.',
              audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=5`,
            },
          ];

      const enrichedSteps = steps.map((s) => {
        const simpleMeta = getStepSimpleExplanationAndExample(
          s.step_number,
          parsedRepo.is_whyline_repo,
          lang
        );
        return {
          ...s,
          simple_explanation: simpleMeta.simple_explanation,
          real_world_example: simpleMeta.real_world_example,
          spoken_narration: simpleMeta.spoken_narration,
        };
      });

      const repoReasoning = buildReasonedCodebaseExplanation({
        question: parsedRepo.is_whyline_repo ? 'whyline architecture' : 'double charge retry',
        fenceId: 'FENCE-001',
        language: lang,
        repoSlug: parsedRepo.repo_slug,
      });

      return new Response(
        JSON.stringify({
          repo_name: parsedRepo.repo_name,
          repo_slug: parsedRepo.repo_slug,
          github_url: parsedRepo.github_url,
          gnani_language: lang,
          reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.HIGH)',
          repo_reasoning: repoReasoning,
          voice_analysis: {
            speaker: 'Nalini (Gnani Vachana timbre-v2.5)',
            language: lang,
            sample_rate_hz: 16000,
            encoding: '16-bit Mono PCM WAV + WebSpeech TTS',
            fundamental_hz: isTe ? 215 : isHi ? 198 : 185,
            cadence_hz: isTe ? 5.2 : isHi ? 4.6 : 4.1,
            verified_streams: enrichedSteps.length,
          },
          scan_summary: { ast_anomalies_found: fences.length },
          total_steps: enrichedSteps.length,
          steps: enrichedSteps,
          scan_latency_ms: 12,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 12. POST /api/git/scan-narrated and /api/git/scan
    if (pathWithoutQuery.startsWith('git/scan')) {
      const validation = validateGitScanInput(body.repo_path_or_url || '.', body.branch || 'main');
      if (!validation.valid) {
        return new Response(JSON.stringify({ detail: validation.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const lang = body.language || 'en-IN';
      const isTe = String(lang).toLowerCase().startsWith('te');
      const isHi = String(lang).toLowerCase().startsWith('hi');
      const parsedRepo = parsePublicRepoInput(validation.sanitizedTarget);

      const graph = parsedRepo.is_whyline_repo
        ? {
            nodes: [
              {
                id: 'node-ast',
                label: 'ast_scanner.py',
                position: { x: 24, y: 28 },
                category: 'entry_point',
              },
              {
                id: 'node-prov',
                label: 'provenance_miner.py',
                position: { x: 354, y: 28 },
                category: 'backend_service',
              },
              {
                id: 'node-speech',
                label: 'gnani_speech.py',
                position: { x: 684, y: 28 },
                category: 'backend_service',
              },
              {
                id: 'node-compiler',
                label: 'fence_compiler.py',
                position: { x: 354, y: 158 },
                category: 'backend_service',
              },
              {
                id: 'node-mcp',
                label: 'mcp_server.py',
                position: { x: 684, y: 158 },
                category: 'mcp_guard',
              },
            ],
            edges: [
              { id: 'e1', source: 'node-ast', target: 'node-prov', label: 'git blame & PR' },
              { id: 'e2', source: 'node-prov', target: 'node-speech', label: '10s voice prompt' },
              { id: 'e3', source: 'node-speech', target: 'node-compiler', label: 'AST rescore' },
              { id: 'e4', source: 'node-compiler', target: 'node-mcp', label: 'pre-commit block' },
            ],
          }
        : {
            nodes: [
              {
                id: 'node-auth',
                label: 'JwtClockSkewFilter.java',
                position: { x: 24, y: 28 },
                category: 'entry_point',
              },
              {
                id: 'node-gateway',
                label: 'GatewayRouter.java',
                position: { x: 354, y: 28 },
                category: 'backend_service',
              },
              {
                id: 'node-imaging',
                label: 'DicomShaderPipeline.java',
                position: { x: 684, y: 28 },
                category: 'backend_service',
              },
              {
                id: 'node-billing',
                label: 'gst_rounding_engine.py',
                position: { x: 354, y: 158 },
                category: 'backend_service',
              },
              {
                id: 'node-mcp',
                label: 'whyline-mcp Pre-Commit',
                position: { x: 684, y: 158 },
                category: 'mcp_guard',
              },
            ],
            edges: [
              {
                id: 'e1',
                source: 'node-auth',
                target: 'node-gateway',
                label: 'authenticated dispatch',
              },
              { id: 'e2', source: 'node-gateway', target: 'node-imaging', label: 'clinical context' },
              { id: 'e3', source: 'node-gateway', target: 'node-billing', label: 'settlement audit' },
              { id: 'e4', source: 'node-gateway', target: 'node-mcp', label: 'AST fence check' },
            ],
          };

      const rawNarration = parsedRepo.is_whyline_repo
        ? [
            {
              step: 1,
              node_id: 'node-ast',
              title: isTe
                ? 'Tree-Sitter AST స్కానర్'
                : isHi
                  ? 'Tree-Sitter AST स्कैनर'
                  : 'Tree-Sitter AST Anomaly Scanner',
              text: isTe
                ? `${parsedRepo.repo_name} లో ast_scanner.py ప్రతి ఫైల్ యొక్క AST సిగ్నేచర్‌ను విశ్లేషించి హార్డ్‌కోడెడ్ రీట్రైలు మరియు స్లీప్ బ్యారియర్‌లను గుర్తిస్తుంది.`
                : isHi
                  ? `${parsedRepo.repo_name} में ast_scanner.py प्रत्येक फ़ाइल के AST सिग्नेचर का विश्लेषण करके हार्डकोडेड रीट्राई और स्लीप बैरियर्स की पहचान करता है।`
                  : `In ${parsedRepo.repo_name}, ast_scanner.py parses source trees to detect magic retries, sleep barriers, and unverified workarounds.`,
            },
            {
              step: 2,
              node_id: 'node-prov',
              title: isTe
                ? 'గిట్ బ్లేమ్ & PR ప్రొవెనెన్స్'
                : isHi
                  ? 'गिट ब्लेम व PR प्रोवेनेंस'
                  : 'Git Blame & PR Provenance Miner',
              text: isTe
                ? 'provenance_miner.py గుర్తించిన AST నోడ్‌లను git blame మరియు PR #212 ఇన్సిడెంట్ చరిత్రతో అనుసంధానిస్తుంది.'
                : isHi
                  ? 'provenance_miner.py चिह्नित AST नोड्स को git blame और PR #212 इंसिडेंट इतिहास के साथ जोड़ता है।'
                  : 'provenance_miner.py correlates flagged AST nodes with git blame commits, PR discussions, and incident tickets.',
            },
            {
              step: 3,
              node_id: 'node-speech',
              title: isTe
                ? 'Gnani Vachana వాయిస్ ఇంజిన్'
                : isHi
                  ? 'Gnani Vachana वॉइस इंजन'
                  : 'Gnani Vachana Indic Speech Engine',
              text: isTe
                ? 'gnani_speech.py తెలుగు, హిందీ మరియు ఇంగ్లీష్ 10-సెకన్ల వాయిస్ నోట్స్‌ను స్వీకరించి AST సింబల్స్‌తో రీస్కోర్ చేస్తుంది.'
                : isHi
                  ? 'gnani_speech.py तेलुगु, हिंदी और इंग्लिश के 10-सेकंड वॉइस नोट्स को ट्रांसक्राइब करके AST सिंबल्स से जोड़ता है।'
                  : 'gnani_speech.py transcribes 10-second Telugu, Hindi, and English voice confirmations and rescores AST symbols.',
            },
            {
              step: 4,
              node_id: 'node-compiler',
              title: isTe
                ? 'ఇన్‌వేరియంట్ టెస్ట్ కంపైలర్'
                : isHi
                  ? 'इनवेरिएंट टेस्ट कंपाइलर'
                  : 'Spoken Fence Invariant Compiler',
              text: isTe
                ? 'fence_compiler.py వాయిస్ నోట్స్ నుండి JUnit 5 మరియు Pytest ఇన్‌వేరియంట్ టెస్టులను స్వయంచాలకంగా కంపైల్ చేస్తుంది.'
                : isHi
                  ? 'fence_compiler.py वॉइस नोट्स से JUnit 5 और Pytest इनवेरिएंट टेस्ट को स्वचालित रूप से कंपाइल करता है।'
                  : 'fence_compiler.py compiles spoken voice confirmations into executable JUnit 5 and Pytest regression tests.',
            },
            {
              step: 5,
              node_id: 'node-mcp',
              title: isTe
                ? 'FastMCP ప్రీ-కమిట్ గార్డ్'
                : isHi
                  ? 'FastMCP प्री-कमिट गार्ड'
                  : 'FastMCP Pre-Commit Guardrail',
              text: isTe
                ? 'mcp_server.py రక్షిత స్పోకెన్ ఫెన్స్‌లను తొలగించే AI ఏజెంట్ ఎడిట్‌లను ప్రీ-కమిట్ దశలోనే అడ్డుకుంటుంది.'
                : isHi
                  ? 'mcp_server.py सुरक्षित स्पोकन फ़ेंस को हटाने वाले AI एजेंट एडिट्स को प्री-कमिट स्तर पर ही ब्लॉक करता है।'
                  : 'mcp_server.py intercepts AI agent diffs and hard-blocks edits that violate active Spoken Fences.',
            },
          ]
        : [
            {
              step: 1,
              node_id: 'node-auth',
              title: isTe
                ? 'ఎడ్జ్ ఇంగ్రెస్ గార్డ్'
                : isHi
                  ? 'एज इंग्रेस गार्ड'
                  : 'Edge Ingress Guard',
              text: isTe
                ? 'గ్రామీణ శాటిలైట్ క్లినిక్‌ల కోసం JwtClockSkewFilter 180 సెకన్ల టాలరెన్స్‌ను అనుమతిస్తుంది.'
                : isHi
                  ? 'ग्रामीण सैटेलाइट क्लिनिक के लिए JwtClockSkewFilter 180 सेकंड का क्लॉक स्क्यू टॉलरेंस देता है।'
                  : 'Incoming hospital requests enter JwtClockSkewFilter with 180s tolerance for rural satellite clinics.',
            },
            {
              step: 2,
              node_id: 'node-gateway',
              title: isTe
                ? 'కోర్ సెటిల్‌మెంట్ ఇంజిన్'
                : isHi
                  ? 'कोर सेटलमेंट इंजन'
                  : 'Core Settlement Engine',
              text: isTe
                ? 'GatewayRouter dispatchSettlement అర్ధరాత్రి ప్యాకెట్ డ్రాప్‌లను తట్టుకోవడానికి retryCount = 5 ను ఉంచుతుంది.'
                : isHi
                  ? 'GatewayRouter dispatchSettlement मिडनाइट पैकेट ड्रॉप को सहने के लिए retryCount = 5 को बनाए रखता है।'
                  : 'GatewayRouter dispatchSettlement preserves retryCount = 5 to tolerate midnight v1 load balancer drops.',
            },
            {
              step: 3,
              node_id: 'node-imaging',
              title: isTe
                ? 'హార్డ్‌వేర్ DMA పైప్‌లైన్'
                : isHi
                  ? 'हार्डवेयर DMA पाइपलाइन'
                  : 'Hardware DMA Pipeline',
              text: isTe
                ? 'Adreno 619 GPU DMA బదిలీ పూర్తి కావడానికి DicomShaderPipeline 120ms వేచి ఉంటుంది.'
                : isHi
                  ? 'Adreno 619 GPU DMA ट्रांसफर पूरा होने के लिए DicomShaderPipeline 120ms रुकता है।'
                  : 'DicomShaderPipeline pauses 120ms to allow Adreno 619 GPU DMA transfers to finish cleanly.',
            },
            {
              step: 4,
              node_id: 'node-billing',
              title: isTe
                ? 'ట్రెజరీ రౌండింగ్ ఇంజిన్'
                : isHi
                  ? 'ट्रेजरी राउंडिंग इंजन'
                  : 'Treasury Rounding Engine',
              text: isTe
                ? 'AP CFMS ట్రెజరీ పన్ను ఆడిట్ కోసం gst_rounding_engine 0.00001 ఎప్సిలాన్ బయాస్‌ను వర్తింపజేస్తుంది.'
                : isHi
                  ? 'AP CFMS ट्रेजरी टैक्स ऑडिट के लिए gst_rounding_engine 0.00001 एप्सिलॉन बायस लगाता है।'
                  : 'gst_rounding_engine applies 0.00001 epsilon bias for AP CFMS treasury tax audits.',
            },
            {
              step: 5,
              node_id: 'node-mcp',
              title: isTe
                ? 'MCP ప్రీ-కమిట్ గేట్'
                : isHi
                  ? 'MCP प्री-कमिट गेट'
                  : 'Model Context Protocol Gate',
              text: isTe
                ? 'WhyLine MCP ప్రీ-కమిట్ హుక్స్ రక్షిత వర్క్‌అరౌండ్‌లను తొలగించే AI ఎడిట్‌లను అడ్డుకుంటాయి.'
                : isHi
                  ? 'WhyLine MCP प्री-कमिट हुक सुरक्षित वर्कअराउंड को हटाने वाले AI एडिट्स को रोकते हैं।'
                  : 'WhyLine MCP pre-commit hooks intercept automated AI diffs that attempt to remove workarounds.',
            },
          ];

      const narration = rawNarration.map((item) => {
        const simpleMeta = getStepSimpleExplanationAndExample(
          item.step,
          parsedRepo.is_whyline_repo,
          lang
        );
        return {
          ...item,
          technical_summary: item.text,
          simple_explanation: simpleMeta.simple_explanation,
          real_world_example: simpleMeta.real_world_example,
          text: simpleMeta.spoken_narration,
          language: lang,
          audio_url: `/api/git/speak?language=${encodeURIComponent(lang)}&step=${item.step}&text=${encodeURIComponent(simpleMeta.spoken_narration)}`,
        };
      });

      const repoReasoning = buildReasonedCodebaseExplanation({
        question: parsedRepo.is_whyline_repo ? 'whyline architecture' : 'double charge retry',
        fenceId: 'FENCE-001',
        language: lang,
        repoSlug: parsedRepo.repo_slug,
      });

      return new Response(
        JSON.stringify({
          repo_name: parsedRepo.repo_name,
          repo_slug: parsedRepo.repo_slug,
          github_url: parsedRepo.github_url,
          reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.HIGH)',
          repo_reasoning: repoReasoning,
          repo_metadata: {
            name: parsedRepo.repo_name,
            slug: parsedRepo.repo_slug,
            branch: validation.sanitizedBranch,
            target: validation.sanitizedTarget,
          },
          voice_analysis: {
            speaker: 'Nalini (Gnani Vachana timbre-v2.5)',
            language: lang,
            sample_rate_hz: 16000,
            encoding: '16-bit Mono PCM WAV + WebSpeech TTS',
            fundamental_hz: isTe ? 215 : isHi ? 198 : 185,
            cadence_hz: isTe ? 5.2 : isHi ? 4.6 : 4.1,
            verified_streams: narration.length,
          },
          scanned_files_count: parsedRepo.is_whyline_repo ? 31 : 24,
          total_sloc: parsedRepo.is_whyline_repo ? 4680 : 3420,
          flowchart_graph: graph,
          narration,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 13. GET /api/git/speak and /api/audio/:filename (Remediation VULN-05: whitelist audio stems)
    if (pathWithoutQuery.startsWith('audio/') || pathWithoutQuery === 'git/speak') {
      if (pathWithoutQuery.startsWith('audio/')) {
        const requestedFile = pathWithoutQuery.replace(/^audio\//, '').toLowerCase();
        const isKnownFenceAudio =
          /^fence-\d{3}(_confirmed)?\.wav$/.test(requestedFile) ||
          requestedFile.startsWith('checkpoint_') ||
          requestedFile.startsWith('flow_') ||
          requestedFile.startsWith('git_') ||
          requestedFile.startsWith('copilot_');

        if (!isKnownFenceAudio) {
          return new Response(
            JSON.stringify({
              detail: 'Audio stem not in approved Spoken Fence registry (VULN-05 DoS guard).',
            }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      const reqLang = queryParams.get('language') || body.language || 'en-IN';
      const reqStep = Number(queryParams.get('step') || 1);
      const wavBlob = createWavBlob(1.35, 200, reqLang, reqStep);
      return new Response(wavBlob, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'X-TTS-Provider': 'Gnani-Vachana-Timbre-16kHz',
          'X-Voice-Language': reqLang,
          'X-Voice-Step': String(reqStep),
        },
      });
    }

    // 14. GET /api/settings
    if (pathWithoutQuery === 'settings' && method === 'GET') {
      return new Response(
        JSON.stringify({
          repo_path: 'demo-repos/HealthConnect',
          gateway_version: gatewayVersion,
          security_hardening: {
            cors_origins: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
            git_scanner_containment: 'ENFORCED_WORKSPACE_ROOT_AND_HTTPS_ONLY',
            audio_dos_whitelist: 'ENFORCED_FENCE_STEM_ALLOWLIST',
            mcp_diff_hunk_parser: 'ACTIVE_LINE_RANGE_INTERSECTION',
          },
          providers: {
            gnani_vachana_speech: {
              configured: true,
              stt_model: 'prisma-v2.5',
              tts_model: 'timbre-v2.5',
              mode: 'Live Gnani Vachana + 16kHz WAV Synthesizer',
            },
            supabase_pgvector: {
              configured: false,
              rpc_function: 'match_whyline_code_and_fences',
              mode: 'Local RRF + SQL Migration Ready (< 250ms ceiling)',
            },
            llm_fence_compiler: {
              configured: true,
              models: 'gemini-3.8-flash / llama-3.3-70b-versatile',
              mode: 'Multilingual AST-to-Fence Compiler (EN / TE / HI)',
            },
          },
          git_hooks: {
            pre_commit: 'INSTALLED_ACTIVE',
            mcp_gate: 'READY',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: `Not found: ${pathWithoutQuery}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
}

export function setupMockApiInterceptor() {
  if (typeof window === 'undefined') return;
  try {
    Object.defineProperty(window, 'fetch', {
      value: apiFetch,
      writable: true,
      configurable: true,
    });
  } catch {
    try {
      // Fallback if Window prototype owns the getter
      if (window.Window && window.Window.prototype) {
        Object.defineProperty(window.Window.prototype, 'fetch', {
          value: apiFetch,
          writable: true,
          configurable: true,
        });
      }
    } catch {
      // Ignore if environment freezes fetch; components use apiFetch directly
    }
  }
}
