import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubRepoInput,
  rescoreSpokenTranscript,
  classifyTaskIntent,
  executeCopilotTaskForQuestion,
} from './sttPipeline.js';

test('parseGitHubRepoInput parses full GitHub URLs and owner/repo shorthands', () => {
  const parsedUrl = parseGitHubRepoInput('https://github.com/expressjs/express');
  assert.equal(parsedUrl.owner, 'expressjs');
  assert.equal(parsedUrl.repo, 'express');
  assert.equal(parsedUrl.fullName, 'expressjs/express');
  assert.equal(parsedUrl.isLocal, false);

  const parsedShort = parseGitHubRepoInput('sindresorhus/ky');
  assert.equal(parsedShort.fullName, 'sindresorhus/ky');
  assert.equal(parsedShort.isLocal, false);

  const parsedLocal = parseGitHubRepoInput('HealthConnect');
  assert.equal(parsedLocal.isLocal, true);
});

test('rescoreSpokenTranscript replaces spoken terms with exact AST symbols and dynamic repo files', () => {
  const raw =
    'How do we fix double charge in gateway router without breaking retry count = 5 using idempotency key until application yml is updated to gateway dot version v2?';
  const result = rescoreSpokenTranscript(raw, 'en-IN');

  assert.equal(result.status, 'ok');
  assert.ok(result.rescored_transcript.includes('GatewayRouter.java'));
  assert.ok(!result.rescored_transcript.includes('GatewayRouter.java.java'));
  assert.ok(result.rescored_transcript.includes('retryCount = 5'));
  assert.ok(result.rescored_transcript.includes('X-Idempotency-Key'));
  assert.ok(result.rescored_transcript.includes('config/application.yml'));
  assert.ok(result.ast_replacements.length >= 4);
  assert.equal(result.detected_intent, 'FIX_PAYMENT_DOUBLE_CHARGE_SAFELY');

  // Calling rescoreSpokenTranscript again on an already-rescored string must be idempotent
  const secondPass = rescoreSpokenTranscript(result.rescored_transcript, 'en-IN');
  assert.equal(secondPass.rescored_transcript, result.rescored_transcript);

  // Dynamic GitHub repository symbol rescoring
  const dynamicRes = rescoreSpokenTranscript(
    'How does route dispatch work in application?',
    'en-IN',
    ['lib/application.js', 'lib/router/index.js']
  );
  assert.ok(dynamicRes.rescored_transcript.includes('application.js'));
});

test('classifyTaskIntent routes spoken questions to the right architectural task', () => {
  assert.equal(
    classifyTaskIntent('Can we remove Thread.sleep(120) in DicomShaderPipeline.java?'),
    'INSPECT_DICOM_SHADER_FENCE'
  );
  assert.equal(
    classifyTaskIntent('Why does JwtClockSkewFilter allow 180 seconds of drift?'),
    'INSPECT_JWT_CLOCK_SKEW_FENCE'
  );
  assert.equal(
    classifyTaskIntent('Fix double-charge bug in GatewayRouter.java retryCount = 5'),
    'FIX_PAYMENT_DOUBLE_CHARGE_SAFELY'
  );
});

test('executeCopilotTaskForQuestion executes the asked task for both default and custom GitHub repos', () => {
  const dicomTask = executeCopilotTaskForQuestion(
    'Can we remove thread dot sleep 120 in dicom shader pipeline on clinic tablets?',
    'en-IN'
  );
  assert.equal(dicomTask.executed_task.fence_id, 'FENCE-003');
  assert.equal(
    dicomTask.executed_task.target_file,
    'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java'
  );
  assert.equal(dicomTask.strategies.length, 3);
  assert.ok(dicomTask.recommended_patch.includes('Thread.sleep(120)'));

  const customRepoContext = {
    owner: 'expressjs',
    repo: 'express',
    fullName: 'expressjs/express',
    url: 'https://github.com/expressjs/express',
    branch: 'master',
    isLocal: false,
    description: 'Fast, unopinionated, minimalist web framework for node.',
    symbols: ['lib/application.js', 'lib/router/index.js'],
    files: [
      {
        path: 'lib/application.js',
        shortName: 'application.js',
        language: 'javascript',
        defaultLine: 14,
        fenceId: 'FENCE-EXP-01',
        code: `var Router = require('./router');\nvar app = exports = module.exports = {};\napp.init = function init() {\n  this.cache = {};\n  this.engines = {};\n  this.settings = {};\n};\napp.use = function use(fn) {\n  var offset = 0;\n  var path = '/';\n  this.lazyrouter();\n  this._router.use(path, fn);\n  return this;\n};`,
      },
    ],
  };

  const expressTask = executeCopilotTaskForQuestion(
    'How does app.use mount middleware in application?',
    'en-IN',
    [],
    customRepoContext
  );
  assert.equal(expressTask.repo_full_name, 'expressjs/express');
  assert.equal(expressTask.executed_task.target_file, 'lib/application.js');
  assert.ok(expressTask.spoken_reply.includes('expressjs/express'));
  assert.ok(expressTask.referenced_files.length >= 1);
});
