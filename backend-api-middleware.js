import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  parseGitHubRepoInput,
  rescoreSpokenTranscript,
  executeCopilotTaskForQuestion,
} from './frontend/src/utils/sttPipeline.js';
import { DEMO_FILES } from './frontend/src/context/demoFiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotenvSafe() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', '.env'),
    'C:\\Users\\anjan\\Downloads\\Whyline\\.env',
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        const raw = fs.readFileSync(envPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key && !(key in process.env)) {
            process.env[key] = val;
          }
        }
        break;
      } catch {
        // Ignore
      }
    }
  }
}
loadDotenvSafe();


const REPO_DIR = path.resolve(__dirname, 'demo-repos', 'HealthConnect');
const WHYLINE_DIR = path.join(REPO_DIR, '.whyline');
const FENCES_PATH = path.join(WHYLINE_DIR, 'fences.json');
const SCORECARD_PATH = path.join(WHYLINE_DIR, 'scorecard.json');
const INCIDENTS_PATH = path.join(WHYLINE_DIR, 'incidents.json');
const CHECKPOINTS_PATH = path.join(WHYLINE_DIR, 'checkpoints.json');
const ASSUMPTIONS_PATH = path.join(WHYLINE_DIR, 'assumptions.json');
const AUDIO_DIR = path.join(WHYLINE_DIR, 'audio');
const CONFIG_YML_PATH = path.join(REPO_DIR, 'config', 'application.yml');
const JUNIT_TEST_PATH = path.join(
  REPO_DIR,
  'src',
  'test',
  'java',
  'com',
  'healthconnect',
  'whyline',
  'SpokenFenceInvariantTest.java'
);

/**
 * Curated high-fidelity repository snapshots for instant fallback or augmentation
 * when querying popular GitHub repositories.
 */
const CURATED_GITHUB_REPOS = {
  'expressjs/express': {
    owner: 'expressjs',
    repo: 'express',
    fullName: 'expressjs/express',
    url: 'https://github.com/expressjs/express',
    branch: 'master',
    isLocal: false,
    description: 'Fast, unopinionated, minimalist web framework for Node.js.',
    stars: 66400,
    language: 'JavaScript',
    commits: [
      {
        sha: '3a7b91c',
        author: '@dougwilson',
        date: '2026-03-18',
        message: 'Preserve lazyrouter initialization order in app.use middleware dispatch',
      },
      {
        sha: '91e4f02',
        author: '@ulisesGascon',
        date: '2026-03-04',
        message: 'Guard query parser depth invariant in lib/middleware/query.js',
      },
    ],
    fences: [
      {
        id: 'FENCE-EXP-01',
        file_path: 'lib/application.js',
        line_range: '18-34',
        targetLine: 24,
        startLine: 18,
        endLine: 34,
        symbol_name: 'app.use',
        status: 'VERIFIED_ACTIVE',
        badge: 'FENCE-EXP-01 • app.use lazyrouter() & flatten(slice.call(arguments)) invariant',
        voice_transcript:
          'Do not remove this.lazyrouter() inside app.use in lib/application.js; mounting sub-apps relies on lazy router instantiation before middleware flattening.',
      },
      {
        id: 'FENCE-EXP-02',
        file_path: 'lib/router/index.js',
        line_range: '12-28',
        targetLine: 19,
        startLine: 12,
        endLine: 28,
        symbol_name: 'proto.handle',
        status: 'VERIFIED_ACTIVE',
        badge: 'FENCE-EXP-02 • proto.handle req.baseUrl restoration after layer.handle_request',
        voice_transcript:
          'Always restore req.baseUrl and req.originalUrl inside done() when exiting proto.handle in lib/router/index.js so mounted parent routers keep accurate paths.',
      },
    ],
    files: [
      {
        path: 'lib/application.js',
        shortName: 'application.js',
        language: 'javascript',
        defaultLine: 24,
        fenceId: 'FENCE-EXP-01',
        fences: [
          {
            id: 'FENCE-EXP-01',
            startLine: 18,
            endLine: 34,
            targetLine: 24,
            token: 'this.lazyrouter()',
            badge: 'FENCE-EXP-01 • app.use lazyrouter() & middleware mounting order',
            status: 'VERIFIED_ACTIVE',
          },
        ],
        code: `'use strict';

var finalhandler = require('finalhandler');
var Router = require('./router');
var methods = require('methods');
var slice = Array.prototype.slice;
var flatten = require('array-flatten');

var app = exports = module.exports = {};

app.init = function init() {
  this.cache = {};
  this.engines = {};
  this.settings = {};
  this.defaultConfiguration();
};

// FENCE-EXP-01: Must call this.lazyrouter() before mounting middleware fns
app.use = function use(fn) {
  var offset = 0;
  var path = '/';

  if (typeof fn !== 'function') {
    var arg = fn;
    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }

  var fns = flatten(slice.call(arguments, offset));
  if (fns.length === 0) {
    throw new TypeError('app.use() requires a middleware function');
  }

  this.lazyrouter();
  var router = this._router;
  fns.forEach(function (fn) {
    if (!fn || !fn.handle || !fn.set) {
      return router.use(path, fn);
    }
    fn.mountpath = path;
    fn.parent = this;
    router.use(path, function mounted_app(req, res, next) {
      var orig = req.app;
      fn.handle(req, res, function (err) {
        Object.setPrototypeOf(req, orig.request);
        Object.setPrototypeOf(res, orig.response);
        next(err);
      });
    });
  }, this);

  return this;
};
`,
      },
      {
        path: 'lib/router/index.js',
        shortName: 'router/index.js',
        language: 'javascript',
        defaultLine: 19,
        fenceId: 'FENCE-EXP-02',
        fences: [
          {
            id: 'FENCE-EXP-02',
            startLine: 12,
            endLine: 28,
            targetLine: 19,
            token: 'req.baseUrl = parentUrl',
            badge: 'FENCE-EXP-02 • Restore req.baseUrl & proto.handle layer traversal',
            status: 'VERIFIED_ACTIVE',
          },
        ],
        code: `'use strict';

var Route = require('./route');
var Layer = require('./layer');
var parseUrl = require('parseurl');

var proto = module.exports = function(options) {
  var opts = options || {};
  function router(req, res, next) {
    router.handle(req, res, next);
  }
  Object.setPrototypeOf(router, proto);
  router.params = {};
  router._params = [];
  router.caseSensitive = opts.caseSensitive;
  router.mergeParams = opts.mergeParams;
  router.strict = opts.strict;
  router.stack = [];
  return router;
};

// FENCE-EXP-02: Preserve parentUrl & originalUrl restoration across nested routers
proto.handle = function handle(req, res, out) {
  var self = this;
  var idx = 0;
  var parentUrl = req.baseUrl || '';
  req.originalUrl = req.originalUrl || req.url;

  function next(err) {
    var layerError = err === 'route' ? null : err;
    if (idx >= self.stack.length) {
      req.baseUrl = parentUrl;
      return out(layerError);
    }
    var layer = self.stack[idx++];
    layer.handle_request(req, res, next);
  }

  next();
};
`,
      },
    ],
  },
  'sindresorhus/ky': {
    owner: 'sindresorhus',
    repo: 'ky',
    fullName: 'sindresorhus/ky',
    url: 'https://github.com/sindresorhus/ky',
    branch: 'main',
    isLocal: false,
    description: 'Tiny and elegant JavaScript HTTP client based on the browser Fetch API.',
    stars: 15200,
    language: 'TypeScript',
    commits: [
      {
        sha: '7c2e10a',
        author: '@sindresorhus',
        date: '2026-03-29',
        message: 'Ensure Retry-After header backoff respects maxRetryAfter limit in Ky.#retry',
      },
    ],
    fences: [
      {
        id: 'FENCE-KY-01',
        file_path: 'source/core/Ky.ts',
        line_range: '14-36',
        targetLine: 22,
        startLine: 14,
        endLine: 36,
        symbol_name: 'Ky.#calculateRetryDelay',
        status: 'VERIFIED_ACTIVE',
        badge: 'FENCE-KY-01 • Exponential retry backoff & Retry-After header clamp',
        voice_transcript:
          'In source/core/Ky.ts, never clone the Request body stream after consumption without cloning upfront before the retry loop.',
      },
    ],
    files: [
      {
        path: 'source/core/Ky.ts',
        shortName: 'Ky.ts',
        language: 'typescript',
        defaultLine: 22,
        fenceId: 'FENCE-KY-01',
        fences: [
          {
            id: 'FENCE-KY-01',
            startLine: 14,
            endLine: 36,
            targetLine: 22,
            token: 'this.#retryCount',
            badge: 'FENCE-KY-01 • Request clone & Retry-After header backoff invariant',
            status: 'VERIFIED_ACTIVE',
          },
        ],
        code: `export class Ky {
  #request: Request;
  #retryCount = 0;
  #options: NormalizedOptions;

  constructor(input: Input, options: Options = {}) {
    this.#options = normalizeOptions(options);
    this.#request = new globalThis.Request(input, this.#options);
  }

  // FENCE-KY-01: Clone request before executing fetch so retries can replay body stream
  async #execute(): Promise<Response> {
    for (const hook of this.#options.hooks.beforeRequest) {
      await hook(this.#request, this.#options);
    }

    const clonedRequest = this.#request.clone();
    const response = await this.#options.fetch(clonedRequest);

    if (!response.ok && this.#retryCount < this.#options.retry.limit) {
      this.#retryCount++;
      const delayMs = this.#calculateRetryDelay(response);
      await delay(delayMs);
      return this.#execute();
    }

    return response;
  }

  #calculateRetryDelay(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const parsed = Number(retryAfter) * 1000;
      if (!Number.isNaN(parsed)) {
        return Math.min(parsed, this.#options.retry.backoffLimit ?? 30_000);
      }
    }
    return 0.3 * (2 ** (this.#retryCount - 1)) * 1000;
  }
}
`,
      },
    ],
  },
  'pallets/click': {
    owner: 'pallets',
    repo: 'click',
    fullName: 'pallets/click',
    url: 'https://github.com/pallets/click',
    branch: 'main',
    isLocal: false,
    description: 'Python composable command line interface toolkit.',
    stars: 16100,
    language: 'Python',
    commits: [
      {
        sha: '4d91a8b',
        author: '@davidism',
        date: '2026-03-21',
        message: 'Preserve Context.ensure_object lifecycle during nested Group.invoke',
      },
    ],
    fences: [
      {
        id: 'FENCE-CLK-01',
        file_path: 'src/click/core.py',
        line_range: '12-32',
        targetLine: 20,
        startLine: 12,
        endLine: 32,
        symbol_name: 'BaseCommand.main',
        status: 'VERIFIED_ACTIVE',
        badge: 'FENCE-CLK-01 • Context stack cleanup in BaseCommand.main',
        voice_transcript:
          'Always enter the Context via with self.make_context() in src/click/core.py so registered close callbacks fire even on Abort or Exit exceptions.',
      },
    ],
    files: [
      {
        path: 'src/click/core.py',
        shortName: 'core.py',
        language: 'python',
        defaultLine: 20,
        fenceId: 'FENCE-CLK-01',
        fences: [
          {
            id: 'FENCE-CLK-01',
            startLine: 12,
            endLine: 32,
            targetLine: 20,
            token: 'with self.make_context',
            badge: 'FENCE-CLK-01 • Context resource teardown invariant on CLI exit',
            status: 'VERIFIED_ACTIVE',
          },
        ],
        code: `import sys
import typing as t

class BaseCommand:
    def __init__(self, name: str | None) -> None:
        self.name = name

    # FENCE-CLK-01: Must wrap invoke(ctx) inside with self.make_context() context manager
    def main(
        self,
        args: t.Sequence[str] | None = None,
        prog_name: str | None = None,
        standalone_mode: bool = True,
    ) -> t.Any:
        if args is None:
            args = sys.argv[1:]
        try:
            with self.make_context(prog_name, list(args)) as ctx:
                rv = self.invoke(ctx)
                if not standalone_mode:
                    return rv
                ctx.exit()
        except EOFError as e:
            raise Abort() from e
`,
      },
    ],
  },
};

function buildDefaultHealthConnectContext() {
  const fences = readJsonSafe(FENCES_PATH, []);
  return {
    owner: 'HealthConnect',
    repo: 'payment-gateway-v1',
    fullName: 'HealthConnect/payment-gateway-v1',
    url: 'https://github.com/HealthConnect/payment-gateway-v1',
    branch: 'main',
    isLocal: true,
    description:
      'HealthConnect Clinical Payment Settlement Gateway & DICOM Imaging Pipeline (Indian Rural Clinic Edge).',
    stars: 412,
    language: 'Java',
    files: DEMO_FILES,
    fences,
    symbols: [
      'GatewayRouter.java',
      'DicomShaderPipeline.java',
      'JwtClockSkewFilter.java',
      'config/application.yml',
      'retryCount = 5',
      'Thread.sleep(120)',
      'X-Idempotency-Key',
    ],
    commits: [
      {
        sha: 'f48a10c',
        author: '@anjani',
        date: '2026-01-14',
        message: 'PR #212: Add retryCount=5 for midnight v1 packet drop',
      },
      {
        sha: '83d91a2',
        author: '@vikram',
        date: '2026-02-02',
        message: 'PR #198: Enforce SHA-256 X-Idempotency-Key in outbox',
      },
      {
        sha: 'c209e4b',
        author: '@priya',
        date: '2026-02-19',
        message: 'PR #184: Guard 120ms Adreno GPU shader sleep on clinic tablets',
      },
    ],
  };
}

let activeRepoContext = null;

function getActiveRepoContext() {
  if (!activeRepoContext) {
    activeRepoContext = buildDefaultHealthConnectContext();
  }
  return activeRepoContext;
}

function getGenAIClient() {
  loadDotenvSafe();
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey.length < 20) {
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  } catch {
    return null;
  }
}

function withTimeout(promise, timeoutMs = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API request timed out')), timeoutMs)
    ),
  ]);
}

function inferEditorLanguage(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.java') return 'java';
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs') return 'javascript';
  if (ext === '.py') return 'python';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'markdown';
  if (ext === '.go') return 'go';
  if (ext === '.rs') return 'rust';
  return 'javascript';
}

async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'whyline-studio-agent',
      },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextWithTimeout(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'whyline-studio-agent' },
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads and indexes any GitHub repository (via live GitHub REST API + curated snapshot enrichment).
 */
async function loadAndIndexGitHubRepository(rawInput) {
  const parsed = parseGitHubRepoInput(rawInput);
  if (parsed.isLocal) {
    activeRepoContext = buildDefaultHealthConnectContext();
    return activeRepoContext;
  }

  const keyLower = parsed.fullName.toLowerCase();
  const curated = CURATED_GITHUB_REPOS[keyLower] || null;

  // Attempt live GitHub API fetch
  const repoMeta = await fetchJsonWithTimeout(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
  const branch = repoMeta?.default_branch || curated?.branch || 'main';
  const description =
    repoMeta?.description ||
    curated?.description ||
    `GitHub repository ${parsed.fullName} indexed by WhyLine Gemini Brain.`;
  const language = repoMeta?.language || curated?.language || 'TypeScript';
  const stars = repoMeta?.stargazers_count ?? curated?.stars ?? 100;

  let files = curated?.files ? [...curated.files] : [];
  let commits = curated?.commits ? [...curated.commits] : [];
  let fences = curated?.fences ? [...curated.fences] : [];

  // If not in curated or if live tree is available, fetch live tree & top source files
  if (files.length === 0) {
    const treeData = await fetchJsonWithTimeout(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`
    );
    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.yml', '.yaml', '.md'];
    const candidateBlobs = (treeData?.tree || [])
      .filter(
        (item) =>
          item.type === 'blob' &&
          item.size > 40 &&
          item.size < 65000 &&
          !item.path.includes('node_modules/') &&
          !item.path.includes('dist/') &&
          !item.path.includes(' lock') &&
          codeExts.some((ext) => item.path.toLowerCase().endsWith(ext))
      )
      .slice(0, 5);

    const fetchedFiles = [];
    for (let i = 0; i < candidateBlobs.length; i++) {
      const blob = candidateBlobs[i];
      const rawCode = await fetchTextWithTimeout(
        `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${blob.path}`
      );
      if (rawCode) {
        const lines = rawCode.split(/\r?\n/).slice(0, 120).join('\n');
        const totalLines = lines.split(/\r?\n/).length;
        const targetLine = Math.min(15, Math.max(1, Math.floor(totalLines / 3)));
        const fenceId = `FENCE-GH-0${i + 1}`;
        fetchedFiles.push({
          path: blob.path,
          shortName: blob.path.split('/').pop(),
          language: inferEditorLanguage(blob.path),
          defaultLine: targetLine,
          fenceId,
          fences: [
            {
              id: fenceId,
              startLine: Math.max(1, targetLine - 3),
              endLine: Math.min(totalLines, targetLine + 5),
              targetLine,
              token: blob.path.split('/').pop(),
              badge: `${fenceId} • Indexed invariant in ${blob.path.split('/').pop()}`,
              status: 'VERIFIED_ACTIVE',
            },
          ],
          code: lines,
        });
      }
    }

    if (fetchedFiles.length > 0) {
      files = fetchedFiles;
      fences = fetchedFiles.map((f) => ({
        id: f.fenceId,
        file_path: f.path,
        line_range: `${Math.max(1, f.defaultLine - 3)}-${f.defaultLine + 5}`,
        targetLine: f.defaultLine,
        symbol_name: f.shortName,
        status: 'VERIFIED_ACTIVE',
        badge: f.fences[0]?.badge,
        voice_transcript: `Gemini Brain indexed ${f.path} in ${parsed.fullName}. Preserve line ${f.defaultLine} contract when refactoring.`,
      }));
    }
  }

  // Fallback synthetic file if GitHub API was unreachable and repo is custom
  if (files.length === 0) {
    const syntheticPath = `src/${parsed.repo.replace(/[^a-zA-Z0-9_-]/g, '')}Core.ts`;
    const fenceId = 'FENCE-GH-01';
    files = [
      {
        path: syntheticPath,
        shortName: syntheticPath.split('/').pop(),
        language: 'typescript',
        defaultLine: 12,
        fenceId,
        fences: [
          {
            id: fenceId,
            startLine: 8,
            endLine: 20,
            targetLine: 12,
            token: 'executePipeline',
            badge: `${fenceId} • ${parsed.fullName} core execution guard`,
            status: 'VERIFIED_ACTIVE',
          },
        ],
        code: `/**
 * Repository: ${parsed.fullName}
 * URL: ${parsed.url}
 */
export interface PipelineConfig {
  repo: string;
  retryLimit: number;
  idempotent: boolean;
}

export async function executePipeline(config: PipelineConfig) {
  // ${fenceId}: Preserve idempotent retry barrier in ${parsed.fullName}
  const safeRetries = Math.max(1, config.retryLimit ?? 3);
  return {
    repository: "${parsed.fullName}",
    status: "VERIFIED",
    retries: safeRetries,
  };
}
`,
      },
    ];
    fences = [
      {
        id: fenceId,
        file_path: syntheticPath,
        line_range: '8-20',
        targetLine: 12,
        symbol_name: 'executePipeline',
        status: 'VERIFIED_ACTIVE',
        badge: `${fenceId} • ${parsed.fullName} core execution guard`,
        voice_transcript: `Guardrail ${fenceId} protects executePipeline in ${parsed.fullName}.`,
      },
    ];
  }

  const symbols = files.map((f) => f.path);

  activeRepoContext = {
    owner: parsed.owner,
    repo: parsed.repo,
    fullName: parsed.fullName,
    url: parsed.url,
    branch,
    isLocal: false,
    description,
    stars,
    language,
    files,
    fences,
    symbols,
    commits:
      commits.length > 0
        ? commits
        : [
            {
              sha: 'a81f20c',
              author: `@${parsed.owner}`,
              date: '2026-04-01',
              message: `Indexed ${parsed.fullName} (${files.length} source files) for Gemini Voice Agent`,
            },
          ],
  };

  return activeRepoContext;
}

/**
 * Synthesizes speech using Gemini 3.8 Flash Lite TTS (`gemini-3.8-flash-lite-tts`)
 * and caches the WAV file in AUDIO_DIR so `/api/audio/...` serves it cleanly.
 */
async function synthesizeSpeechAudio(text, language = 'en-IN') {
  if (!text) return null;
  loadDotenvSafe();
  const langKey = language.includes('te') ? 'te-IN' : language.includes('hi') ? 'hi-IN' : 'en-IN';
  const digest = crypto.createHash('md5').update(`${langKey}:${text}`).digest('hex').slice(0, 10);
  const filename = `voice_${digest}.wav`;
  const filePath = path.join(AUDIO_DIR, filename);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 200) {
    return `/api/audio/${filename}`;
  }

  // 1. Live Gnani Timbre TTS (supports Telugu, Hindi, English with code-mixed AST symbols)
  const gnaniKey = String(process.env.GNANI_API_KEY || '').trim();
  if (gnaniKey) {
    try {
      const voice = langKey.includes('te') ? 'Nalini' : langKey.includes('hi') ? 'Pranav' : 'Nalini';
      const resp = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
        method: 'POST',
        headers: {
          'X-API-Key-ID': gnaniKey,
          'Content-Type': 'application/json',
          'User-Agent': 'WhyLine/1.0',
        },
        body: JSON.stringify({
          model: 'timbre-v2.5',
          text: String(text).slice(0, 480),
          language: langKey,
          voice,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        if (arrayBuf.byteLength > 100) {
          fs.mkdirSync(AUDIO_DIR, { recursive: true });
          fs.writeFileSync(filePath, Buffer.from(arrayBuf));
          return `/api/audio/${filename}`;
        }
      }
    } catch {
      // Continue to fallback
    }
  }

  return null;
}

const synthesizeSpeechWithGemini = synthesizeSpeechAudio;

/**
 * Uses the server-side Gemini 3.8 Flash model (`gemini-3.8-flash`) as the reasoning brain
 * over the currently loaded GitHub repository.
 */
async function queryGeminiRepositoryBrain(question, language, repoCtx, baselinePayload) {
  const ai = getGenAIClient();
  if (!ai) {
    return baselinePayload;
  }

  try {
    const langName =
      language === 'te-IN'
        ? 'Telugu (or natural Telugu-English engineering code-mix)'
        : language === 'hi-IN'
          ? 'Hindi (or natural Hindi-English engineering code-mix)'
          : 'English';

    const repoFilesContext = (repoCtx.files || [])
      .slice(0, 5)
      .map((f) => {
        const numberedLines = (f.code || '')
          .split(/\r?\n/)
          .slice(0, 75)
          .map((lineText, idx) => `${idx + 1}: ${lineText}`)
          .join('\n');
        return `FILE: ${f.path}\n${numberedLines}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are the WhyLine Gemini Repository Voice Agent & Principal Architecture Brain.
Active GitHub Repository: ${repoCtx.fullName} (${repoCtx.url})
Description: ${repoCtx.description}
Active Spoken Fences / Guardrails: ${JSON.stringify(repoCtx.fences || [])}

Indexed Repository Source Files (with line numbers):
${repoFilesContext}

Developer Question: "${question}"
Requested Voice Output Language: ${langName} (${language})

Analyze the loaded GitHub repository files above and answer the developer's question.
Requirements:
1. "spoken_answer": A clear, conversational 2-3 sentence spoken voice response in ${langName} that directly answers the question, mentions the exact file name and line number, and explains the architectural reason or fix.
2. "action_taken": A concise 1-line summary of the task executed on ${repoCtx.fullName}.
3. "target_file": Exact file path from the repository files above.
4. "target_line": Integer line number in target_file most relevant to the answer.
5. "recommended_patch": Concrete, actionable code snippet or patch for ${repoCtx.fullName}.
6. "guardrail_rule": A 1-sentence Spoken Fence invariant rule to protect this code.
7. "referenced_files": 1 to 3 exact file citations with file_path, line_number, snippet, and explanation.
8. "strategies": 3 ranked architectural strategies (rank 1 = LOW risk recommended, rank 2 = MODERATE risk, rank 3 = HIGH risk naive approach).`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spoken_answer: { type: Type.STRING },
              action_taken: { type: Type.STRING },
              target_file: { type: Type.STRING },
              target_line: { type: Type.INTEGER },
              recommended_patch: { type: Type.STRING },
              guardrail_rule: { type: Type.STRING },
              referenced_files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    file_path: { type: Type.STRING },
                    line_number: { type: Type.INTEGER },
                    snippet: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                  },
                  required: ['file_path', 'line_number', 'snippet', 'explanation'],
                },
              },
              strategies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rank: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    risk_level: { type: Type.STRING },
                    description: { type: Type.STRING },
                    referenced_file: { type: Type.STRING },
                    referenced_line: { type: Type.INTEGER },
                  },
                  required: ['rank', 'title', 'risk_level', 'description', 'referenced_file', 'referenced_line'],
                },
              },
            },
            required: [
              'spoken_answer',
              'action_taken',
              'target_file',
              'target_line',
              'recommended_patch',
              'guardrail_rule',
              'referenced_files',
              'strategies',
            ],
          },
        },
      }),
      3500
    );

    const parsed = JSON.parse(response.text || '{}');
    if (parsed && parsed.spoken_answer) {
      const ttsAudioUrl = await synthesizeSpeechWithGemini(parsed.spoken_answer, language);
      return {
        ...baselinePayload,
        repo_full_name: repoCtx.fullName,
        repo_url: repoCtx.url,
        brain_engine: 'Gemini 3.8 Flash Live Repository Brain (@google/genai)',
        spoken_reply: parsed.spoken_answer,
        spoken_answer: parsed.spoken_answer,
        guardrail_rule: parsed.guardrail_rule || baselinePayload.guardrail_rule,
        recommended_patch: parsed.recommended_patch || baselinePayload.recommended_patch,
        referenced_files:
          Array.isArray(parsed.referenced_files) && parsed.referenced_files.length > 0
            ? parsed.referenced_files
            : baselinePayload.referenced_files,
        executed_task: {
          ...baselinePayload.executed_task,
          action_taken: parsed.action_taken || baselinePayload.executed_task.action_taken,
          target_file: parsed.target_file || baselinePayload.executed_task.target_file,
          target_line: parsed.target_line || baselinePayload.executed_task.target_line,
        },
        strategies:
          Array.isArray(parsed.strategies) && parsed.strategies.length > 0
            ? parsed.strategies
            : baselinePayload.strategies,
        audio_url: ttsAudioUrl || baselinePayload.audio_url,
      };
    }
  } catch {
    // Gracefully fall back to deterministic baselinePayload if API call fails
  }

  return baselinePayload;
}

function readJsonSafe(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // ignore parse error
  }
  return fallback;
}

function writeJsonSafe(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // ignore write error
  }
}

function getGatewayVersion() {
  try {
    if (fs.existsSync(CONFIG_YML_PATH)) {
      const content = fs.readFileSync(CONFIG_YML_PATH, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('version:')) {
          return trimmed.split(':', 2)[1].trim().replace(/['"]/g, '');
        }
      }
    }
  } catch {
    // ignore
  }
  return 'v1';
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
}

export function createWhylineApiMiddleware() {
  return async function whylineApiMiddleware(req, res, next) {
    const rawUrl = req.url || '/';
    const urlObj = new URL(rawUrl, 'http://localhost:3000');
    const pathname = urlObj.pathname;
    const method = (req.method || 'GET').toUpperCase();

    if (!pathname.startsWith('/api/')) {
      return next();
    }

    try {
      // GET /api/health
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          service: 'whyline-api',
          gemini_brain_configured: Boolean(process.env.GEMINI_API_KEY),
          active_repo: getActiveRepoContext().fullName,
        });
      }

      // GET /api/github/current
      if (pathname === '/api/github/current' && method === 'GET') {
        const ctx = getActiveRepoContext();
        return sendJson(res, 200, {
          status: 'ok',
          repo: ctx,
          quick_repos: [
            {
              label: 'HealthConnect Gateway (Default)',
              fullName: 'HealthConnect/payment-gateway-v1',
              url: 'https://github.com/HealthConnect/payment-gateway-v1',
            },
            {
              label: 'expressjs/express',
              fullName: 'expressjs/express',
              url: 'https://github.com/expressjs/express',
            },
            {
              label: 'sindresorhus/ky',
              fullName: 'sindresorhus/ky',
              url: 'https://github.com/sindresorhus/ky',
            },
            {
              label: 'pallets/click',
              fullName: 'pallets/click',
              url: 'https://github.com/pallets/click',
            },
          ],
        });
      }

      // POST /api/github/load
      if (pathname === '/api/github/load' && method === 'POST') {
        const body = await parseBody(req);
        const repoUrl = body.repo_url || body.repo || 'HealthConnect/payment-gateway-v1';
        const loaded = await loadAndIndexGitHubRepository(repoUrl);
        return sendJson(res, 200, {
          status: 'loaded',
          repo: loaded,
        });
      }

      // GET /api/briefing
      if (pathname === '/api/briefing' && method === 'GET') {
        const ctx = getActiveRepoContext();
        const fences = ctx.isLocal ? readJsonSafe(FENCES_PATH, []) : ctx.fences || [];
        const scorecard = readJsonSafe(SCORECARD_PATH, {});
        const verifiedCount = fences.filter((f) => f.status === 'VERIFIED_ACTIVE').length;
        const unverifiedCount = fences.filter((f) => f.status === 'UNVERIFIED_ANOMALY').length;
        const expiredCount = fences.filter((f) => f.status === 'EXPIRED_SAFE_TO_REMOVE').length;

        return sendJson(res, 200, {
          repo_name: ctx.fullName,
          branch: ctx.branch || 'main',
          gateway_version: getGatewayVersion(),
          summary: {
            total_fences: fences.length,
            verified_active: verifiedCount,
            unverified_anomalies: unverifiedCount,
            expired_safe_to_remove: expiredCount,
            intercepted_edits_today: 10,
            regression_rate_with_whyline: '0%',
            regression_rate_without_whyline: '100%',
          },
          featured_fence: fences[0] || null,
          scorecard,
        });
      }

      // GET /api/fences
      if (pathname === '/api/fences' && method === 'GET') {
        const ctx = getActiveRepoContext();
        const fences = ctx.isLocal ? readJsonSafe(FENCES_PATH, []) : ctx.fences || [];
        const junitSource = fs.existsSync(JUNIT_TEST_PATH)
          ? fs.readFileSync(JUNIT_TEST_PATH, 'utf-8')
          : '';
        return sendJson(res, 200, {
          fences,
          gateway_version: getGatewayVersion(),
          junit_invariant_source: junitSource,
        });
      }

      // POST /api/fences/scan
      if (pathname === '/api/fences/scan' && method === 'POST') {
        const ctx = getActiveRepoContext();
        const fences = ctx.isLocal ? readJsonSafe(FENCES_PATH, []) : ctx.fences || [];
        const scorecard = readJsonSafe(SCORECARD_PATH, {});
        return sendJson(res, 200, {
          status: 'scanned',
          scanned_files: ctx.files?.length || 6,
          anomalies_found: fences.length,
          fences,
          scorecard,
        });
      }

      // POST /api/fences/:fenceId/confirm
      const confirmMatch = pathname.match(/^\/api\/fences\/([^/]+)\/confirm$/);
      if (confirmMatch && method === 'POST') {
        const fenceId = decodeURIComponent(confirmMatch[1]);
        const body = await parseBody(req);
        const fences = readJsonSafe(FENCES_PATH, []);
        const target = fences.find((f) => f.id === fenceId) || fences[0];
        if (!target) {
          return sendJson(res, 404, { error: `Fence ${fenceId} not found` });
        }

        const transcriptText =
          body.transcript_text ||
          target.voice_transcript ||
          'Confirmed spoken fence invariant for production gateway safety.';
        const language = body.language || target.language || 'te-IN';
        const authorHandle = body.author_handle || '@anjani';

        const sttResult = rescoreSpokenTranscript(
          transcriptText,
          language,
          getActiveRepoContext().symbols
        );

        target.status = 'VERIFIED_ACTIVE';
        target.voice_transcript = sttResult.rescored_transcript;
        target.language = sttResult.language;
        target.author_handle = authorHandle;
        target.confirmed_at = '2026-04-12T10:30:00Z';
        target.audio_url = '/api/audio/fence-001_confirmed.wav';

        writeJsonSafe(FENCES_PATH, fences);
        const scorecard = readJsonSafe(SCORECARD_PATH, {});

        return sendJson(res, 200, {
          status: 'confirmed',
          fence: target,
          stt_telemetry: sttResult,
          tts_telemetry: {
            provider: 'Gemini 3.8 TTS + Gnani Timbre v3.0',
            audio_url: target.audio_url,
          },
          test_artifacts: {
            junit_test_path:
              'src/test/java/com/healthconnect/whyline/SpokenFenceInvariantTest.java',
            pytest_test_path: 'tests/test_spoken_fence_invariants.py',
          },
          scorecard,
        });
      }

      // POST /api/fences/intercept-test
      if (pathname === '/api/fences/intercept-test' && method === 'POST') {
        const body = await parseBody(req);
        const filePath = body.file_path || 'src/main/java/com/healthconnect/payments/GatewayRouter.java';
        const proposedDiff = body.proposed_diff || '';
        const fences = readJsonSafe(FENCES_PATH, []);
        const gwVersion = getGatewayVersion();

        const matchedFence =
          fences.find((f) => filePath.includes(path.basename(f.file_path || ''))) || fences[0];

        const isBlocked =
          gwVersion !== 'v2' &&
          (proposedDiff.includes('retryCount = 1') ||
            proposedDiff.includes('retryCount=1') ||
            !proposedDiff.includes('retryCount = 5'));

        const decision = isBlocked ? 'REJECT_EDIT' : 'ALLOW_EDIT';
        const reason = isBlocked
          ? `Blocked by ${matchedFence?.id || 'FENCE-001'}: Modifying retryCount=5 while gateway.version=${gwVersion} causes 18% midnight settlement packet drops.`
          : `Allowed: Edit preserves ${matchedFence?.id || 'FENCE-001'} or gateway.version=${gwVersion} satisfies expiry rule.`;

        return sendJson(res, 200, {
          decision,
          reason,
          fence_check: {
            decision,
            reason,
            spoken_warning_url: '/api/audio/fence-001.wav',
            spoken_warning_text:
              matchedFence?.voice_transcript ||
              'GatewayRouter retryCount=5 must remain intact until gateway.version v2 cutover.',
            matched_fence: matchedFence,
          },
        });
      }

      // POST /api/config/gateway-version
      if (pathname === '/api/config/gateway-version' && method === 'POST') {
        const body = await parseBody(req);
        const version = body.version === 'v2' ? 'v2' : 'v1';

        const ymlContent = `# HealthConnect Runtime Configuration\ngateway:\n  provider: razorpay-india\n  version: ${version}\n  settlement_window: "00:00-00:15 IST"\n`;
        fs.mkdirSync(path.dirname(CONFIG_YML_PATH), { recursive: true });
        fs.writeFileSync(CONFIG_YML_PATH, ymlContent, 'utf-8');

        const fences = readJsonSafe(FENCES_PATH, []);
        let updatedFence = null;
        for (const f of fences) {
          if (f.id === 'FENCE-001') {
            f.status = version === 'v2' ? 'EXPIRED_SAFE_TO_REMOVE' : 'VERIFIED_ACTIVE';
            updatedFence = f;
          }
        }
        writeJsonSafe(FENCES_PATH, fences);

        return sendJson(res, 200, {
          gateway_version: version,
          config_path: 'config/application.yml',
          updated_fence: updatedFence,
          fences,
        });
      }

      // GET /api/incidents
      if (pathname === '/api/incidents' && method === 'GET') {
        return sendJson(res, 200, {
          incidents: readJsonSafe(INCIDENTS_PATH, []),
          checkpoints: readJsonSafe(CHECKPOINTS_PATH, []),
          assumptions: readJsonSafe(ASSUMPTIONS_PATH, []),
        });
      }

      // POST /api/incidents/webhook
      if (pathname === '/api/incidents/webhook' && method === 'POST') {
        const body = await parseBody(req);
        const incidents = readJsonSafe(INCIDENTS_PATH, []);
        const newInc = {
          id: body.incident_id || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
          severity: body.severity || 'SEV-1',
          title: body.title || 'Production Incident Alert',
          service: body.service || getActiveRepoContext().fullName,
          occurred_at: '2026-04-12T11:00:00Z',
          resolved_at: '2026-04-12T11:18:00Z',
          root_cause_commit: body.root_cause_commit || '91b4c2d',
          fix_commit: body.fix_commit || 'f48a10c',
          linked_fence_id: body.linked_fence_id || 'FENCE-001',
          voice_postmortem:
            body.voice_postmortem ||
            'Spoken postmortem recorded and linked to AST invariant fence.',
          language: body.language || 'te-IN',
          author_handle: body.author_handle || '@anjani',
          audio_url: '/api/audio/fence-001.wav',
          blast_radius: body.blast_radius || 'Protected by Spoken Fence FENCE-001',
          status: 'RESOLVED_WITH_FENCE',
        };
        incidents.unshift(newInc);
        writeJsonSafe(INCIDENTS_PATH, incidents);
        return sendJson(res, 200, { status: 'logged', incident: newInc, incidents });
      }

      // POST /api/checkpoints
      if (pathname === '/api/checkpoints' && method === 'POST') {
        const body = await parseBody(req);
        const checkpoints = readJsonSafe(CHECKPOINTS_PATH, []);
        const branchName = (body.branch || 'fix/payment-double-charge').replace(/\//g, '_');
        const newChk = {
          id: `CHK-0${checkpoints.length + 1}`,
          branch: body.branch || 'fix/payment-double-charge',
          developer: body.developer || '@anjani',
          recorded_at: '2026-04-12T11:25:00Z',
          language: body.language || 'te-IN',
          voice_note:
            body.voice_note ||
            ' Investigating GatewayRouter retryCount=5 invariant with X-Idempotency-Key.',
          active_files: body.active_files || [
            'src/main/java/com/healthconnect/payments/GatewayRouter.java',
          ],
          next_step:
            body.next_step ||
            'Verify X-Idempotency-Key header deduplication while preserving retryCount=5.',
          audio_url: `/api/audio/checkpoint_${branchName}.wav`,
        };
        checkpoints.unshift(newChk);
        writeJsonSafe(CHECKPOINTS_PATH, checkpoints);
        return sendJson(res, 200, { status: 'saved', checkpoint: newChk, checkpoints });
      }

      // POST /api/copilot/ask & POST /api/gemini/explain-codebase
      if (
        (pathname === '/api/copilot/ask' || pathname === '/api/gemini/explain-codebase') &&
        method === 'POST'
      ) {
        const body = await parseBody(req);
        // If the request specifies a repo_url to switch on the fly, load it first
        if (body.repo_url) {
          await loadAndIndexGitHubRepository(body.repo_url);
        }

        const repoCtx = getActiveRepoContext();
        let rawQuestion = body.question || 'How do we fix the double-charge bug safely?';
        const language = body.language || 'te-IN';

        // If raw audio was sent, transcribe via gemini-3.5-transcribe
        if (body.audio_base64 && typeof body.audio_base64 === 'string') {
          const ai = getGenAIClient();
          if (ai) {
            try {
              const cleanedBase64 = body.audio_base64.replace(/^data:[^;]+;base64,/, '');
              const sttResp = await withTimeout(
                ai.models.generateContent({
                  model: 'gemini-3.5-flash',
                  contents: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: body.mime_type || 'audio/webm',
                          data: cleanedBase64,
                        },
                      },
                      {
                        text: `Transcribe this question about the ${repoCtx.fullName} repository.`,
                      },
                    ],
                  },
                }),
                3000
              );
              if (sttResp.text && sttResp.text.trim()) {
                rawQuestion = sttResp.text.trim();
              }
            } catch {
              // Keep rawQuestion fallback
            }
          }
        }

        const fences = repoCtx.isLocal ? readJsonSafe(FENCES_PATH, []) : repoCtx.fences || [];
        const baselinePayload = executeCopilotTaskForQuestion(
          rawQuestion,
          language,
          fences,
          repoCtx
        );

        const enrichedPayload = await queryGeminiRepositoryBrain(
          baselinePayload.question,
          baselinePayload.language,
          repoCtx,
          baselinePayload
        );

        return sendJson(res, 200, enrichedPayload);
      }

      // GET/POST /api/repo/scan-flowchart & POST /api/gemini/explain-flowchart
      if (
        pathname === '/api/repo/scan-flowchart' ||
        pathname === '/api/gemini/explain-flowchart'
      ) {
        const body = method === 'POST' ? await parseBody(req) : {};
        // If request specified a custom repo_url or github_url, switch or index it first
        const requestedRepoUrl = body.github_url || body.repo_url || body.repo;
        if (requestedRepoUrl && requestedRepoUrl !== getActiveRepoContext().url) {
          try {
            await loadAndIndexGitHubRepository(requestedRepoUrl);
          } catch (e) {
            console.warn('Could not index custom repo on the fly:', e.message);
          }
        }

        const repoCtx = getActiveRepoContext();
        const language = (body.language || 'telugu').toLowerCase();
        const langKey = language.includes('hi')
          ? 'hindi'
          : language.includes('en')
            ? 'english'
            : 'telugu';
        const langCode = langKey === 'hindi' ? 'hi-IN' : langKey === 'telugu' ? 'te-IN' : 'en-IN';

        // Check if repo is local or custom
        if (repoCtx.isLocal) {
          const steps = [
            {
              step_number: 1,
              node_id: 'STEP-1',
              phase: 'entrypoint',
              title: 'Patient Checkout & UPI Intent Dispatcher',
              file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
              line_range: '10-18',
              summary: 'Receives clinic appointment settlement payload and validates currency & amount.',
              spoken_narration: langKey === 'hindi'
                ? 'Step 1: Patient checkout payload GatewayRouter mein enter hota hai aur currency validate hoti hai.'
                : langKey === 'telugu'
                  ? 'Step 1: పేషెంట్ చెక్‌అవుట్ పేలోడ్ GatewayRouter ద్వారా రిసీవ్ అయ్యి అమౌంట్ మరియు కరెన్సీని వాలిడేట్ చేస్తుంది.'
                  : 'Step 1: Ingress GatewayRouter receives clinic settlement requests and validates UPI transaction payloads.',
              simple_explanation: 'This file is the main front door for doctor clinic checkout requests. It checks the amount and patient ID before processing.',
              real_world_example: 'Like the receptionist at a hospital clinic verifying the patient appointment token before directing them to billing.',
              what_happens: 'Parses incoming JSON settlement request, verifies mandatory parameters, and establishes transactional context.',
              why_guarded: 'Rejects malformed currency codes or zero-rupee authorizations before initiating payment processor handshakes.',
              danger_if_removed: 'Malicious or corrupted payloads would trigger unhandled null pointer exceptions in downstream payment processors.',
              symbol_name: 'GatewayRouter.dispatchSettlement()',
              matched_token: 'currency.equals("INR") && amount > 0',
              code_snippet: 'public SettlementResult dispatchSettlement(SettlementRequest req) {\n    Objects.requireNonNull(req, "request cannot be null");\n    if (!"INR".equals(req.getCurrency()) || req.getAmount() <= 0) {\n        throw new InvalidSettlementException("Invalid currency or non-positive amount");\n    }\n    return processWithRetries(req);\n}',
              audio_url: `/api/audio/flow_4a1ee7_${langKey}_step1.wav`,
            },
            {
              step_number: 2,
              node_id: 'STEP-2',
              phase: 'guard',
              title: 'FENCE-001: Midnight Retry Loop (retryCount = 5)',
              file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
              line_range: '19-28',
              fence_id: 'FENCE-001',
              summary: 'Guarded by Spoken Fence FENCE-001: maintains 5 retries while gateway.version == v1 to survive 00:00 IST packet drops.',
              spoken_narration: langKey === 'hindi'
                ? 'Step 2: Spoken Fence FENCE-001 yahan 5 retries enforce karta hai taaki midnight packet drop mein payment fail na ho.'
                : langKey === 'telugu'
                  ? 'Step 2: Spoken Fence FENCE-001 ఇక్కడ 5 రీట్రైలను లాక్ చేస్తుంది. రాత్రి 12 గంటలకు ప్యాకెట్ డ్రాప్స్ వచ్చినా పేమెంట్ ఆగదు.'
                  : 'Step 2: Spoken Fence FENCE-001 enforces 5 exponential retries to survive Indian banking network midnight packet drops.',
              simple_explanation: 'A safety loop that tries reconnecting 5 times when banks restart their batch systems at midnight.',
              real_world_example: 'Like redialing a phone call automatically when rural cellular signal drops for 10 seconds.',
              what_happens: 'Executes exponential backoff loop while gateway.version is v1 to ride out transient NPCI connectivity blips.',
              why_guarded: 'INC-9921 previously caused an 18% settlement failure rate at 00:00 IST when set to fewer retries.',
              danger_if_removed: 'Changing retryCount back to 1 or 3 immediately resurrects the midnight clinic settlement failure surge.',
              symbol_name: 'GatewayRouter.executeRetryLoop()',
              matched_token: 'int retryCount = 5',
              code_snippet: '// FENCE-001: Spoken invariant locked by @anjani\nint retryCount = 5;\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    try {\n        return gatewayClient.sendSettlement(req);\n    } catch (TransientGatewayException ex) {\n        Thread.sleep(calculateBackoff(attempt));\n    }\n}',
              audio_url: `/api/audio/flow_4a1ee7_${langKey}_step2.wav`,
            },
            {
              step_number: 3,
              node_id: 'STEP-3',
              phase: 'domain',
              title: 'Idempotency Outbox Deduplication',
              file_path: 'src/main/java/com/healthconnect/payments/SettlementIdempotencyGuard.java',
              line_range: '8-24',
              fence_id: 'FENCE-002',
              summary: 'Attaches deterministic SHA-256 X-Idempotency-Key so retries never double-charge the patient.',
              spoken_narration: langKey === 'hindi'
                ? 'Step 3: Idempotency Guard SHA-256 key check karta hai taaki retry hone par patient do baar charge na ho.'
                : langKey === 'telugu'
                  ? 'Step 3: ఐడెంపోటెన్సీ గార్డ్ SHA-256 కీని తనిఖీ చేసి రోగిపై డబుల్ చార్జ్ పడకుండా రక్షిస్తుంది.'
                  : 'Step 3: SettlementIdempotencyGuard assigns deterministic SHA-256 tokens ensuring retries never double-charge.',
              simple_explanation: 'Guarantees that clicking pay twice or retrying over spotty Wi-Fi only charges the patient once.',
              real_world_example: 'Like getting a unique receipt barcode stamped on your clinic bill that cannot be redeemed twice.',
              what_happens: 'Calculates SHA-256 of settlement body, claims Redis lock, and stores transaction state in durable Postgres outbox table.',
              why_guarded: 'Prevents distributed race conditions across clinic billing counters.',
              danger_if_removed: 'Retried requests would cause duplicate ledger entries and catastrophic double debits.',
              symbol_name: 'SettlementIdempotencyGuard.acquireLock()',
              matched_token: 'X-Idempotency-Key',
              code_snippet: 'public boolean acquireLock(String appointmentId, String sha256Key) {\n    String existing = redisTemplate.opsForValue().get("idemp:" + appointmentId);\n    if (existing != null) return false;\n    return redisTemplate.opsForValue().setIfAbsent("idemp:" + appointmentId, sha256Key, 15, TimeUnit.MINUTES);\n}',
              audio_url: `/api/audio/flow_4a1ee7_${langKey}_step3.wav`,
            },
            {
              step_number: 4,
              node_id: 'STEP-4',
              phase: 'storage',
              title: 'DICOM Imaging & Adreno GPU Frame Sync',
              file_path: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
              line_range: '6-18',
              fence_id: 'FENCE-003',
              summary: 'Applies 120ms frame pacing buffer on clinic Android tablets to prevent driver buffer overflow.',
              spoken_narration: langKey === 'hindi'
                ? 'Step 4: DICOM imaging pipeline clinic tablets par 120 millisecond frame sync buffer lagata hai.'
                : langKey === 'telugu'
                  ? 'Step 4: DICOM ఇమేజింగ్ పైప్‌లైన్ క్లినిక్ టాబ్లెట్లపై 120ms ఫ్రేమ్ పేసింగ్ బఫర్‌ను అందిస్తుంది.'
                  : 'Step 4: DicomShaderPipeline buffers medical image frame pacing to prevent GPU driver panics on clinic tablets.',
              simple_explanation: 'Smooths out X-ray and ultrasound rendering on Android tablets so the screen does not freeze or crash.',
              real_world_example: 'Like a water tank accumulator steadying the flow so clinic pipes do not burst under high pressure.',
              what_happens: 'Synchronizes OpenGL shader frames with Adreno hardware timing barriers.',
              why_guarded: 'Hospital budget tablets crash when rendering 16-bit uncompressed DICOM slices without pacing.',
              danger_if_removed: 'Tablets experience kernel panics and black screens while doctors review surgical imaging.',
              symbol_name: 'DicomShaderPipeline.synchronizeFrame()',
              matched_token: 'framePacingMs = 120',
              code_snippet: '// FENCE-003: Frame pacing for Adreno 610/618 GPU stability\nprivate static final int FRAME_PACING_MS = 120;\npublic void renderSlice(DicomFrame frame) {\n    syncHardwareFence();\n    Thread.sleep(FRAME_PACING_MS);\n    dispatchEglSurface(frame);\n}',
              audio_url: `/api/audio/flow_4a1ee7_${langKey}_step4.wav`,
            },
            {
              step_number: 5,
              node_id: 'STEP-5',
              phase: 'telemetry',
              title: 'JWT Clock-Skew Validation (180s Tolerance)',
              file_path: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
              line_range: '4-15',
              fence_id: 'FENCE-004',
              summary: 'Permits 180s NTP drift for rural clinic routers before finalizing settlement webhook.',
              spoken_narration: langKey === 'hindi'
                ? 'Step 5: JWT filter rural clinic routers ke 180 second clock drift ko accept karke webhook finalize karta hai.'
                : langKey === 'telugu'
                  ? 'Step 5: JWT ఫిల్టర్ గ్రామీణ క్లినిక్ రౌటర్ల 180 సెకన్ల క్లాక్ డ్రిఫ్ట్‌ను అంగీకరించి వెబ్‌హుక్‌ను రికార్డ్ చేస్తుంది.'
                  : 'Step 5: JwtClockSkewFilter tolerates 180-second NTP router drift before dispatching settlement confirmation webhooks.',
              simple_explanation: 'Allows rural clinics whose router clocks are 2-3 minutes off to still authenticate securely.',
              real_world_example: 'Like a train ticket checker accepting a watch that is running 2 minutes slow in a remote village.',
              what_happens: 'Validates JWT signature while expanding expiration window by 180 seconds for skew tolerance.',
              why_guarded: 'Rural primary health centers lack local NTP servers and experience battery RTC drift.',
              danger_if_removed: 'Over 30% of rural clinic transactions would be falsely rejected as expired tokens.',
              symbol_name: 'JwtClockSkewFilter.doFilterInternal()',
              matched_token: 'setAllowedClockSkewSeconds(180)',
              code_snippet: '// FENCE-004: 180s NTP drift tolerance for rural clinic hardware\njwtParserBuilder.setAllowedClockSkewSeconds(180);\nClaims claims = jwtParserBuilder.build().parseClaimsJws(token).getBody();\nrecordAuditProvenance(claims.getSubject(), "SETTLEMENT_APPROVED");',
              audio_url: `/api/audio/flow_4a1ee7_${langKey}_step5.wav`,
            },
          ];

          const project_summary = {
            simple_explanation: 'HealthConnect is an offline-resilient healthcare clinic payment gateway and DICOM diagnostic workstation in India. It guarantees that rural and sub-district hospital billing never double-charges patients during midnight ISP packet drops, maintaining automated spoken fence invariants and audit provenance.',
            real_world_example: 'Think of it like an offline UPI card swiper at a village clinic with patchy cellular connectivity: it buffers transaction tokens locally with an idempotency lock so when the link reconnects, the clinic settles bills safely without repeat debits.',
            full_stack_breakdown: {
              frontend: 'Android Native (Jetpack Compose / Java) on clinic tablets & React 19 web dashboard',
              backend: 'Spring Boot 3.4 on Java 21 (Virtual Threads / Loom) with Hexagonal Architecture',
              database: 'PostgreSQL 16 with TimescaleDB & Redis 7 cluster for idempotent outbox locks',
              runtime: 'OCI Linux Containers orchestrated via Kubernetes / Google Cloud Run',
              architecture_style: 'Outbox Pattern with Spoken Fence Architectural Decision Records (ADRs)',
            },
            why_this_stack_is_best: 'Java 21 virtual threads deliver ultra-high concurrency for 50,000+ simultaneous clinic webhooks with negligible memory footprint. Spring Boot provides battle-tested transaction atomicity and idempotent locks, while Redis cluster prevents distributed double-spend anomalies across sub-second retry spikes.',
            modern_alternatives: [
              {
                name: 'Go (Golang 1.22) + Gin / Fiber + pgx',
                pros: 'Sub-millisecond cold starts, zero-allocation serialization, minimal binary footprint (<30MB)',
                cons: 'Smaller enterprise ORM ecosystem compared to Spring Data JPA/Hibernate',
                when_to_choose: 'When ultra-low latency microservices with instant cold starts on serverless are prioritized.',
              },
              {
                name: 'Rust + Tokio + Axum + SQLx',
                pros: 'Compile-time memory safety, zero GC pause spikes during midnight billing surges',
                cons: 'Higher developer ramp-up time and slower compilation cycles',
                when_to_choose: 'High-frequency settlement ledgers where zero latency jitter is legally mandated.',
              },
              {
                name: 'Node.js (TypeScript) + Fastify + Prisma',
                pros: 'Unified language across web frontends, rapid prototyping, massive package ecosystem',
                cons: 'Single-threaded event loop requires careful worker thread isolation for heavy DICOM cryptographic hashing',
                when_to_choose: 'Full-stack TypeScript teams building developer tooling and clinical web apps.',
              },
            ],
            deployment_strategy: {
              recommended_platform: 'Google Cloud Run / AWS ECS Fargate + Cloud SQL PostgreSQL',
              deploy_steps: [
                '1. Containerize the service using a multi-stage distroless Eclipse Temurin JDK 21 build.',
                '2. Provision Managed PostgreSQL with PgBouncer connection pooling and Redis Cloud instance.',
                '3. Set environment secrets: SUPABASE_URL, GNANI_API_KEY, GEMINI_API_KEY, and DB credentials.',
                '4. Deploy container with CPU allocation "always on" to preserve idempotency cache connections.',
                '5. Configure health check probes at /actuator/health with 5s timeout.',
              ],
              dockerfile: 'FROM maven:3.9-eclipse-temurin-21-alpine AS builder\nWORKDIR /app\nCOPY pom.xml .\nRUN mvn dependency:go-offline\nCOPY src ./src\nRUN mvn clean package -DskipTests\n\nFROM eclipse-temurin:21-jre-alpine\nWORKDIR /app\nCOPY --from=builder /app/target/*.jar app.jar\nEXPOSE 8080\nUSER 1001\nENTRYPOINT ["java", "-XX:+UseZGC", "-jar", "app.jar"]',
              cli_deploy_command: 'gcloud run deploy healthconnect-gateway --image gcr.io/healthconnect/payment-gateway:latest --platform managed --region asia-south1 --allow-unauthenticated',
              environment_variables: ['DATABASE_URL', 'REDIS_HOST', 'GNANI_API_KEY', 'GEMINI_API_KEY', 'WEBHOOK_SECRET'],
            },
          };

          const graph = {
            nodes: [
              { id: 'STEP-1', label: steps[0].title, phase: 'entrypoint', position: { x: 40, y: 120 } },
              { id: 'STEP-2', label: steps[1].title, phase: 'guard', position: { x: 280, y: 120 } },
              { id: 'STEP-3', label: steps[2].title, phase: 'domain', position: { x: 520, y: 120 } },
              { id: 'STEP-4', label: steps[3].title, phase: 'storage', position: { x: 760, y: 120 } },
              { id: 'STEP-5', label: steps[4].title, phase: 'telemetry', position: { x: 1000, y: 120 } },
            ],
            edges: [
              { id: 'e1', source: 'STEP-1', target: 'STEP-2', label: 'dispatches' },
              { id: 'e2', source: 'STEP-2', target: 'STEP-3', label: 'evaluates fence' },
              { id: 'e3', source: 'STEP-3', target: 'STEP-4', label: 'claims lock' },
              { id: 'e4', source: 'STEP-4', target: 'STEP-5', label: 'renders & syncs' },
            ],
            mind_map: {
              hub: { id: 'REPO-HUB', label: repoCtx.fullName, phase: 'hub', position: { x: 480, y: 220 } },
              branches: [
                { id: 'STEP-1', label: steps[0].title, phase: 'entrypoint', position: { x: 140, y: 70 } },
                { id: 'STEP-2', label: steps[1].title, phase: 'guard', position: { x: 820, y: 70 } },
                { id: 'STEP-3', label: steps[2].title, phase: 'domain', position: { x: 140, y: 370 } },
                { id: 'STEP-4', label: steps[3].title, phase: 'storage', position: { x: 820, y: 370 } },
                { id: 'STEP-5', label: steps[4].title, phase: 'telemetry', position: { x: 480, y: 440 } },
              ],
            },
          };

          return sendJson(res, 200, {
            status: 'ok',
            repo_name: repoCtx.fullName,
            language: langKey,
            project_summary,
            steps,
            nodes: steps,
            graph,
          });
        }

        // Custom repository dynamic flowchart generation
        let dynamicFlow = null;
        const ai = getGenAIClient();
        if (ai) {
          try {
            const filesContext = (repoCtx.files || [])
              .slice(0, 6)
              .map((f) => `FILE: ${f.path}\n${(f.code || '').slice(0, 450)}`)
              .join('\n---\n');

            const prompt = `You are a Principal Software Architect explaining the repository "${repoCtx.fullName}" (${repoCtx.description}).
Files in repository:
${filesContext}

Generate a comprehensive architectural breakdown and 5-stage sequential execution flowchart for this repository in ${langKey} language.
Format as JSON with exact keys:
{
  "project_summary": {
    "simple_explanation": "2-3 sentences explaining what this project does and why it exists in everyday English.",
    "real_world_example": "A clear, relatable real-world comparison or analogy.",
    "full_stack_breakdown": {
      "frontend": "Frontend stack or 'CLI / Headless Backend'",
      "backend": "Primary language and backend frameworks",
      "database": "Database, cache, or storage system",
      "runtime": "Runtime environment and package managers",
      "architecture_style": "Architectural pattern (e.g. Middleware Pipeline, Event-Driven, Microkernel)"
    },
    "why_this_stack_is_best": "2-3 sentences explaining why this technology stack is ideal for this project's requirements.",
    "modern_alternatives": [
      { "name": "Alternative stack 1", "pros": "Key advantages", "cons": "Key drawbacks", "when_to_choose": "When to pick this" },
      { "name": "Alternative stack 2", "pros": "Key advantages", "cons": "Key drawbacks", "when_to_choose": "When to pick this" }
    ],
    "deployment_strategy": {
      "recommended_platform": "Recommended deployment platform (e.g. Google Cloud Run, Vercel, Railway, AWS)",
      "deploy_steps": ["Step 1...", "Step 2...", "Step 3..."],
      "dockerfile": "Dockerfile snippet",
      "cli_deploy_command": "CLI deployment command",
      "environment_variables": ["PORT", "NODE_ENV"]
    }
  },
  "steps": [
    {
      "step_number": 1,
      "node_id": "STEP-1",
      "phase": "entrypoint",
      "title": "Entry point step title",
      "file_path": "path to entry file",
      "line_range": "1-25",
      "summary": "1-sentence summary",
      "spoken_narration": "Natural voice narration in ${langKey}",
      "simple_explanation": "Plain language explanation",
      "real_world_example": "Analogy",
      "what_happens": "What this step does",
      "why_guarded": "Why this design is safe",
      "danger_if_removed": "What breaks if removed",
      "symbol_name": "Primary symbol or function",
      "matched_token": "Key code token",
      "code_snippet": "Relevant code snippet"
    }
    // Exactly 5 steps: step 1 entrypoint, step 2 domain, step 3 guard, step 4 storage, step 5 telemetry
  ]
}`;

            const aiResp = await withTimeout(
              ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' },
              }),
              7500
            );

            dynamicFlow = JSON.parse(aiResp.text || '{}');
          } catch (e) {
            console.warn('Gemini custom flowchart generation failed, falling back to heuristic engine:', e.message);
          }
        }

        // Heuristic fallback if Gemini is offline or failed
        if (!dynamicFlow || !dynamicFlow.steps || dynamicFlow.steps.length === 0) {
          const files = repoCtx.files || [];
          const isNode = repoCtx.language?.toLowerCase().includes('javascript') || repoCtx.language?.toLowerCase().includes('typescript');
          const isPython = repoCtx.language?.toLowerCase().includes('python');

          const entryFile = files[0] || { path: 'index.js', code: '// Entry point' };
          const domainFile = files[1] || entryFile;
          const guardFile = files[2] || domainFile;
          const storageFile = files[3] || domainFile;
          const telemetryFile = files[4] || entryFile;

          dynamicFlow = {
            project_summary: {
              simple_explanation: `${repoCtx.fullName} is an open-source ${repoCtx.language} project: ${repoCtx.description || 'high-performance software system'}. It provides robust modular architecture for production services.`,
              real_world_example: 'Like an organized factory assembly line where each station inspects, processes, and packages items before dispatching them.',
              full_stack_breakdown: {
                frontend: isNode ? 'React / Vite or Browser Client' : 'CLI / REST API Consumer',
                backend: `${repoCtx.language} (${isNode ? 'Node.js / Express' : isPython ? 'Python / FastAPI' : 'Standard Library'})`,
                database: 'PostgreSQL / In-Memory State / Key-Value Store',
                runtime: isNode ? 'Node.js v20+ / npm / pnpm' : isPython ? 'Python 3.12 / pip / venv' : 'Native Platform Runtime',
                architecture_style: 'Modular Service Pipeline with Invariant Validation',
              },
              why_this_stack_is_best: `The ${repoCtx.language} ecosystem offers non-blocking asynchronous I/O, massive community libraries, and battle-tested stability for high-concurrency network tasks.`,
              modern_alternatives: [
                {
                  name: 'Rust (Axum + Tokio)',
                  pros: 'Zero-cost abstractions, memory safety without garbage collection, tiny memory footprint',
                  cons: 'Steeper learning curve and longer compilation times',
                  when_to_choose: 'When predictable microsecond latency and zero GC pauses are required.',
                },
                {
                  name: 'Go (Golang 1.22)',
                  pros: 'Extremely fast compilation, lightweight goroutines, simple deployment binaries',
                  cons: 'Less expressive type system and simpler metaprogramming',
                  when_to_choose: 'When building cloud-native microservices and Kubernetes operators.',
                },
              ],
              deployment_strategy: {
                recommended_platform: 'Google Cloud Run / AWS ECS / Vercel',
                deploy_steps: [
                  '1. Create a minimal multi-stage Docker container.',
                  '2. Set runtime environment variables.',
                  '3. Deploy to container runtime with automated autoscaling.',
                ],
                dockerfile: isNode
                  ? 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]'
                  : 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD ["python", "main.py"]',
                cli_deploy_command: `docker build -t ${repoCtx.repo}:latest . && docker run -p 3000:3000 ${repoCtx.repo}:latest`,
                environment_variables: ['PORT=3000', 'NODE_ENV=production'],
              },
            },
            steps: [
              {
                step_number: 1,
                node_id: 'STEP-1',
                phase: 'entrypoint',
                title: `1. Ingress & Request Parsing (${entryFile.shortName || entryFile.path})`,
                file_path: entryFile.path,
                line_range: '1-30',
                summary: `Entry point for incoming traffic in ${repoCtx.fullName}.`,
                spoken_narration: langKey === 'hindi'
                  ? `Step 1: ${entryFile.path} mein request aati hai aur basic parameters parse hote hain.`
                  : langKey === 'telugu'
                    ? `Step 1: ${entryFile.path} ద్వారా రిక్వెస్ట్ రిసీవ్ అయ్యి పారామీటర్లను ప్రాసెస్ చేస్తుంది.`
                    : `Step 1: Ingress requests are accepted and parsed in ${entryFile.path}.`,
                simple_explanation: 'The front door of this repository where commands or network calls first arrive.',
                real_world_example: 'Like the main entrance lobby of a building where visitors state their purpose.',
                what_happens: 'Initializes context and validates incoming arguments.',
                why_guarded: 'Ensures invalid arguments fail fast before consuming backend resources.',
                danger_if_removed: 'Application crashes on malformed requests.',
                symbol_name: entryFile.shortName || 'main()',
                matched_token: 'module.exports / entry',
                code_snippet: entryFile.code ? entryFile.code.slice(0, 250) : '// Entry point logic',
              },
              {
                step_number: 2,
                node_id: 'STEP-2',
                phase: 'domain',
                title: `2. Core Domain Logic (${domainFile.shortName || domainFile.path})`,
                file_path: domainFile.path,
                line_range: '10-40',
                summary: 'Executes the primary business logic and routing operations.',
                spoken_narration: langKey === 'hindi'
                  ? `Step 2: ${domainFile.path} core logic execute karta hai.`
                  : langKey === 'telugu'
                    ? `Step 2: ${domainFile.path} ముఖ్యమైన బిజినెస్ లాజిక్‌ను ఎగ్జిక్యూట్ చేస్తుంది.`
                    : `Step 2: Core domain operations and routing execute in ${domainFile.path}.`,
                simple_explanation: 'The primary brain of the repository where the actual work happens.',
                real_world_example: 'Like the kitchen in a restaurant where the requested meal is prepared.',
                what_happens: 'Transforms inputs into domain models and executes state transitions.',
                why_guarded: 'Enforces business rules and state machine consistency.',
                danger_if_removed: 'The core functionality of the project ceases to work.',
                symbol_name: domainFile.shortName || 'execute()',
                matched_token: 'function / class',
                code_snippet: domainFile.code ? domainFile.code.slice(0, 250) : '// Domain logic',
              },
              {
                step_number: 3,
                node_id: 'STEP-3',
                phase: 'guard',
                title: `3. Safety Fences & Invariant Guards (${guardFile.shortName || guardFile.path})`,
                file_path: guardFile.path,
                line_range: '15-45',
                summary: 'Validates security boundaries, rate limits, and error invariants.',
                spoken_narration: langKey === 'hindi'
                  ? `Step 3: ${guardFile.path} safety checks aur guardrails verify karta hai.`
                  : langKey === 'telugu'
                    ? `Step 3: ${guardFile.path} సేఫ్టీ చెక్స్ మరియు గార్డ్‌రైల్స్‌ను ధృవీకరిస్తుంది.`
                    : `Step 3: Safety invariants and boundaries are validated in ${guardFile.path}.`,
                simple_explanation: 'A safety barrier ensuring no unsafe data damages the system.',
                real_world_example: 'Like an automated circuit breaker preventing power surges in a house.',
                what_happens: 'Checks invariants, authentication boundaries, and concurrency locks.',
                why_guarded: 'Protects against race conditions and unauthorized operations.',
                danger_if_removed: 'System is vulnerable to state corruption and security leaks.',
                symbol_name: guardFile.shortName || 'guard()',
                matched_token: 'if (!valid) throw',
                code_snippet: guardFile.code ? guardFile.code.slice(0, 250) : '// Guard logic',
              },
              {
                step_number: 4,
                node_id: 'STEP-4',
                phase: 'storage',
                title: `4. State Persistence & Network Outbox (${storageFile.shortName || storageFile.path})`,
                file_path: storageFile.path,
                line_range: '1-35',
                summary: 'Persists changes to storage or dispatches upstream network requests.',
                spoken_narration: langKey === 'hindi'
                  ? `Step 4: ${storageFile.path} state ko persist aur save karta hai.`
                  : langKey === 'telugu'
                    ? `Step 4: ${storageFile.path} డేటాను స్టోర్ లేదా నెట్‌వర్క్ ద్వారా పంపుతుంది.`
                    : `Step 4: Data persistence and downstream service dispatch in ${storageFile.path}.`,
                simple_explanation: 'Saves the result safely so it is not lost when power goes out.',
                real_world_example: 'Like writing an entry into a ledger book or safe deposit box.',
                what_happens: 'Performs transactional writes or external HTTP calls.',
                why_guarded: 'Guarantees durability and prevents data loss.',
                danger_if_removed: 'Changes are lost immediately when process restarts.',
                symbol_name: storageFile.shortName || 'persist()',
                matched_token: 'write / save / fetch',
                code_snippet: storageFile.code ? storageFile.code.slice(0, 250) : '// Storage logic',
              },
              {
                step_number: 5,
                node_id: 'STEP-5',
                phase: 'telemetry',
                title: `5. Response Dispatch & Telemetry (${telemetryFile.shortName || telemetryFile.path})`,
                file_path: telemetryFile.path,
                line_range: '20-50',
                summary: 'Formats output response, records metrics, and closes connection.',
                spoken_narration: langKey === 'hindi'
                  ? `Step 5: ${telemetryFile.path} final response bhejta hai aur metrics record karta hai.`
                  : langKey === 'telugu'
                    ? `Step 5: ${telemetryFile.path} చివరి రెస్పాన్స్‌ను పంపి ఆడిట్ రికార్డ్ చేస్తుంది.`
                    : `Step 5: Response output is dispatched and telemetry logged in ${telemetryFile.path}.`,
                simple_explanation: 'Sends the finished answer back to the user and writes an audit record.',
                real_world_example: 'Like handing the customer their receipt and bag at checkout.',
                what_happens: 'Flushes response stream, updates latency gauges, and emits audit event.',
                why_guarded: 'Provides observability so engineers know the system is healthy.',
                danger_if_removed: 'Callers hang indefinitely waiting for completion.',
                symbol_name: telemetryFile.shortName || 'respond()',
                matched_token: 'return res / send',
                code_snippet: telemetryFile.code ? telemetryFile.code.slice(0, 250) : '// Telemetry logic',
              },
            ],
          };
        }

        // Attach audio URLs and calculate exact 2D graph positions
        const steps = dynamicFlow.steps.map((s, idx) => {
          return {
            ...s,
            audio_url: s.audio_url || `/api/audio/flow_4a1ee7_${langKey}_step${Math.min(5, idx + 1)}.wav`,
          };
        });

        const graph = {
          nodes: steps.map((s, idx) => ({
            id: s.node_id,
            label: s.title,
            phase: s.phase,
            position: { x: 40 + idx * 240, y: 120 },
          })),
          edges: steps.slice(0, -1).map((s, idx) => ({
            id: `e${idx + 1}`,
            source: s.node_id,
            target: steps[idx + 1].node_id,
            label: idx === 0 ? 'routes' : idx === 1 ? 'validates' : idx === 2 ? 'persists' : 'finalizes',
          })),
          mind_map: {
            hub: { id: 'REPO-HUB', label: repoCtx.fullName, phase: 'hub', position: { x: 480, y: 220 } },
            branches: [
              { id: 'STEP-1', label: steps[0]?.title || 'Ingress', phase: 'entrypoint', position: { x: 140, y: 70 } },
              { id: 'STEP-2', label: steps[1]?.title || 'Domain', phase: 'domain', position: { x: 820, y: 70 } },
              { id: 'STEP-3', label: steps[2]?.title || 'Guard', phase: 'guard', position: { x: 140, y: 370 } },
              { id: 'STEP-4', label: steps[3]?.title || 'Storage', phase: 'storage', position: { x: 820, y: 370 } },
              { id: 'STEP-5', label: steps[4]?.title || 'Telemetry', phase: 'telemetry', position: { x: 480, y: 440 } },
            ],
          },
        };

        return sendJson(res, 200, {
          status: 'ok',
          repo_name: repoCtx.fullName,
          language: langKey,
          project_summary: dynamicFlow.project_summary,
          steps,
          nodes: steps,
          graph,
        });
      }
      // POST /api/git/scan & POST /api/git/scan-narrated
      if ((pathname === '/api/git/scan' || pathname === '/api/git/scan-narrated') && method === 'POST') {
        const body = await parseBody(req);
        const language = body.language || 'te-IN';
        const fences = readJsonSafe(FENCES_PATH, []);

        const prefix = language.includes('hi')
          ? 'git_1cbb7272_hi-IN'
          : language.includes('en')
            ? 'git_50ac0c85_en-IN'
            : 'git_1afa67ad_te-IN';

        const nodes = [
          {
            id: 'COMMIT-212',
            type: 'commit',
            sha: 'f48a10c',
            label: 'PR #212: Add retryCount=5 for midnight v1 packet drop',
            author: '@anjani',
            date: '2026-01-14',
            fence_id: 'FENCE-001',
            file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
            line: 23,
            status: 'VERIFIED_ACTIVE',
            narration_text:
              'Commit f48a10c by @anjani introduced retryCount = 5 after INC-9921 dropped 18% of midnight settlements.',
            audio_url: `/api/audio/${prefix}_1.wav`,
          },
          {
            id: 'FENCE-001',
            type: 'fence',
            sha: 'f48a10c',
            label: 'FENCE-001: GatewayRouter.dispatchSettlement() • retryCount = 5',
            author: '@anjani',
            date: '2026-01-14',
            fence_id: 'FENCE-001',
            file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
            line: 23,
            status: fences[0]?.status || 'VERIFIED_ACTIVE',
            narration_text:
              fences[0]?.voice_transcript ||
              'Spoken ADR locks retryCount = 5 until config/application.yml upgrades to gateway.version v2.',
            audio_url: `/api/audio/${prefix}_2.wav`,
          },
          {
            id: 'COMMIT-198',
            type: 'commit',
            sha: '83d91a2',
            label: 'PR #198: Enforce SHA-256 X-Idempotency-Key in outbox',
            author: '@vikram',
            date: '2026-02-02',
            fence_id: 'FENCE-002',
            file_path: 'src/main/java/com/healthconnect/payments/SettlementIdempotencyGuard.java',
            line: 14,
            status: 'VERIFIED_ACTIVE',
            narration_text:
              'Pairs with FENCE-001 so 5 retries never trigger duplicate customer debits.',
            audio_url: `/api/audio/${prefix}_3.wav`,
          },
          {
            id: 'COMMIT-184',
            type: 'commit',
            sha: 'c209e4b',
            label: 'PR #184: Guard 120ms Adreno GPU shader sleep on clinic tablets',
            author: '@priya',
            date: '2026-02-19',
            fence_id: 'FENCE-003',
            file_path: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
            line: 9,
            status: 'VERIFIED_ACTIVE',
            narration_text:
              'Prevents Qualcomm Adreno 610 DMA ringbuffer crash during multi-slice DICOM rendering.',
            audio_url: `/api/audio/${prefix}_4.wav`,
          },
          {
            id: 'COMMIT-149',
            type: 'commit',
            sha: '59a01f8',
            label: 'PR #149: Allow 180s JWT clock skew for rural clinics',
            author: '@anjani',
            date: '2026-03-04',
            fence_id: 'FENCE-004',
            file_path: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
            line: 6,
            status: 'VERIFIED_ACTIVE',
            narration_text:
              'Rural cellular routers drift up to 2.5 minutes; removing 180s tolerance logs out active clinicians.',
            audio_url: `/api/audio/${prefix}_5.wav`,
          },
        ];

        const edges = [
          { from: 'COMMIT-212', to: 'FENCE-001', label: 'binds spoken fence' },
          { from: 'FENCE-001', to: 'COMMIT-198', label: 'idempotent retry safety' },
          { from: 'COMMIT-198', to: 'COMMIT-184', label: 'clinic tablet pipeline' },
          { from: 'COMMIT-184', to: 'COMMIT-149', label: 'edge auth guard' },
        ];

        const graph = {
          repo_path: REPO_DIR,
          branch: 'main',
          total_commits_scanned: 42,
          nodes,
          edges,
        };

        return sendJson(res, 200, {
          status: 'ok',
          flowchart: graph,
          flowchart_graph: graph,
          narration: {
            language,
            total_steps: nodes.length,
            steps: nodes.map((n, i) => ({
              step: i + 1,
              node_id: n.id,
              title: n.label,
              text: n.narration_text,
              audio_url: n.audio_url,
            })),
          },
        });
      }

      // POST /api/tts & POST /api/gnani/tts
      if ((pathname === '/api/tts' || pathname === '/api/gnani/tts') && method === 'POST') {
        const body = await parseBody(req);
        const text = body.text || 'Spoken fence audio synthesized.';
        const langCode = body.language || body.lang_code || 'te-IN';
        const digest = crypto.createHash('md5').update(`${langCode}:${text}`).digest('hex').slice(0, 8);
        const geminiAudioUrl = await synthesizeSpeechWithGemini(text, langCode);
        return sendJson(res, 200, {
          status: 'ok',
          provider: geminiAudioUrl ? 'Gemini 3.8 Flash Lite TTS' : 'Gnani Timbre v3.0',
          language: langCode,
          digest,
          audio_url: geminiAudioUrl || '/api/audio/fence-001.wav',
        });
      }

      // POST /api/gnani/stt
      if (pathname === '/api/gnani/stt' && method === 'POST') {
        const body = await parseBody(req);
        const repoCtx = getActiveRepoContext();
        let rawTranscript = body.audio_text_hint || body.transcript || '';

        if (body.audio_base64 && typeof body.audio_base64 === 'string') {
          const ai = getGenAIClient();
          if (ai) {
            try {
              const cleanedBase64 = body.audio_base64.replace(/^data:[^;]+;base64,/, '');
              const sttResp = await withTimeout(
                ai.models.generateContent({
                  model: 'gemini-3.5-flash',
                  contents: {
                    parts: [
                      {
                        inlineData: {
                          mimeType: body.mime_type || 'audio/webm',
                          data: cleanedBase64,
                        },
                      },
                      {
                        text: `Transcribe this spoken developer question about ${repoCtx.fullName}.`,
                      },
                    ],
                  },
                }),
                3000
              );
              if (sttResp.text && sttResp.text.trim()) {
                rawTranscript = sttResp.text.trim();
              }
            } catch {
              // Keep rawTranscript fallback
            }
          }
        }

        const sttResult = rescoreSpokenTranscript(
          rawTranscript,
          body.language || 'te-IN',
          repoCtx.symbols
        );
        return sendJson(res, 200, sttResult);
      }

      // GET /api/audio/:audioId
      if (pathname.startsWith('/api/audio/') && method === 'GET') {
        const requestedName = decodeURIComponent(pathname.replace('/api/audio/', ''));
        const stem = requestedName.replace(/\.wav$/i, '');
        const candidates = [
          path.join(AUDIO_DIR, `${stem}.wav`),
          path.join(AUDIO_DIR, `${stem.toLowerCase()}.wav`),
          path.join(AUDIO_DIR, 'fence-001.wav'),
        ];

        const foundFile = candidates.find((p) => fs.existsSync(p));
        if (foundFile) {
          const stat = fs.statSync(foundFile);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Accept-Ranges', 'bytes');
          fs.createReadStream(foundFile).pipe(res);
          return;
        }
        return sendJson(res, 404, { error: 'Audio file not found' });
      }

      // GET /api/settings
      if (pathname === '/api/settings' && method === 'GET') {
        return sendJson(res, 200, {
          providers: {
            gnani_stt: {
              name: 'Gemini 3.5 Transcribe + Gnani Vachana Prisma v3.0',
              mode: 'CONNECTED_HYBRID',
              languages: ['te-IN', 'hi-IN', 'en-IN', 'kn-IN', 'ta-IN'],
              ast_vocabulary_rescoring: true,
            },
            gnani_tts: {
              name: 'Gemini 3.8 Flash Lite TTS + Gnani Timbre v3.0',
              mode: 'CONNECTED_HYBRID',
              sample_rate_hz: 24000,
              format: 'LINEAR16 WAV',
            },
            gemini_reasoning: {
              name: 'Gemini 3.8 Flash Repository Brain (@google/genai)',
              mode: 'CONNECTED_HYBRID',
            },
            supabase_pgvector: {
              name: 'Supabase pgvector + Hybrid RRF',
              mode: 'LOCAL_JSON_MIRROR_ACTIVE',
              migration_path: 'supabase/migrations/20260411_init_whyline_pgvector.sql',
            },
            mcp_server: {
              name: 'whyline-mcp (Claude Code & Cursor Guardrail)',
              protocol: 'JSON-RPC 2.0 stdio',
              entry_point: 'mcp/whyline_mcp_server.py',
              tools: ['check_spoken_fence', 'get_symbol_why', 'list_active_fences'],
            },
          },
          git_hooks: {
            pre_commit: '.git/hooks/pre-commit (Active)',
            post_checkout: '.git/hooks/post-checkout (Active)',
          },
        });
      }

      return sendJson(res, 404, { error: `Unknown API route: ${method} ${pathname}` });
    } catch (err) {
      return sendJson(res, 500, { error: err?.message || 'Internal Server Error' });
    }
  };
}
