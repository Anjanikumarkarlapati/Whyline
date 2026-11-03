import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toBcp47,
  fromBcp47,
  resolveSafeSpeechLang,
  rescoreSpokenTranscriptWithAst,
  parseDiffHunkRanges,
  doesDiffIntersectFence,
  doesFilePathMatchFence,
  computeAstAnomalyHash,
  upgradeGatewayYamlConfig,
  validateGitScanInput,
} from './fenceLogic.js';
import {
  buildGeminiCodebasePrompt,
  buildReasonedCodebaseExplanation,
  getStepSimpleExplanationAndExample,
} from './codebaseReasoning.js';

describe('Full-Stack Language Synchronization & BCP-47 Mapping', () => {
  it('maps short UI language codes to BCP-47 tags without ternary inversion', () => {
    assert.equal(toBcp47('en'), 'en-IN');
    assert.equal(toBcp47('te'), 'te-IN');
    assert.equal(toBcp47('hi'), 'hi-IN');
    assert.equal(toBcp47('en-IN'), 'en-IN');
    assert.equal(toBcp47('te-IN'), 'te-IN');
    assert.equal(toBcp47('hi-IN'), 'hi-IN');
    assert.equal(toBcp47(undefined), 'en-IN');
  });

  it('maps BCP-47 tags back to short UI codes', () => {
    assert.equal(fromBcp47('en-IN'), 'en');
    assert.equal(fromBcp47('te-IN'), 'te');
    assert.equal(fromBcp47('hi-IN'), 'hi');
    assert.equal(fromBcp47('unknown'), 'en');
  });

  it('prevents speech synthesis distortion when response text is Latin/English but UI is te-IN or hi-IN', () => {
    // Pure English text with Telugu UI selected -> should fallback safely to en-IN
    assert.equal(
      resolveSafeSpeechLang('Inject deterministic X-Idempotency-Key inside the retry loop.', 'te-IN'),
      'en-IN'
    );
    // Telugu Unicode script -> speaks in te-IN
    assert.equal(
      resolveSafeSpeechLang('PR #212 ఫెన్స్‌ను మార్చకుండా X-Idempotency-Key జోడించండి.', 'te-IN'),
      'te-IN'
    );
    // Devanagari script -> speaks in hi-IN
    assert.equal(
      resolveSafeSpeechLang('PR #212 फ़ेंस को बदले बिना X-Idempotency-Key जोड़ें।', 'hi-IN'),
      'hi-IN'
    );
  });
});

describe('AST Vocabulary Rescoring for Spoken Fences', () => {
  it('rescores spoken code terms to exact camelCase/PascalCase AST tokens', () => {
    const input = 'Avunu, gateway router lo retry count = 5 and timeout ms = 4500 until application yml flips gateway dot version to v2.';
    const result = rescoreSpokenTranscriptWithAst(input);
    assert.ok(result.rescored.includes('GatewayRouter'));
    assert.ok(result.rescored.includes('retryCount'));
    assert.ok(result.rescored.includes('timeoutMs'));
    assert.ok(result.rescored.includes('application.yml'));
    assert.ok(result.rescored.includes('gateway.version'));
    assert.ok(result.replacements.length >= 5);
  });
});

describe('MCP Pre-Commit Guardrail Hunk & Path Matching (Defects 3.2 & 3.3)', () => {
  it('parses unified diff hunk headers accurately', () => {
    const diff = `@@ -18,7 +18,7 @@ public PaymentReceipt dispatchSettlement
- int retryCount = 5;
+ int retryCount = 1;`;
    const ranges = parseDiffHunkRanges(diff);
    assert.equal(ranges.length, 1);
    assert.deepEqual(ranges[0], { startLine: 18, endLine: 24, start: 18, end: 24 });
  });

  it('rejects edits intersecting fence line range or touching guarded tokens', () => {
    const fence = {
      id: 'FENCE-001',
      file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      start_line: 18,
      end_line: 28,
      matched_token: 'int retryCount = 5; long timeoutMs = 4500;',
    };

    // Hunk at line 20 intersects [18, 28]
    const intersectingDiff = `@@ -20,3 +20,3 @@
- int retryCount = 5;
+ int retryCount = 1;`;
    assert.equal(doesDiffIntersectFence(intersectingDiff, fence), true);

    // Hunk at line 120 does NOT intersect [18, 28] and does not touch guarded tokens
    const distantDiff = `@@ -120,2 +120,3 @@
+ System.out.println("Unrelated log line");`;
    assert.equal(doesDiffIntersectFence(distantDiff, fence), false);
  });

  it('matches relative path suffixes instead of bare colliding filenames', () => {
    const fencePath = 'src/main/java/com/healthconnect/payments/GatewayRouter.java';
    assert.equal(
      doesFilePathMatchFence('/workspace/demo-repos/HealthConnect/src/main/java/com/healthconnect/payments/GatewayRouter.java', fencePath),
      true
    );
    // Different package with same bare filename should NOT collide if multi-segment path is given
    assert.equal(
      doesFilePathMatchFence('src/main/java/com/other/ billing/GatewayRouter.java', fencePath),
      false
    );
  });
});

describe('AST Anomaly Hash & YAML Config Upgrade Regex (Defect 3.4 & Section 1.2)', () => {
  it('includes anomaly_type and start_line in AST hash so secondary anomalies in the same method do not collide', () => {
    const h1 = computeAstAnomalyHash('GatewayRouter.java', 'dispatchSettlement', 'MAGIC_NUMBER_RETRY', 19, 'retryCount = 5');
    const h2 = computeAstAnomalyHash('GatewayRouter.java', 'dispatchSettlement', 'HARDCODED_SLEEP', 25, 'Thread.sleep(200)');
    assert.notEqual(h1, h2);
  });

  it('upgrades both unquoted and double-quoted version: v1 in application.yml', () => {
    const unquotedYaml = `gateway:\n  provider: razorpay\n  version: v1\n`;
    const quotedYaml = `gateway:\n  provider: razorpay\n  version: "v1"\n`;
    assert.ok(upgradeGatewayYamlConfig(unquotedYaml, 'v2').includes('version: "v2"'));
    assert.ok(upgradeGatewayYamlConfig(quotedYaml, 'v2').includes('version: "v2"'));
  });
});

describe('Security Sanitization for Git Scanner (VULN-02, VULN-03, VULN-04)', () => {
  it('blocks git option injection (leading hyphen) and ext:: protocol smuggling', () => {
    assert.equal(validateGitScanInput('.', '--upload-pack=touch').valid, false);
    assert.equal(validateGitScanInput('ext::sh -c touch% /tmp/pwn', 'main').valid, false);
    assert.equal(validateGitScanInput('../../etc/passwd', 'main').valid, false);
    assert.equal(validateGitScanInput('demo-repos/HealthConnect', 'main').valid, true);
  });
});

describe('Gemini Codebase Reasoning — Simple Terms & Real-World Examples in All 3 Languages', () => {
  it('builds Gemini system instructions enforcing simple terms and real-world analogies', () => {
    const promptTe = buildGeminiCodebasePrompt({
      question: 'Why does GatewayRouter retry 5 times?',
      language: 'te',
    });
    assert.equal(promptTe.bcp47, 'te-IN');
    assert.ok(promptTe.systemInstruction.includes('SIMPLE, EVERYDAY TERMS'));
    assert.ok(promptTe.systemInstruction.includes('REAL-WORLD EXAMPLE'));
    assert.ok(promptTe.systemInstruction.includes('Telugu'));
  });

  it('produces reasoned simple explanations and real-world examples in English, Telugu, and Hindi', () => {
    const en = buildReasonedCodebaseExplanation({
      question: 'How do we fix double-charge in GatewayRouter?',
      language: 'en-IN',
    });
    const te = buildReasonedCodebaseExplanation({
      question: 'How do we fix double-charge in GatewayRouter?',
      language: 'te-IN',
    });
    const hi = buildReasonedCodebaseExplanation({
      question: 'How do we fix double-charge in GatewayRouter?',
      language: 'hi-IN',
    });

    assert.ok(en.simple_explanation.length > 30);
    assert.ok(en.real_world_example.includes('Example'));
    assert.equal(en.reasoning_steps.length, 3);

    // Telugu script check (\u0C00-\u0C7F)
    assert.ok(/[\u0C00-\u0C7F]/.test(te.simple_explanation));
    assert.ok(/[\u0C00-\u0C7F]/.test(te.real_world_example));
    assert.ok(/[\u0C00-\u0C7F]/.test(te.spoken_reply));

    // Hindi Devanagari script check (\u0900-\u097F)
    assert.ok(/[\u0900-\u097F]/.test(hi.simple_explanation));
    assert.ok(/[\u0900-\u097F]/.test(hi.real_world_example));
    assert.ok(/[\u0900-\u097F]/.test(hi.spoken_reply));
  });

  it('enriches flowchart steps with simple explanations and real-world analogies in all 3 languages', () => {
    const stepEn = getStepSimpleExplanationAndExample(1, true, 'en-IN');
    const stepTe = getStepSimpleExplanationAndExample(1, true, 'te-IN');
    const stepHi = getStepSimpleExplanationAndExample(1, true, 'hi-IN');

    assert.ok(stepEn.real_world_example.includes('X-ray'));
    assert.ok(/[\u0C00-\u0C7F]/.test(stepTe.spoken_narration));
    assert.ok(/[\u0900-\u097F]/.test(stepHi.spoken_narration));
  });
});

