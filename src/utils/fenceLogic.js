/**
 * Pure Full-Stack Language Synchronization, AST Rescorer, Diff Hunk Line-Intersection,
 * and Git Scanner Security Sanitization Logic.
 */

export const toBcp47 = (lang) => {
  const s = String(lang || '').toLowerCase();
  if (s.startsWith('hi')) return 'hi-IN';
  if (s.startsWith('te')) return 'te-IN';
  return 'en-IN';
};

export const fromBcp47 = (bcp) => {
  const s = String(bcp || '').toLowerCase();
  if (s.startsWith('hi')) return 'hi';
  if (s.startsWith('te')) return 'te';
  return 'en';
};

/**
 * Inspects text to determine if it is predominantly English ASCII so Browser SpeechSynthesis
 * does not attempt to speak English sentences with Indic (te-IN / hi-IN) phonemes.
 */
export function resolveSafeSpeechLang(text, preferredLang) {
  const str = String(text || '').trim();
  if (!str) return toBcp47(preferredLang);

  // Check if string contains Telugu (\u0C00-\u0C7F) or Devanagari (\u0900-\u097F) script
  const hasTeluguScript = /[\u0C00-\u0C7F]/.test(str);
  const hasDevanagariScript = /[\u0900-\u097F]/.test(str);

  if (hasTeluguScript) return 'te-IN';
  if (hasDevanagariScript) return 'hi-IN';

  // Check for common romanized Telugu / Hindi markers if user is in te/hi mode
  const lower = str.toLowerCase();
  const shortPref = fromBcp47(preferredLang);
  const tenglishMarkers = ['avunu', 'alage', 'unchandi', 'endukante', 'marustaru', 'pettamu', 'chestundi', 'lo '];
  const hinglishMarkers = ['haan', 'bilkul', 'mat ', 'hatana', 'jab tak', 'mein ', 'rakhein', 'karein'];

  if (shortPref === 'te' && tenglishMarkers.some((m) => lower.includes(m))) {
    return 'te-IN';
  }
  if (shortPref === 'hi' && hinglishMarkers.some((m) => lower.includes(m))) {
    return 'hi-IN';
  }

  // Pure English response text -> force en-IN so browser TTS doesn't distort English with Indic phonemes
  return 'en-IN';
}

/**
 * AST Vocabulary Rescorer: Replaces spoken natural language terms with exact codebase AST symbols.
 */
export const REPO_AST_VOCABULARY = [
  { spoken: 'gateway router', ast_symbol: 'GatewayRouter.java', patterns: [/gateway\s+router(\.java)?/gi] },
  { spoken: 'dispatch settlement', ast_symbol: 'dispatchSettlement', patterns: [/dispatch\s+settlement/gi] },
  { spoken: 'retry count', ast_symbol: 'retryCount', patterns: [/retry\s+count/gi] },
  { spoken: 'timeout ms', ast_symbol: 'timeoutMs', patterns: [/timeout\s+ms/gi] },
  { spoken: 'application yml', ast_symbol: 'application.yml', patterns: [/application\s+yml/gi] },
  { spoken: 'gateway dot version', ast_symbol: 'gateway.version', patterns: [/gateway\s+dot\s+version/gi] },
  { spoken: 'dicom shader pipeline', ast_symbol: 'DicomShaderPipeline.java', patterns: [/dicom\s+shader(\s+pipeline)?/gi] },
  { spoken: 'thread sleep', ast_symbol: 'Thread.sleep(120)', patterns: [/thread\s+sleep(\s+120)?/gi] },
  { spoken: 'jwt clock skew filter', ast_symbol: 'JwtClockSkewFilter.java', patterns: [/jwt\s+clock\s+skew(\s+filter)?/gi] },
  { spoken: 'clock skew seconds', ast_symbol: 'clockSkewSeconds', patterns: [/clock\s+skew\s+seconds/gi] },
  { spoken: 'trust all certs', ast_symbol: 'TrustAllCerts', patterns: [/trust\s+all\s+certs/gi] },
  { spoken: 'shadow cache', ast_symbol: 'shadow_cache', patterns: [/shadow\s+cache/gi] },
  { spoken: 'epsilon bias', ast_symbol: 'epsilon_bias', patterns: [/epsilon\s+bias/gi] },
];

export function rescoreSpokenTranscriptWithAst(rawTranscript) {
  let rescored = String(rawTranscript || '').trim();
  const replacements = [];

  for (const entry of REPO_AST_VOCABULARY) {
    for (const regex of entry.patterns) {
      if (regex.test(rescored)) {
        rescored = rescored.replace(regex, entry.ast_symbol);
        replacements.push({
          spoken: entry.spoken,
          ast_symbol: entry.ast_symbol,
        });
      }
    }
  }

  return {
    raw_transcript: rawTranscript,
    rescored_transcript: rescored,
    rescored,
    ast_replacements: replacements,
    replacements,
  };
}

/**
 * Remediation 3.2: Parse unified diff hunk headers (@@ -start,count +start,count @@)
 * or fallback to line content checking to verify whether a proposed edit intersects
 * the guarded [fence.start_line, fence.end_line] range.
 */
export function parseDiffHunkRanges(proposedDiff) {
  const diffStr = String(proposedDiff || '');
  const ranges = [];
  const hunkRegex = /@@\s*-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s*@@/g;
  let match;

  while ((match = hunkRegex.exec(diffStr)) !== null) {
    const startLine = parseInt(match[1], 10);
    const lineCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
    const endLine = startLine + Math.max(0, lineCount - 1);
    ranges.push({ startLine, endLine, start: startLine, end: endLine });
  }

  return ranges;
}

export function doesDiffIntersectFence(arg1, arg2) {
  const isFirstString = typeof arg1 === 'string';
  const fence = isFirstString ? (arg2 || {}) : (arg1 || {});
  const proposedDiff = isFirstString ? arg1 : arg2;

  const diffStr = String(proposedDiff || '').trim();
  if (!diffStr) return true;

  const hunkRanges = parseDiffHunkRanges(diffStr);
  if (hunkRanges.length > 0) {
    return hunkRanges.some(
      (r) => r.startLine <= fence.end_line && r.endLine >= fence.start_line
    );
  }

  // If no explicit @@ hunk header was supplied, check if the diff removes or modifies
  // the fence's matched_token or key tokens in the guarded snippet
  const token = String(fence.matched_token || '').split('=')[0].trim();
  if (token && diffStr.includes(token)) {
    return true;
  }
  if (diffStr.includes('retryCount') || diffStr.includes('timeoutMs') || diffStr.includes('Thread.sleep')) {
    return true;
  }

  return false;
}

/**
 * Remediation 3.3: Match relative repository path suffixes instead of bare filenames
 * so editing an unrelated scratch/GatewayRouter.java does not trigger false-positive blocks.
 */
export function doesFilePathMatchFence(targetFilePath, fenceFilePath) {
  const normTarget = String(targetFilePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
  const normFence = String(fenceFilePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');

  if (!normTarget || !normFence) return false;
  if (normTarget === normFence) return true;
  if (normTarget.endsWith(`/${normFence}`)) return true;

  return false;
}

/**
 * Remediation 3.4: Compute unique AST anomaly signature hash including anomalyType and startLine
 * so secondary anomalies inside the same method are never silently dropped.
 */
export function computeAstAnomalyHash(relPath, className, methodName, anomalyType = 'GENERIC', startLine = 1) {
  const raw = `${relPath}::${className}::${methodName}::${anomalyType}::L${startLine}`;
  let h1 = 0xdeadbeef ^ raw.length;
  let h2 = 0x41c6ce57 ^ raw.length;
  for (let i = 0, ch; i < raw.length; i++) {
    ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/**
 * Remediation 1.2: Support both quoted and unquoted YAML version values (`version: v1` and `version: "v1"`).
 */
export function upgradeGatewayYamlConfig(yamlContent, nextVersion = 'v2') {
  return String(yamlContent || '').replace(
    /version:\s*"?v1"?/g,
    `version: "${nextVersion}"`
  );
}

/**
 * Remediation 2 (VULN-02, VULN-03, VULN-04): Validate Git scanner targets & branches.
 */
export function validateGitScanInput(targetPathOrUrl, branch = 'main') {
  const b = String(branch || 'main').trim();
  if (b.startsWith('-') || !/^[A-Za-z0-9_./-]+$/.test(b)) {
    return {
      valid: false,
      error: 'Invalid branch name: branch cannot start with "-" or contain shell metacharacters (VULN-03 guard).',
    };
  }

  const target = String(targetPathOrUrl || '').trim();
  if (!target) {
    return { valid: false, error: 'Repository path or URL is required.' };
  }

  // Reject git ext:: remote protocol smuggling (VULN-04)
  if (/^ext::/i.test(target) || /[;|&$`\n\r]/.test(target)) {
    return {
      valid: false,
      error: 'Blocked unsafe protocol or shell metacharacter in repository target (VULN-04 guard).',
    };
  }

  // Reject directory traversal outside workspace root (VULN-02)
  if (
    target.includes('..') ||
    /^[A-Za-z]:\\/.test(target) ||
    target.startsWith('/etc') ||
    target.startsWith('/root') ||
    target.startsWith('/Users') ||
    target.startsWith('/home') ||
    target.includes('.ssh')
  ) {
    return {
      valid: false,
      error: 'Directory traversal outside approved workspace roots is forbidden (VULN-02 guard).',
    };
  }

  const isRemote = target.startsWith('https://github.com/') || target.startsWith('git@github.com:');
  const isApprovedLocal =
    target === '.' ||
    target === 'HealthConnect' ||
    target === 'demo-repos/HealthConnect' ||
    target.startsWith('demo-repos/');

  if (!isRemote && !isApprovedLocal) {
    return {
      valid: false,
      error: 'Target must be an approved workspace repository or https://github.com/ URL.',
    };
  }

  return { valid: true, sanitizedTarget: target, sanitizedBranch: b };
}
