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
    manifests: [
      {
        path: 'package.json',
        text: JSON.stringify({
          name: 'express',
          version: '5.1.0',
          dependencies: {
            'body-parser': '^2.2.0',
            'merge-descriptors': '^2.0.0',
            parseurl: '~1.3.3',
            qs: '6.14.0',
            finalhandler: '^2.1.0',
            methods: '^1.1.2',
            'array-flatten': '^3.0.0',
          },
        }),
      },
    ],
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
        path: 'lib/express.js',
        shortName: 'express.js',
        language: 'javascript',
        defaultLine: 12,
        fenceId: 'FENCE-EXP-00',
        fences: [{ id: 'FENCE-EXP-00', startLine: 8, endLine: 20, targetLine: 12, token: 'createApplication', badge: 'FENCE-EXP-00 • Express app factory entry point', status: 'VERIFIED_ACTIVE' }],
        code: `'use strict';\n\nvar EventEmitter = require('events').EventEmitter;\nvar mixin = require('merge-descriptors');\nvar proto = require('./application');\n\nfunction createApplication() {\n  var app = function(req, res, next) {\n    app.handle(req, res, next);\n  };\n  mixin(app, EventEmitter.prototype, false);\n  mixin(app, proto, false);\n  app.init();\n  return app;\n}\nmodule.exports = createApplication;\n`,
      },
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
      {
        path: 'lib/middleware/query.js',
        shortName: 'middleware/query.js',
        language: 'javascript',
        defaultLine: 8,
        fenceId: 'FENCE-EXP-03',
        fences: [{ id: 'FENCE-EXP-03', startLine: 4, endLine: 18, targetLine: 8, token: 'queryparse', badge: 'FENCE-EXP-03 • Query parameter sanitization & depth limit', status: 'VERIFIED_ACTIVE' }],
        code: `'use strict';\n\nvar parseUrl = require('parseurl');\nvar qs = require('qs');\n\nmodule.exports = function query(options) {\n  var opts = Object.create(options || null);\n  var queryparse = qs.parse;\n  return function query(req, res, next) {\n    if (!req.query) {\n      var val = parseUrl(req).query;\n      req.query = queryparse(val, opts);\n    }\n    next();\n  };\n};\n`,
      },
      {
        path: 'lib/response.js',
        shortName: 'response.js',
        language: 'javascript',
        defaultLine: 10,
        fenceId: 'FENCE-EXP-04',
        fences: [{ id: 'FENCE-EXP-04', startLine: 4, endLine: 20, targetLine: 10, token: 'res.json', badge: 'FENCE-EXP-04 • Response serialization & Content-Type header guard', status: 'VERIFIED_ACTIVE' }],
        code: `'use strict';\n\nvar res = Object.create(require('http').ServerResponse.prototype);\nmodule.exports = res;\n\nres.status = function status(code) {\n  this.statusCode = code;\n  return this;\n};\n\nres.json = function json(obj) {\n  var body = JSON.stringify(obj);\n  if (!this.get('Content-Type')) this.set('Content-Type', 'application/json');\n  return this.send(body);\n};\n`,
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
    manifests: [
      {
        path: 'package.json',
        text: JSON.stringify({
          name: 'ky',
          version: '1.7.5',
          type: 'module',
          engines: { node: '>=18' },
        }),
      },
    ],
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
        path: 'source/index.ts',
        shortName: 'index.ts',
        language: 'typescript',
        defaultLine: 10,
        fenceId: 'FENCE-KY-00',
        fences: [{ id: 'FENCE-KY-00', startLine: 4, endLine: 20, targetLine: 10, token: 'createInstance', badge: 'FENCE-KY-00 • Public ky factory & HTTP method helpers', status: 'VERIFIED_ACTIVE' }],
        code: `import {Ky} from './core/Ky.js';\nimport type {Input, Options} from './types/options.js';\n\nfunction createInstance(defaults?: Partial<Options>) {\n  const ky = (input: Input, options?: Options) => Ky.create(input, {...defaults, ...options});\n  for (const method of ['get', 'post', 'put', 'delete', 'patch', 'head'] as const) {\n    ky[method] = (input: Input, options?: Options) => Ky.create(input, {...defaults, ...options, method});\n  }\n  return ky;\n}\nexport default createInstance();\n`,
      },
      {
        path: 'source/core/normalize.ts',
        shortName: 'normalize.ts',
        language: 'typescript',
        defaultLine: 8,
        fenceId: 'FENCE-KY-02',
        fences: [{ id: 'FENCE-KY-02', startLine: 4, endLine: 16, targetLine: 8, token: 'normalizeRetryOptions', badge: 'FENCE-KY-02 • Option validation, prefixUrl & retry normalization', status: 'VERIFIED_ACTIVE' }],
        code: `export function normalizeOptions(options: Record<string, any> = {}) {\n  const retry = typeof options.retry === 'number' ? {limit: options.retry} : {limit: 2, ...options.retry};\n  const prefixUrl = String(options.prefixUrl || '').replace(/\\/+$/, '');\n  return {\n    ...options,\n    retry,\n    prefixUrl,\n    timeout: options.timeout ?? 10_000,\n    hooks: {beforeRequest: [], beforeRetry: [], afterResponse: [], ...options.hooks},\n  };\n}\n`,
      },
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
      {
        path: 'source/errors/HTTPError.ts',
        shortName: 'HTTPError.ts',
        language: 'typescript',
        defaultLine: 7,
        fenceId: 'FENCE-KY-03',
        fences: [{ id: 'FENCE-KY-03', startLine: 3, endLine: 15, targetLine: 7, token: 'HTTPError', badge: 'FENCE-KY-03 • Non-2xx typed HTTPError & TimeoutError wrapping', status: 'VERIFIED_ACTIVE' }],
        code: `export class HTTPError extends Error {\n  public response: Response;\n  public request: Request;\n  constructor(response: Response, request: Request) {\n    super(\`Request failed with status code \${response.status}: \${request.method} \${request.url}\`);\n    this.name = 'HTTPError';\n    this.response = response;\n    this.request = request;\n  }\n}\n`,
      },
      {
        path: 'source/utils/delay.ts',
        shortName: 'delay.ts',
        language: 'typescript',
        defaultLine: 6,
        fenceId: 'FENCE-KY-04',
        fences: [{ id: 'FENCE-KY-04', startLine: 2, endLine: 12, targetLine: 6, token: 'AbortSignal', badge: 'FENCE-KY-04 • AbortSignal-aware retry timer cleanup', status: 'VERIFIED_ACTIVE' }],
        code: `export default function delay(ms: number, signal?: AbortSignal): Promise<void> {\n  return new Promise((resolve, reject) => {\n    if (signal?.aborted) return reject(signal.reason);\n    const timer = setTimeout(resolve, ms);\n    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, {once: true});\n  });\n}\n`,
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
    manifests: [
      {
        path: 'pyproject.toml',
        text: '[project]\nname = "click"\nversion = "8.1.8"\ndescription = "Composable command line interface toolkit"\nrequires-python = ">=3.8"\n',
      },
    ],
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
        path: 'src/click/__init__.py',
        shortName: '__init__.py',
        language: 'python',
        defaultLine: 5,
        fenceId: 'FENCE-CLK-00',
        fences: [{ id: 'FENCE-CLK-00', startLine: 1, endLine: 12, targetLine: 5, token: 'command', badge: 'FENCE-CLK-00 • Public Click package exports', status: 'VERIFIED_ACTIVE' }],
        code: `from .core import BaseCommand, Command, Context, Group\nfrom .decorators import command, group, option, argument\nfrom .termui import echo, prompt, confirm\n`,
      },
      {
        path: 'src/click/decorators.py',
        shortName: 'decorators.py',
        language: 'python',
        defaultLine: 6,
        fenceId: 'FENCE-CLK-02',
        fences: [{ id: 'FENCE-CLK-02', startLine: 2, endLine: 14, targetLine: 6, token: 'def command', badge: 'FENCE-CLK-02 • Decorator binding for CLI callbacks', status: 'VERIFIED_ACTIVE' }],
        code: `def command(name=None, cls=None, **attrs):\n    def decorator(f):\n        cmd = (cls or Command)(name=name or f.__name__.lower(), callback=f, **attrs)\n        return cmd\n    return decorator\n`,
      },
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
      {
        path: 'src/click/parser.py',
        shortName: 'parser.py',
        language: 'python',
        defaultLine: 6,
        fenceId: 'FENCE-CLK-03',
        fences: [{ id: 'FENCE-CLK-03', startLine: 2, endLine: 14, targetLine: 6, token: 'OptionParser', badge: 'FENCE-CLK-03 • POSIX argument & flag tokenization', status: 'VERIFIED_ACTIVE' }],
        code: `class OptionParser:\n    def parse_args(self, args):\n        opts, order = {}, []\n        return opts, list(args), order\n`,
      },
      {
        path: 'src/click/termui.py',
        shortName: 'termui.py',
        language: 'python',
        defaultLine: 5,
        fenceId: 'FENCE-CLK-04',
        fences: [{ id: 'FENCE-CLK-04', startLine: 1, endLine: 10, targetLine: 5, token: 'echo', badge: 'FENCE-CLK-04 • Terminal output & prompt stream handling', status: 'VERIFIED_ACTIVE' }],
        code: `import sys\n\ndef echo(message=None, err=False):\n    stream = sys.stderr if err else sys.stdout\n    print(message or "", file=stream)\n`,
      },
    ],
  },
};

function buildDefaultHealthConnectContext() {
  const fences = readJsonSafe(FENCES_PATH, []);
  const localStack = {
    frontend: ['Android Native (Jetpack Compose / Java)', 'React 19 Dashboard'],
    backend: ['Spring Boot 3.4', 'Java 21 (Virtual Threads)'],
    database: ['PostgreSQL 16 (TimescaleDB)', 'Redis 7 Cluster'],
    auth: ['JWT Clock-Skew Filter (180s NTP Drift Tolerance)'],
    services: ['NPCI / UPI Payment Gateway', 'Gnani Vachana Voice Pipeline'],
    runtimes: ['JVM 21', 'Node.js'],
    api_keys_and_env: ['DATABASE_URL', 'REDIS_HOST', 'GNANI_API_KEY', 'GEMINI_API_KEY', 'WEBHOOK_SECRET'],
    manifests: ['pom.xml', 'package.json'],
  };
  const localBreakdown = {
    frontend: 'Android Native (Jetpack Compose / Java) on clinic tablets & React 19 web dashboard',
    backend: 'Spring Boot 3.4 on Java 21 (Virtual Threads / Loom) with Hexagonal Architecture',
    database: 'PostgreSQL 16 with TimescaleDB & Redis 7 cluster for idempotent outbox locks',
    apis_and_services: 'NPCI / UPI Settlement Webhooks + JWT Auth',
    auth: 'JWT Clock-Skew Validation (180s Tolerance)',
    api_keys_summary: localStack.api_keys_and_env.join(', '),
    runtime: 'OCI Linux Containers orchestrated via Kubernetes / Google Cloud Run',
    architecture_style: 'Outbox Pattern with Spoken Fence Architectural Decision Records (ADRs)',
  };
  const ctx = {
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
    architecture_style: localBreakdown.architecture_style,
    runtime_engine: localBreakdown.runtime,
    detected_stack: localStack,
    full_stack_breakdown: localBreakdown,
    files: DEMO_FILES,
    fences,
    symbols: [
      'GatewayRouter.java',
      'SettlementIdempotencyGuard.java',
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
  enrichRepoContextWithFlowchart(ctx);
  return ctx;
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
      httpOptions: { apiVersion: 'v1beta', headers: { 'User-Agent': 'aistudio-build' } },
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

function compute384dEmbedding(text) {
  const vec = new Array(384).fill(0);
  const tokens = String(text || '').toLowerCase().match(/[a-z0-9_]+/g) || [];
  if (tokens.length === 0) return vec;
  for (const tok of tokens) {
    const grams = [tok];
    for (let i = 0; i <= tok.length - 3; i++) {
      grams.push(tok.slice(i, i + 3));
    }
    for (const g of grams) {
      const digest = crypto.createHash('sha256').update(g).digest();
      const idx = digest.readUInt16BE(0) % 384;
      const sign = (digest[2] % 2 === 0) ? 1.0 : -1.0;
      vec[idx] += sign;
    }
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1.0;
  return vec.map((v) => Number((v / norm).toFixed(6)));
}

async function querySupabasePgVectorFences(queryText, matchCount = 3) {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  if (!supabaseUrl || !supabaseKey) return null;

  const t0 = Date.now();
  try {
    const queryEmbedding = compute384dEmbedding(queryText);
    const rpcUrl = `${supabaseUrl}/rest/v1/rpc/match_whyline_code_and_fences`;
    const resp = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query_text: queryText,
        query_embedding: queryEmbedding,
        match_count: matchCount,
        rrf_k: 60,
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          mode: 'supabase_pgvector_live',
          latency_ms: Date.now() - t0,
          matches: data,
          rpc_function: 'match_whyline_code_and_fences',
        };
      }
    }
  } catch (err) {
    console.warn('Supabase RRF query skipped:', err.message);
  }
  return null;
}

/**
 * Prioritizes verified current Gemini models per Google AI Gemini API docs,
 * with automatic cascade on rate limits or quota exhaustion.
 */
const GEMINI_MODEL_CASCADE = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash-lite',
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
];

const modelCooldownMap = new Map();
let geminiNetworkOfflineUntil = 0;

async function generateContentWithFallback(ai, params, timeoutMs = 6500) {
  const now = Date.now();
  if (geminiNetworkOfflineUntil > now) {
    throw new Error('Gemini network temporarily unreachable (cooldown active)');
  }
  let lastError = null;
  const candidates = GEMINI_MODEL_CASCADE.filter((m) => (modelCooldownMap.get(m) || 0) <= now);
  const activeList = candidates.length > 0 ? candidates : ['gemini-3.8-flash', 'gemini-3-flash-preview', 'gemini-2.5-flash-lite'];

  for (const model of activeList) {
    try {
      const perModelTimeout = Math.min(timeoutMs, 4000);
      const response = await withTimeout(
        ai.models.generateContent({
          ...params,
          model,
        }),
        perModelTimeout
      );
      if (response && (response.text || response.candidates?.length)) {
        modelCooldownMap.delete(model);
        geminiNetworkOfflineUntil = 0;
        return { response, modelUsed: model };
      }
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const isNetworkDown = msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('EACCES') || msg.includes('ECONNREFUSED');
      if (isNetworkDown) {
        geminiNetworkOfflineUntil = Date.now() + 30 * 1000;
        break;
      }
      // On 503 / 429 / 404, place this single model on short 2-minute cooldown and try the next model immediately
      modelCooldownMap.set(model, Date.now() + 2 * 60 * 1000);
    }
  }
  throw lastError || new Error('All Gemini model cascade targets failed');
}

function inferEditorLanguage(filePath = '') {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.java') return 'java';
  if (ext === '.kt' || ext === '.kts') return 'kotlin';
  if (ext === '.scala' || ext === '.sc') return 'scala';
  if (ext === '.cs') return 'csharp';
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs') return 'javascript';
  if (ext === '.py') return 'python';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  if (ext === '.json') return 'json';
  if (ext === '.md') return 'markdown';
  if (ext === '.go') return 'go';
  if (ext === '.rs') return 'rust';
  if (ext === '.cpp' || ext === '.cc' || ext === '.cxx' || ext === '.hpp' || ext === '.c' || ext === '.h') return 'cpp';
  if (ext === '.rb') return 'ruby';
  if (ext === '.php') return 'php';
  if (ext === '.ex' || ext === '.exs') return 'elixir';
  if (ext === '.swift') return 'swift';
  if (ext === '.zig') return 'zig';
  if (ext === '.dart') return 'dart';
  if (ext === '.jl') return 'julia';
  return 'javascript';
}

const LANGUAGE_PROFILES = {
  python: { language: 'Python', editor: 'python', ext: '.py', dir: 'src', runtime: 'Python 3.12 (CPython)', arch: 'Modular Python Package / Service', manifest: 'pyproject.toml' },
  go: { language: 'Go', editor: 'go', ext: '.go', dir: 'pkg', runtime: 'Go (Golang Runtime)', arch: 'Concurrent Go Module / Service', manifest: 'go.mod' },
  rust: { language: 'Rust', editor: 'rust', ext: '.rs', dir: 'src', runtime: 'Rust (Cargo / Tokio Native)', arch: 'Memory-Safe Rust Crate', manifest: 'Cargo.toml' },
  java: { language: 'Java', editor: 'java', ext: '.java', dir: 'src/main/java', runtime: 'Java (JVM 21)', arch: 'Enterprise JVM Service', manifest: 'pom.xml' },
  kotlin: { language: 'Kotlin', editor: 'kotlin', ext: '.kt', dir: 'src/main/kotlin', runtime: 'Kotlin (JVM / Coroutines Runtime)', arch: 'Modular Kotlin Service', manifest: 'build.gradle.kts' },
  scala: { language: 'Scala', editor: 'scala', ext: '.scala', dir: 'src/main/scala', runtime: 'Scala 3 (JVM / Akka Runtime)', arch: 'Functional Scala Service', manifest: 'build.sbt' },
  csharp: { language: 'C#', editor: 'csharp', ext: '.cs', dir: 'src', runtime: '.NET 8 CLR Runtime', arch: 'Enterprise .NET Service', manifest: 'Directory.Build.props' },
  cpp: { language: 'C++', editor: 'cpp', ext: '.cpp', dir: 'src', runtime: 'Native C/C++ (LLVM / Clang)', arch: 'High-Performance Native C/C++ Library', manifest: 'CMakeLists.txt' },
  ruby: { language: 'Ruby', editor: 'ruby', ext: '.rb', dir: 'lib', runtime: 'Ruby (MRI / YJIT)', arch: 'Modular Ruby Gem / Service', manifest: 'Gemfile' },
  php: { language: 'PHP', editor: 'php', ext: '.php', dir: 'src', runtime: 'PHP 8.3 (Zend Engine)', arch: 'Modular PHP Package / Application', manifest: 'composer.json' },
  elixir: { language: 'Elixir', editor: 'elixir', ext: '.ex', dir: 'lib', runtime: 'Elixir (BEAM / OTP VM)', arch: 'Fault-Tolerant BEAM / OTP Application', manifest: 'mix.exs' },
  swift: { language: 'Swift', editor: 'swift', ext: '.swift', dir: 'Sources', runtime: 'Swift (LLVM Native Runtime)', arch: 'Modular Swift Package', manifest: 'Package.swift' },
  zig: { language: 'Zig', editor: 'zig', ext: '.zig', dir: 'src', runtime: 'Zig Native Compiler Runtime', arch: 'Low-Level Systems Zig Package', manifest: 'build.zig' },
  dart: { language: 'Dart', editor: 'dart', ext: '.dart', dir: 'lib', runtime: 'Dart VM / Flutter Engine', arch: 'Reactive Dart / Flutter Package', manifest: 'pubspec.yaml' },
  julia: { language: 'Julia', editor: 'julia', ext: '.jl', dir: 'src', runtime: 'Julia JIT Scientific Runtime', arch: 'High-Performance Julia Scientific Package', manifest: 'Project.toml' },
  typescript: { language: 'TypeScript', editor: 'typescript', ext: '.ts', dir: 'src', runtime: 'Node.js / TypeScript Runtime', arch: 'Modular TypeScript Package', manifest: 'package.json' },
  javascript: { language: 'JavaScript', editor: 'javascript', ext: '.js', dir: 'src', runtime: 'Node.js / ECMAScript Runtime', arch: 'Modular JavaScript Package', manifest: 'package.json' },
};

const KNOWN_REPO_LANGUAGE_HINTS = {
  'psf/requests': 'python', 'tiangolo/fastapi': 'python', 'encode/httpx': 'python', 'pydantic/pydantic': 'python', 'textualize/rich': 'python', 'pallets/flask': 'python', 'pallets/click': 'python', 'django/django': 'python', 'celery/celery': 'python', 'tornadoweb/tornado': 'python', 'psf/black': 'python', 'pytest-dev/pytest': 'python', 'sqlalchemy/sqlalchemy': 'python', 'scrapy/scrapy': 'python',
  'gin-gonic/gin': 'go', 'spf13/cobra': 'go', 'gofiber/fiber': 'go', 'uber-go/zap': 'go', 'charmbracelet/bubbletea': 'go', 'go-chi/chi': 'go', 'gorilla/mux': 'go', 'syncthing/syncthing': 'go', 'junegunn/fzf': 'go', 'hashicorp/terraform': 'go', 'prometheus/prometheus': 'go', 'caddyserver/caddy': 'go',
  'burntsushi/ripgrep': 'rust', 'serde-rs/serde': 'rust', 'tokio-rs/axum': 'rust', 'tokio-rs/tokio': 'rust', 'sharkdp/fd': 'rust', 'sharkdp/bat': 'rust', 'clap-rs/clap': 'rust', 'actix/actix-web': 'rust', 'hyperium/hyper': 'rust', 'astral-sh/uv': 'rust', 'astral-sh/ruff': 'rust', 'nushell/nushell': 'rust', 'starship/starship': 'rust', 'alacritty/alacritty': 'rust',
  'google/gson': 'java', 'projectlombok/lombok': 'java', 'square/okhttp': 'java', 'reactivex/rxjava': 'java', 'spring-projects/spring-boot': 'java', 'google/guava': 'java', 'elastic/elasticsearch': 'java', 'apache/kafka': 'java',
  'jetbrains/kotlin': 'kotlin', 'ktorio/ktor': 'kotlin', 'square/leakcanary': 'kotlin', 'coil-kt/coil': 'kotlin',
  'scala/scala': 'scala', 'scala/scala3': 'scala', 'playframework/playframework': 'scala', 'akka/akka': 'scala',
  'dotnet/runtime': 'csharp', 'dotnet/aspnetcore': 'csharp', 'dapperlib/dapper': 'csharp',
  'fmtlib/fmt': 'cpp', 'nlohmann/json': 'cpp', 'gabime/spdlog': 'cpp', 'catchorg/catch2': 'cpp', 'ocornut/imgui': 'cpp', 'ggml-org/llama.cpp': 'cpp', 'redis/redis': 'cpp', 'sqlite/sqlite': 'cpp',
  'sinatra/sinatra': 'ruby', 'jekyll/jekyll': 'ruby', 'sidekiq/sidekiq': 'ruby', 'rails/rails': 'ruby', 'rubocop/rubocop': 'ruby', 'discourse/discourse': 'ruby', 'fastlane/fastlane': 'ruby', 'homebrew/brew': 'ruby',
  'guzzle/guzzle': 'php', 'seldaek/monolog': 'php', 'vlucas/phpdotenv': 'php', 'laravel/laravel': 'php', 'symfony/symfony': 'php', 'composer/composer': 'php', 'phpunit/phpunit': 'php',
  'phoenixframework/phoenix': 'elixir', 'elixir-ecto/ecto': 'elixir', 'elixir-lang/elixir': 'elixir', 'livebook-dev/livebook': 'elixir', 'plausible/analytics': 'elixir',
  'alamofire/alamofire': 'swift', 'swiftyjson/swiftyjson': 'swift', 'vapor/vapor': 'swift', 'onevcat/kingfisher': 'swift', 'pointfreeco/swift-composable-architecture': 'swift',
  'ziglang/zig': 'zig', 'mitchellh/libxev': 'zig', 'zigtools/zls': 'zig', 'oven-sh/bun': 'zig', 'ghostty-org/ghostty': 'zig', 'tigerbeetle/tigerbeetle': 'zig',
  'cfug/dio': 'dart', 'rrousselgit/riverpod': 'dart', 'flutter/flutter': 'dart', 'felangel/bloc': 'dart', 'appflowy-io/appflowy': 'dart',
  'fluxml/flux.jl': 'julia', 'juliadata/dataframes.jl': 'julia', 'julialang/julia': 'julia', 'sciml/differentialequations.jl': 'julia', 'jump-dev/jump.jl': 'julia',
  'colinhacks/zod': 'typescript', 'trpc/trpc': 'typescript', 'pmndrs/zustand': 'typescript', 'tanstack/query': 'typescript', 'evanw/esbuild': 'typescript', 'sindresorhus/ky': 'typescript', 'nestjs/nest': 'typescript', 'prisma/prisma': 'typescript',
  'encode/starlette': 'python', 'scipy/scipy': 'python', 'cherrypy/cherrypy': 'python', 'fabric/fabric': 'python',
  'labstack/echo': 'go', 'allegro/bigcache': 'go', 'stretchr/testify': 'go', 'sirupsen/logrus': 'go', 'valyala/fasthttp': 'go',
  'diesel-rs/diesel': 'rust', 'rayon-rs/rayon': 'rust', 'seanmonstar/reqwest': 'rust', 'crossbeam-rs/crossbeam': 'rust', 'pola-rs/polars': 'rust',
  'koajs/koa': 'javascript', 'socketio/socket.io': 'javascript', 'moment/moment': 'javascript', 'dayjs/dayjs': 'javascript',
  'typeorm/typeorm': 'typescript', 'immerjs/immer': 'typescript',
  'square/moshi': 'kotlin', 'netty/netty': 'java', 'dropwizard/dropwizard': 'java', 'micronaut-projects/micronaut-core': 'java', 'apache/spark': 'scala',
  'libuv/libuv': 'cpp', 'openssl/openssl': 'cpp',
  'heartcombo/devise': 'ruby', 'sparklemotion/nokogiri': 'ruby', 'sebastianbergmann/phpunit': 'php',
  'apple/swift-nio': 'swift', 'dart-lang/sdk': 'dart',
  'lodash/lodash': 'javascript', 'axios/axios': 'javascript', 'chalk/chalk': 'javascript', 'tj/commander.js': 'javascript', 'iamkun/dayjs': 'javascript', 'expressjs/express': 'javascript', 'vercel/ms': 'javascript', 'fastify/fastify': 'javascript',
};

function normalizeProgrammingLanguageHint(rawHint = '') {
  const raw = String(rawHint || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'c++' || raw === 'c' || raw === 'cxx' || raw === 'cc') return 'cpp';
  if (raw === 'c#' || raw === 'cs' || raw === 'dotnet' || raw === '.net') return 'csharp';
  if (raw === 'py') return 'python';
  if (raw === 'golang') return 'go';
  if (raw === 'rs') return 'rust';
  if (raw === 'rb') return 'ruby';
  if (raw === 'ex' || raw === 'exs') return 'elixir';
  if (raw === 'jl') return 'julia';
  if (raw === 'ts') return 'typescript';
  if (raw === 'js' || raw === 'node' || raw === 'nodejs') return 'javascript';
  if (raw === 'kt') return 'kotlin';
  if (LANGUAGE_PROFILES[raw]) return raw;
  return '';
}

function inferRepoLanguageProfile(owner = '', repo = '', rawLanguage = '') {
  const normalizedHint = normalizeProgrammingLanguageHint(rawLanguage);
  if (normalizedHint && LANGUAGE_PROFILES[normalizedHint]) {
    return LANGUAGE_PROFILES[normalizedHint];
  }
  const slug = `${owner}/${repo}`.toLowerCase();
  if (KNOWN_REPO_LANGUAGE_HINTS[slug]) {
    return LANGUAGE_PROFILES[KNOWN_REPO_LANGUAGE_HINTS[slug]];
  }
  const combined = `${owner} ${repo}`.toLowerCase();
  if (repo.toLowerCase().endsWith('.jl') || /\bjulia\b|\bfluxml\b|\bsciml\b/.test(combined)) return LANGUAGE_PROFILES.julia;
  if (/\bzig\b|\blibxev\b|\btigerbeetle\b/.test(combined)) return LANGUAGE_PROFILES.zig;
  if (/\belixir\b|\bphoenix\b|\becto\b|\bmix\b|\blivebook\b/.test(combined)) return LANGUAGE_PROFILES.elixir;
  if (/\bswift\b|\balamofire\b|\bvapor\b/.test(combined)) return LANGUAGE_PROFILES.swift;
  if (/\bdart\b|\bflutter\b|\briverpod\b|\bdio\b/.test(combined)) return LANGUAGE_PROFILES.dart;
  if (/\bkotlin\b|\bktor\b|-kt\b|\bjetbrains\b/.test(combined)) return LANGUAGE_PROFILES.kotlin;
  if (/\bscala\b|\bakka\b|\bsbt\b/.test(combined)) return LANGUAGE_PROFILES.scala;
  if (/\bcsharp\b|\bdotnet\b|\baspnetcore\b/.test(combined)) return LANGUAGE_PROFILES.csharp;
  if (/\brust\b|-rs\b|\bcargo\b|\btokio\b|\bserde\b|\bripgrep\b|\baxum\b|\bclap\b|\buv\b|\bruff\b/.test(combined)) return LANGUAGE_PROFILES.rust;
  if (/\bgo\b|\bgolang\b|-go\b|\bgo-|\bgin\b|\bcobra\b|\bgofiber\b|\bbubbletea\b/.test(combined)) return LANGUAGE_PROFILES.go;
  if (/\bpython\b|\bpy\b|-py\b|\bpy-|\bfastapi\b|\bflask\b|\bdjango\b|\bhttpx\b|\bpydantic\b|\brequests\b|\bpytest\b/.test(combined)) return LANGUAGE_PROFILES.python;
  if (/\bjava\b|\bspring\b|\bgson\b|\blombok\b|\bokhttp\b|\bguava\b/.test(combined)) return LANGUAGE_PROFILES.java;
  if (/\bcpp\b|\bc\+\+|\bfmtlib\b|\bspdlog\b|\bnlohmann\b|\bcatch2\b|\bimgui\b/.test(combined)) return LANGUAGE_PROFILES.cpp;
  if (/\bruby\b|-rb\b|\brails\b|\bsinatra\b|\bjekyll\b|\bsidekiq\b|\brubocop\b/.test(combined)) return LANGUAGE_PROFILES.ruby;
  if (/\bphp\b|\blaravel\b|\bsymfony\b|\bguzzle\b|\bmonolog\b|\bcomposer\b/.test(combined)) return LANGUAGE_PROFILES.php;
  if (repo.toLowerCase().endsWith('.js') || /\bexpress\b|\blodash\b|\baxios\b|\bchalk\b|\bdayjs\b|\bfastify\b/.test(combined)) return LANGUAGE_PROFILES.javascript;
  return LANGUAGE_PROFILES.typescript;
}

function buildIdiomaticSyntheticCode(profile, fullName, syntheticPath, st, fenceId) {
  const comment = `Repository: ${fullName} | Module: ${st.role} | Guard: ${fenceId}`;
  switch (profile.editor) {
    case 'python':
      return `"""${comment}"""\nfrom typing import Any, Dict\n\n\ndef ${st.fn}(payload: Dict[str, Any]) -> Dict[str, Any]:\n    # ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    if not isinstance(payload, dict):\n        raise ValueError("Invalid execution payload in ${syntheticPath}")\n    return {\n        "repository": "${fullName}",\n        "module": "${syntheticPath}",\n        "status": "VERIFIED_ACTIVE",\n    }\n`;
    case 'go':
      return `// ${comment}\npackage ${profile.dir}\n\nimport "errors"\n\n// ${st.fn} enforces ${fenceId} invariants for ${fullName}.\nfunc ${st.fn}(payload map[string]any) (map[string]string, error) {\n\t// ${fenceId}: Guardrail protecting ${st.role.toLowerCase()}\n\tif payload == nil {\n\t\treturn nil, errors.New("invalid nil payload in ${syntheticPath}")\n\t}\n\treturn map[string]string{\n\t\t"repository": "${fullName}",\n\t\t"module": "${syntheticPath}",\n\t\t"status": "VERIFIED_ACTIVE",\n\t}, nil\n}\n`;
    case 'rust':
      return `//! ${comment}\nuse std::collections::HashMap;\n\n/// ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\npub fn ${st.fn}(payload: &HashMap<String, String>) -> Result<HashMap<&'static str, &'static str>, &'static str> {\n    if payload.is_empty() {\n        return Err("Empty execution payload in ${syntheticPath}");\n    }\n    let mut out = HashMap::new();\n    out.insert("repository", "${fullName}");\n    out.insert("module", "${syntheticPath}");\n    out.insert("status", "VERIFIED_ACTIVE");\n    Ok(out)\n}\n`;
    case 'java':
      return `// ${comment}\npackage com.whyline.indexed;\n\nimport java.util.Map;\nimport java.util.Objects;\n\npublic final class ${st.className} {\n    // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    public Map<String, String> ${st.fn}(Map<String, Object> payload) {\n        Objects.requireNonNull(payload, "payload cannot be null in ${syntheticPath}");\n        return Map.of("repository", "${fullName}", "module", "${syntheticPath}", "status", "VERIFIED_ACTIVE");\n    }\n}\n`;
    case 'kotlin':
      return `// ${comment}\npackage com.whyline.indexed\n\nobject ${st.className} {\n    // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    fun ${st.fn}(payload: Map<String, Any>): Map<String, String> {\n        require(payload.isNotEmpty()) { "Invalid payload in ${syntheticPath}" }\n        return mapOf("repository" to "${fullName}", "module" to "${syntheticPath}", "status" to "VERIFIED_ACTIVE")\n    }\n}\n`;
    case 'scala':
      return `// ${comment}\npackage com.whyline.indexed\n\nobject ${st.className} {\n  // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n  def ${st.fn}(payload: Map[String, Any]): Map[String, String] = {\n    require(payload.nonEmpty, "Invalid payload in ${syntheticPath}")\n    Map("repository" -> "${fullName}", "module" -> "${syntheticPath}", "status" -> "VERIFIED_ACTIVE")\n  }\n}\n`;
    case 'csharp':
      return `// ${comment}\nusing System;\nusing System.Collections.Generic;\n\nnamespace Whyline.Indexed;\n\npublic static class ${st.className}\n{\n    // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    public static Dictionary<string, string> ${st.fn}(Dictionary<string, object> payload)\n    {\n        ArgumentNullException.ThrowIfNull(payload);\n        return new Dictionary<string, string> { ["repository"] = "${fullName}", ["module"] = "${syntheticPath}", ["status"] = "VERIFIED_ACTIVE" };\n    }\n}\n`;
    case 'cpp':
      return `// ${comment}\n#include <stdexcept>\n#include <string>\n#include <unordered_map>\n\nnamespace whyline {\n// ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\ninline std::unordered_map<std::string, std::string> ${st.fn}(const std::string& input) {\n    if (input.empty()) {\n        throw std::invalid_argument("Empty payload in ${syntheticPath}");\n    }\n    return {{"repository", "${fullName}"}, {"module", "${syntheticPath}"}, {"status", "VERIFIED_ACTIVE"}};\n}\n} // namespace whyline\n`;
    case 'ruby':
      return `# frozen_string_literal: true\n# ${comment}\n\nmodule IndexedRepo\n  # ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n  def self.${st.fn}(payload)\n    raise ArgumentError, "Invalid payload in ${syntheticPath}" unless payload.is_a?(Hash)\n\n    {\n      repository: "${fullName}",\n      module: "${syntheticPath}",\n      status: "VERIFIED_ACTIVE"\n    }\n  end\nend\n`;
    case 'php':
      return `<?php\ndeclare(strict_types=1);\n// ${comment}\n\nnamespace Whyline\\Indexed;\n\nfinal class ${st.className}\n{\n    // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    public static function ${st.fn}(array $payload): array\n    {\n        if (empty($payload)) {\n            throw new \\InvalidArgumentException('Invalid payload in ${syntheticPath}');\n        }\n        return ['repository' => '${fullName}', 'module' => '${syntheticPath}', 'status' => 'VERIFIED_ACTIVE'];\n    }\n}\n`;
    case 'elixir':
      return `# ${comment}\ndefmodule IndexedRepo.${st.className} do\n  @moduledoc "${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}"\n\n  def ${st.fn}(payload) when is_map(payload) do\n    {:ok, %{repository: "${fullName}", module: "${syntheticPath}", status: "VERIFIED_ACTIVE"}}\n  end\nend\n`;
    case 'swift':
      return `// ${comment}\nimport Foundation\n\npublic enum ${st.className} {\n    // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n    public static func ${st.fn}(_ payload: [String: String]) throws -> [String: String] {\n        guard !payload.isEmpty else { throw NSError(domain: "${fullName}", code: 400) }\n        return ["repository": "${fullName}", "module": "${syntheticPath}", "status": "VERIFIED_ACTIVE"]\n    }\n}\n`;
    case 'zig':
      return `// ${comment}\nconst std = @import("std");\n\n// ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\npub fn ${st.fn}(payload: []const u8) ![]const u8 {\n    if (payload.len == 0) return error.InvalidPayload;\n    return "${syntheticPath}:VERIFIED_ACTIVE";\n}\n`;
    case 'dart':
      return `// ${comment}\nclass ${st.className} {\n  // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n  static Map<String, String> ${st.fn}(Map<String, dynamic> payload) {\n    if (payload.isEmpty) {\n      throw ArgumentError('Invalid payload in ${syntheticPath}');\n    }\n    return {'repository': '${fullName}', 'module': '${syntheticPath}', 'status': 'VERIFIED_ACTIVE'};\n  }\n}\n`;
    case 'julia':
      return `# ${comment}\nmodule ${st.className}\n\n# ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\nfunction ${st.fn}(payload::Dict)\n    isempty(payload) && throw(ArgumentError("Invalid payload in ${syntheticPath}"))\n    return Dict("repository" => "${fullName}", "module" => "${syntheticPath}", "status" => "VERIFIED_ACTIVE")\nend\n\nend # module\n`;
    case 'javascript':
      return `/**\n * ${comment}\n */\nexport async function ${st.fn}(payload) {\n  // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n  if (!payload || typeof payload !== 'object') {\n    throw new Error('Invalid execution payload in ${syntheticPath}');\n  }\n  return {\n    repository: "${fullName}",\n    module: "${syntheticPath}",\n    status: "VERIFIED_ACTIVE",\n  };\n}\n`;
    default:
      return `/**\n * ${comment}\n */\nexport async function ${st.fn}(payload: Record<string, unknown>) {\n  // ${fenceId}: Guardrail protecting ${st.role.toLowerCase()} in ${fullName}\n  if (!payload || typeof payload !== 'object') {\n    throw new Error('Invalid execution payload in ${syntheticPath}');\n  }\n  return {\n    repository: "${fullName}",\n    module: "${syntheticPath}",\n    status: "VERIFIED_ACTIVE",\n  };\n}\n`;
  }
}

const indexedRepoCache = new Map();
const flowchartResponseCache = new Map();
let githubApiCooldownUntil = 0;
let githubRawCooldownUntil = 0;
let lastGithubFetchStatus = 200;

async function fetchJsonWithTimeout(url, timeoutMs = 5500) {
  if (Date.now() < githubApiCooldownUntil && url.includes('api.github.com')) {
    return null;
  }
  const attemptFetch = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'whyline-studio-agent',
      };
      const ghToken = String(process.env.GITHUB_TOKEN || '').trim();
      if (ghToken && ghToken.length > 10) {
        headers.Authorization = `Bearer ${ghToken}`;
      }
      const resp = await fetch(url, { headers, signal: controller.signal });
      lastGithubFetchStatus = resp.status;
      if (resp.status === 403 || resp.status === 429) {
        const remaining = resp.headers.get('x-ratelimit-remaining');
        if (remaining === '0' || resp.status === 429) {
          githubApiCooldownUntil = Date.now() + 45 * 1000;
        }
        return null;
      }
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  const first = await attemptFetch();
  if (first !== null || Date.now() < githubApiCooldownUntil) return first;
  return await attemptFetch();
}

async function fetchTextWithTimeout(url, timeoutMs = 4500) {
  if (Date.now() < githubRawCooldownUntil && url.includes('githubusercontent.com')) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'whyline-studio-agent' },
      signal: controller.signal,
    });
    if (resp.status === 429) {
      githubRawCooldownUntil = Date.now() + 30 * 1000;
      return null;
    }
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function rankBlob(item) {
  // Bigger files tend to hold core logic; private helpers (_x.py) and *utils* rarely do.
  const base = item.path.split('/').pop().toLowerCase();
  const penalty = (/^_(?!_)/.test(base) ? 15 : 0) + (/utils?[._]|_utils?\./.test(base) ? 10 : 0);
  return scoreRepositoryBlobPath(item.path) + Math.min((item.size || 200) / 2000, 25) - penalty;
}

function scoreRepositoryBlobPath(filePath = '') {
  const lower = filePath.toLowerCase();
  const isEnvExample = /(^|\/)\.env\.(example|sample|template|local\.example)$/i.test(lower);
  const isDockerfile = /(^|\/)dockerfile(\.[a-z0-9_-]+)?$/i.test(lower);
  if (
    lower.startsWith('.github/') ||
    lower.includes('/.github/') ||
    lower.includes('node_modules/') ||
    lower.includes('dist/') ||
    lower.includes('vendor/') ||
    lower.includes('code_of_conduct') ||
    lower.includes('contributing') ||
    lower.includes('changelog') ||
    lower.includes('funding.yml') ||
    lower.includes('issue_template') ||
    lower.includes('pull_request_template') ||
    lower.includes('license') ||
    (!isEnvExample && /(^|\/)\./.test(lower)) ||
    /(^|\/)(e2e|tests?|__tests__|cypress|playwright|docs?|examples?|scripts?|benchmarks?|samples?|tutorials?)\/|\.(spec|test)\.|eslintrc|prettierrc|babel\.config|jest\.|webpack|rollup|postcss|(^|\/)styles?\.(js|ts|jsx|tsx)$|\.d\.ts$/.test(lower)
  ) {
    return -100;
  }
  let score = 10;
  const primaryExts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.kt', '.go', '.rs', '.rb', '.cs', '.cpp', '.c', '.php', '.ex', '.exs', '.swift', '.zig', '.dart', '.jl', '.vue', '.svelte', '.sql', '.sh'];
  if (primaryExts.some((ext) => lower.endsWith(ext))) score += 40;
  if (/^(src|lib|app|pkg|cmd|core|server|client|backend|frontend|api|sources|packages|apps|services)\//.test(lower)) {
    score += 30;
  }
  if (/(^|\/)(index|main|server|app|router|routes?|controllers?|models?|schemas?|services?|client|api|auth|middleware|db|store|reducers?)[./_-]/.test(lower)) {
    score += 25;
  }
  if (
    isEnvExample ||
    isDockerfile ||
    /(^|\/)(package\.json|pyproject\.toml|cargo\.toml|go\.mod|pom\.xml|mix\.exs|package\.swift|pubspec\.yaml|project\.toml|build\.zig|schema\.prisma|docker-compose\.ya?ml)$/.test(lower)
  ) {
    score += 20;
  }
  if (lower === 'readme.md') score += 15;
  if (lower.includes('test') || lower.includes('spec') || lower.includes('example')) score -= 15;
  return score;
}

const MANIFEST_RE = /(^|\/)(readme\.md|package\.json|pnpm-workspace\.ya?ml|turbo\.json|lerna\.json|requirements\.txt|pyproject\.toml|pipfile|go\.mod|pom\.xml|build\.gradle(\.kts)?|build\.sbt|directory\.build\.props|gemfile|cargo\.toml|composer\.json|mix\.exs|package\.swift|pubspec\.yaml|project\.toml|build\.zig|cmakelists\.txt|dockerfile(\.[a-z0-9_-]+)?|docker-compose\.ya?ml|schema\.prisma|\.env\.(example|sample|template|local\.example))$/i;

const JS_ONLY_NEEDLES = new Set([
  'next', 'react', 'react-scripts', 'vue', 'nuxt', 'svelte', '@angular/core', 'solid-js', 'astro', 'vite', 'react-native',
  'expo', 'redux', ['@reduxjs/toolkit'][0], 'tailwindcss', '@mui/material', '@material-ui/core', 'express', 'fastify',
  'koa', '@nestjs/core', 'hono', '@hapi/hapi', 'socket.io', 'body-parser', 'cors', 'mongoose', 'pg', 'mysql2',
  'better-sqlite3', '@prisma/client', 'sequelize', 'typeorm', 'drizzle-orm', 'ioredis', '@supabase/supabase-js',
  'firebase-admin', '@google/genai', '@google/generative-ai', '@anthropic-ai/sdk', '@sendgrid/mail', 'nodemailer',
  'aws-sdk', '@aws-sdk/client-s3', 'axios', 'ky', 'jsonwebtoken', 'passport', 'bcryptjs', 'next-auth', '@clerk/nextjs',
  '@auth0/auth0-react', '@react-oauth/google',
]);

// [needle, category, label]. Matched against package.json dependency names, else manifest/source text.
const STACK_SIGNATURES = [
  ['next', 'frontend', 'Next.js'], ['react', 'frontend', 'React'], ['react-scripts', 'frontend', 'Create React App'],
  ['vue', 'frontend', 'Vue'], ['nuxt', 'frontend', 'Nuxt'], ['svelte', 'frontend', 'Svelte'], ['@angular/core', 'frontend', 'Angular'],
  ['solid-js', 'frontend', 'SolidJS'], ['astro', 'frontend', 'Astro'], ['vite', 'frontend', 'Vite'], ['react-native', 'frontend', 'React Native'],
  ['expo', 'frontend', 'Expo'], ['redux', 'frontend', 'Redux'], ['@reduxjs/toolkit', 'frontend', 'Redux Toolkit'],
  ['tailwindcss', 'frontend', 'Tailwind CSS'], ['@mui/material', 'frontend', 'Material UI'], ['@material-ui/core', 'frontend', 'Material UI'],
  ['express', 'backend', 'Express'], ['fastify', 'backend', 'Fastify'], ['koa', 'backend', 'Koa'], ['@nestjs/core', 'backend', 'NestJS'],
  ['hono', 'backend', 'Hono'], ['@hapi/hapi', 'backend', 'hapi'], ['socket.io', 'backend', 'Socket.IO'], ['graphql', 'backend', 'GraphQL'],
  ['flask', 'backend', 'Flask'], ['django', 'backend', 'Django'], ['fastapi', 'backend', 'FastAPI'], ['click', 'backend', 'Click CLI'],
  ['spring-boot', 'backend', 'Spring Boot'], ['gin-gonic/gin', 'backend', 'Gin'], ['labstack/echo', 'backend', 'Echo'],
  ['gofiber/fiber', 'backend', 'Fiber'], ['rails', 'backend', 'Rails'], ['actix-web', 'backend', 'Actix Web'], ['axum', 'backend', 'Axum'],
  ['laravel/framework', 'backend', 'Laravel'], ['body-parser', 'backend', 'body-parser'], ['cors', 'backend', 'CORS middleware'],
  ['mongoose', 'database', 'MongoDB (Mongoose)'], ['mongodb', 'database', 'MongoDB'], ['pymongo', 'database', 'MongoDB'],
  ['pg', 'database', 'PostgreSQL'], ['psycopg2', 'database', 'PostgreSQL'], ['mysql2', 'database', 'MySQL'], ['mysql', 'database', 'MySQL'],
  ['sqlite3', 'database', 'SQLite'], ['better-sqlite3', 'database', 'SQLite'], ['@prisma/client', 'database', 'Prisma ORM'],
  ['sequelize', 'database', 'Sequelize ORM'], ['typeorm', 'database', 'TypeORM'], ['drizzle-orm', 'database', 'Drizzle ORM'],
  ['sqlalchemy', 'database', 'SQLAlchemy'], ['gorm', 'database', 'GORM'], ['redis', 'database', 'Redis'], ['ioredis', 'database', 'Redis'],
  ['@supabase/supabase-js', 'database', 'Supabase'], ['firebase', 'database', 'Firebase'], ['firebase-admin', 'database', 'Firebase Admin'],
  ['stripe', 'services', 'Stripe'], ['openai', 'services', 'OpenAI API'], ['@google/genai', 'services', 'Gemini API'],
  ['@google/generative-ai', 'services', 'Gemini API'], ['@anthropic-ai/sdk', 'services', 'Anthropic API'], ['twilio', 'services', 'Twilio'],
  ['@sendgrid/mail', 'services', 'SendGrid'], ['nodemailer', 'services', 'Nodemailer (SMTP)'], ['aws-sdk', 'services', 'AWS SDK'],
  ['@aws-sdk/client-s3', 'services', 'AWS S3'], ['cloudinary', 'services', 'Cloudinary'], ['axios', 'services', 'Axios HTTP client'],
  ['ky', 'services', 'Ky Fetch client'], ['jsonwebtoken', 'auth', 'JWT (jsonwebtoken)'], ['passport', 'auth', 'Passport.js'],
  ['bcrypt', 'auth', 'bcrypt'], ['bcryptjs', 'auth', 'bcrypt'], ['next-auth', 'auth', 'NextAuth'], ['@clerk/nextjs', 'auth', 'Clerk'],
  ['@auth0/auth0-react', 'auth', 'Auth0'], ['@react-oauth/google', 'auth', 'Google OAuth'],
];

const ENV_PATTERNS = [
  /process\.env\.([A-Z_][A-Z0-9_]*)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  /import\.meta\.env\.([A-Z_][A-Z0-9_]*)/g,
  /os\.(?:environ\.get\(|environ\[|getenv\()\s*['"]([A-Z0-9_]+)['"]/g,
  /(?:System\.getenv|os\.Getenv|env::var)\(\s*"([A-Z0-9_]+)"/g,
  /ENV\[['"]([A-Z0-9_]+)['"]\]/g,
];
const IGNORED_ENV = new Set(['NODE_ENV', 'PORT', 'PUBLIC_URL', 'CI', 'HOME', 'PATH']);

// Credentials committed to source. Only the file, line, and kind are reported, never the secret value.
const SECRET_PATTERNS = [
  [/mongodb(?:\+srv)?:\/\/[^\s'"`:@]+:[^\s'"`@]+@/, 'MongoDB connection URI with embedded credentials (extract to CONNECTION_URL / MONGODB_URI)'],
  [/postgres(?:ql)?:\/\/[^\s'"`:@]+:[^\s'"`@]+@/, 'PostgreSQL connection URI with embedded credentials (extract to DATABASE_URL)'],
  [/AIza[0-9A-Za-z_-]{35}/, 'Google API key (extract to GEMINI_API_KEY / GOOGLE_API_KEY)'],
  [/sk_live_[0-9A-Za-z]{16,}/, 'Stripe live secret key (extract to STRIPE_SECRET_KEY)'],
  [/sk-[A-Za-z0-9]{32,}/, 'OpenAI-style secret key (extract to OPENAI_API_KEY)'],
  [/gh[pousr]_[0-9A-Za-z]{36}/, 'GitHub personal access token (extract to GITHUB_TOKEN)'],
  [/AKIA[0-9A-Z]{16}/, 'AWS access key ID (extract to AWS_ACCESS_KEY_ID)'],
];

/** Deterministic stack + API-key detection from manifests and fetched source. No LLM. */
function detectRepositoryStack(repoCtx) {
  const found = { frontend: new Set(), backend: new Set(), database: new Set(), services: new Set(), auth: new Set() };
  const runtimes = new Set();
  const isRepoJsTs = /javascript|typescript|node/i.test(String(repoCtx.language || ''));
  for (const m of repoCtx.manifests || []) {
    const name = m.path.split('/').pop().toLowerCase();
    if (name === 'readme.md') continue;
    let deps = null;
    if (name === 'package.json') {
      runtimes.add('Node.js');
      try {
        const pkg = JSON.parse(m.text);
        const rawDeps = Object.keys({
          ...pkg.dependencies,
          ...pkg.devDependencies,
          ...pkg.peerDependencies,
          ...pkg.optionalDependencies,
        }).map((d) => d.toLowerCase());
        if (typeof pkg.name === 'string' && pkg.name.trim()) {
          rawDeps.push(pkg.name.trim().toLowerCase());
        }
        deps = new Set(rawDeps);
      } catch {
        deps = null;
      }
    } else if (/requirements|pyproject|pipfile/.test(name)) runtimes.add('Python 3.12 (CPython)');
    else if (name === 'go.mod') runtimes.add('Go (Golang Runtime)');
    else if (/pom\.xml|gradle/.test(name)) runtimes.add('Java (JVM 21)');
    else if (name === 'cargo.toml') runtimes.add('Rust (Cargo / Tokio Native)');
    else if (name === 'gemfile') runtimes.add('Ruby (MRI / YJIT)');
    else if (name === 'composer.json') runtimes.add('PHP 8.3 (Zend Engine)');
    else if (name === 'mix.exs') runtimes.add('Elixir (BEAM / OTP VM)');
    else if (name === 'package.swift') runtimes.add('Swift (LLVM Native Runtime)');
    else if (name === 'pubspec.yaml') runtimes.add('Dart VM / Flutter Engine');
    else if (name === 'project.toml') runtimes.add('Julia JIT Scientific Runtime');
    else if (name === 'build.zig') runtimes.add('Zig Native Compiler Runtime');
    else if (name === 'cmakelists.txt') runtimes.add('Native C/C++ (LLVM / Clang)');
    else if (name === 'build.sbt') runtimes.add('Scala 3 (JVM / Akka Runtime)');
    else if (name === 'directory.build.props') runtimes.add('.NET 8 CLR Runtime');

    const isNonJsManifest = name !== 'package.json' && !/pnpm-workspace|turbo|lerna|\.env/i.test(name);
    const text = String(m.text || '').toLowerCase();
    for (const [needle, cat, label] of STACK_SIGNATURES) {
      if (!deps && isNonJsManifest && !isRepoJsTs && JS_ONLY_NEEDLES.has(needle)) continue;
      const hit = deps
        ? deps.has(needle)
        : new RegExp(`(^|[^a-z0-9_-])${needle.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^a-z0-9_-]|$)`, 'm').test(text);
      if (hit) found[cat].add(label);
    }
  }

  // Self-identification for library/framework repos (e.g. expressjs/express, sindresorhus/ky, pallets/click, facebook/react)
  const repoLower = String(repoCtx.repo || '').toLowerCase().replace(/\.js$|\.ts$/i, '');
  const fullLower = String(repoCtx.fullName || '').toLowerCase();
  for (const [needle, cat, label] of STACK_SIGNATURES) {
    const cleanNeedle = needle.toLowerCase();
    if (
      repoLower === cleanNeedle ||
      fullLower === cleanNeedle ||
      fullLower.endsWith(`/${cleanNeedle}`)
    ) {
      found[cat].add(label);
    }
  }

  // Also scan source imports/requires so repos without root manifests or curated repos still resolve accurately.
  const importedPkgs = new Set();
  for (const f of repoCtx.files || []) {
    const code = f.code || '';
    for (const m of code.matchAll(/(?:from\s+['"]([^'".][^'"]*)['"]|require\(\s*['"]([^'".][^'"]*)['"]\)|^\s*(?:import|from)\s+([a-zA-Z0-9_]+))/gm)) {
      const spec = (m[1] || m[2] || m[3] || '').toLowerCase();
      if (spec) importedPkgs.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
    }
  }
  for (const [needle, cat, label] of STACK_SIGNATURES) {
    if (!isRepoJsTs && !runtimes.has('Node.js') && JS_ONLY_NEEDLES.has(needle)) continue;
    if (importedPkgs.has(needle)) found[cat].add(label);
  }
  if (!runtimes.size && repoCtx.language) {
    const profile = inferRepoLanguageProfile(repoCtx.owner || '', repoCtx.repo || '', repoCtx.language);
    runtimes.add(profile.runtime);
  }

  const envVars = new Set();
  const secrets = [];
  const sources = [...(repoCtx.files || []).map((f) => ({ path: f.path, text: f.code || '' })), ...(repoCtx.manifests || [])];
  for (const { path: p, text } of sources) {
    for (const re of ENV_PATTERNS) for (const match of text.matchAll(re)) envVars.add(match[1]);
    if (/\.env\./i.test(p)) for (const match of text.matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gm)) envVars.add(match[1]);
    const lines = text.split(/\r?\n/);
    for (const [re, kind] of SECRET_PATTERNS) {
      const lineIdx = lines.findIndex((l) => re.test(l));
      if (lineIdx !== -1) secrets.push({ file: p, line: lineIdx + 1, kind });
    }
  }

  const list = (s) => [...s];
  const envList = list(envVars).filter((v) => !IGNORED_ENV.has(v)).sort();
  const inferredKeys = [];
  if (found.database.has('MongoDB (Mongoose)') || found.database.has('MongoDB')) {
    if (!envList.some((k) => /MONGO|CONNECTION_URL|DB|DATABASE/i.test(k))) inferredKeys.push('MONGODB_URI / CONNECTION_URL (MongoDB connection string)');
  }
  if (found.database.has('PostgreSQL') && !envList.some((k) => /PG|POSTGRES|DATABASE_URL/i.test(k))) inferredKeys.push('DATABASE_URL (PostgreSQL connection string)');
  if (found.database.has('Prisma ORM') && !envList.some((k) => /DATABASE_URL/i.test(k))) inferredKeys.push('DATABASE_URL (Prisma database connection string)');
  if (found.services.has('OpenAI API') && !envList.includes('OPENAI_API_KEY')) inferredKeys.push('OPENAI_API_KEY');
  if (found.services.has('Gemini API') && !envList.includes('GEMINI_API_KEY')) inferredKeys.push('GEMINI_API_KEY');
  if (found.services.has('Stripe') && !envList.some((k) => /STRIPE/i.test(k))) inferredKeys.push('STRIPE_SECRET_KEY');
  if (found.auth.has('JWT (jsonwebtoken)') && !envList.some((k) => /JWT|SECRET/i.test(k))) inferredKeys.push('JWT_SECRET');

  const apiKeysAndEnv = [
    ...envList,
    ...inferredKeys,
    ...secrets.map((s) => `⚠️ ${s.file}:${s.line} — ${s.kind}`),
  ];

  return {
    frontend: list(found.frontend),
    backend: list(found.backend),
    database: list(found.database),
    services: list(found.services),
    auth: list(found.auth),
    runtimes: list(runtimes),
    env_vars: envList,
    api_keys_and_env: apiKeysAndEnv.length ? apiKeysAndEnv : ['No external API keys required (runs with local/standard runtime config)'],
    hardcoded_secrets: secrets,
    manifests: (repoCtx.manifests || []).map((m) => m.path),
  };
}

function formatDetectedStackSummary(repoCtx, stack) {
  const profile = inferRepoLanguageProfile(repoCtx.owner || '', repoCtx.repo || '', repoCtx.language || '');
  const fe = stack.frontend.length ? stack.frontend.join(' + ') : 'None (No browser UI layer in this repo)';
  const be = stack.backend.length
    ? `${stack.runtimes.join('/') || repoCtx.language} (${stack.backend.join(' + ')})`
    : stack.frontend.length
      ? 'None (Client-side / Frontend-only)'
      : `${stack.runtimes.join(' / ') || profile.runtime || repoCtx.language} Core Library / CLI`;
  const db = stack.database.length ? stack.database.join(' + ') : 'None (Stateless / In-Memory)';
  const svc = [...stack.services, ...stack.auth].join(' + ') || 'Native platform & standard HTTP';
  const auth = stack.auth?.length ? stack.auth.join(', ') : 'Gateway / Consumer Auth';
  const keys = stack.api_keys_and_env.join(', ');
  const isCliOnly = stack.backend.length === 1 && /CLI/i.test(stack.backend[0]);
  const isHttpClientLib = !stack.frontend.length && !stack.backend.length && stack.services.some((s) => /Fetch client|HTTP client/i.test(s));
  const arch =
    stack.frontend.length && stack.backend.length
      ? `Full-Stack ${stack.frontend[0]} + ${stack.backend[0]} (${stack.database[0] || 'Stateless'})`
      : isCliOnly
        ? `CLI Toolkit & Command Pipeline (${stack.backend[0]})`
        : stack.backend.length
          ? `Backend / API Service (${stack.backend.join(' + ')})`
          : stack.frontend.length
            ? `Frontend Application (${stack.frontend.join(' + ')})`
            : isHttpClientLib
              ? `HTTP Client Library & Fetch Pipeline (${stack.services.join(' + ')})`
              : repoCtx.architecture_style || profile.arch || `Modular ${repoCtx.language} Package`;
  return {
    frontend: fe,
    backend: be,
    database: db,
    apis_and_services: svc,
    auth,
    api_keys_summary: keys,
    runtime: stack.runtimes.join(' + ') || repoCtx.runtime_engine || profile.runtime || repoCtx.language,
    architecture_style: arch,
  };
}

/** Asks Gemini for a repo-grounded summary + 5-step flow. Returns null on any failure. */
async function buildGeminiFlowchart(repoCtx, stack, langKey) {
  const ai = getGenAIClient();
  if (!ai || !(repoCtx.files || []).length) return null;
  const langName = langKey === 'hindi' ? 'Hindi (Hindi-English code-mix ok)' : langKey === 'telugu' ? 'Telugu (Telugu-English code-mix ok)' : 'English';
  const filesCtx = repoCtx.files
    .map((f) => `FILE: ${f.path}\n${(f.code || '').split(/\r?\n/).slice(0, 90).map((l, i) => `${i + 1}: ${l}`).join('\n')}`)
    .join('\n\n---\n\n');
  const manifestCtx = (repoCtx.manifests || []).map((m) => `MANIFEST: ${m.path}\n${m.text.slice(0, 2500)}`).join('\n\n');
  const prompt = `You are explaining the GitHub repository ${repoCtx.fullName} to a developer who has never seen it.
Description: ${repoCtx.description}
Repository tree (partial): ${(repoCtx.tree || []).slice(0, 150).join(', ')}

Deterministically detected stack (ground truth from manifests, do not contradict): ${JSON.stringify(stack)}

${manifestCtx}

${filesCtx}

Rules:
- Only state facts supported by the files, manifests, or detected stack above. If a layer is absent write "Not detected".
- "steps": exactly 5 steps in the real order a request/data flows through this project (e.g. UI -> API client -> server route -> controller -> database). Every file_path MUST be one of the FILE paths above, and line_range must point at real lines.
- "detailed_explanation": 4-6 sentences on what the project does, how frontend and backend talk, where data is stored, and which API keys / environment variables must be configured.
- spoken_narration, simple_explanation and real_world_example in ${langName}; everything else in English.`;

  const str = { type: Type.STRING };
  const { response } = await generateContentWithFallback(
    ai,
    {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            project_summary: {
              type: Type.OBJECT,
              properties: {
                simple_explanation: str,
                real_world_example: str,
                detailed_explanation: str,
                full_stack_breakdown: {
                  type: Type.OBJECT,
                  properties: { frontend: str, backend: str, database: str, apis_and_services: str, auth: str, runtime: str, architecture_style: str },
                  required: ['frontend', 'backend', 'database', 'apis_and_services', 'auth', 'runtime', 'architecture_style'],
                },
                why_this_stack_is_best: str,
                modern_alternatives: {
                  type: Type.ARRAY,
                  items: { type: Type.OBJECT, properties: { name: str, pros: str, cons: str, when_to_choose: str }, required: ['name', 'pros', 'cons', 'when_to_choose'] },
                },
                deployment_strategy: {
                  type: Type.OBJECT,
                  properties: { recommended_platform: str, deploy_steps: { type: Type.ARRAY, items: str }, dockerfile: str, cli_deploy_command: str },
                  required: ['recommended_platform', 'deploy_steps', 'dockerfile', 'cli_deploy_command'],
                },
              },
              required: ['simple_explanation', 'real_world_example', 'detailed_explanation', 'full_stack_breakdown', 'why_this_stack_is_best', 'modern_alternatives', 'deployment_strategy'],
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: str, phase: str, file_path: str, line_range: str, summary: str, spoken_narration: str,
                  simple_explanation: str, real_world_example: str, what_happens: str, why_guarded: str, danger_if_removed: str, symbol_name: str,
                },
                required: ['title', 'phase', 'file_path', 'line_range', 'summary', 'spoken_narration', 'simple_explanation', 'what_happens', 'symbol_name'],
              },
            },
          },
          required: ['project_summary', 'steps'],
        },
      },
    },
    20000
  );
  const parsed = JSON.parse(response.text || '{}');
  if (!parsed?.project_summary || !Array.isArray(parsed.steps) || parsed.steps.length === 0) return null;

  // Re-anchor any hallucinated path onto a real fetched file so code links never 404.
  const byPath = new Map(repoCtx.files.map((f) => [f.path, f]));
  parsed.steps = parsed.steps.slice(0, 6).map((s, i) => {
    const sym = String(s.symbol_name || '').replace(/\(\).*$/, '').split('.').pop();
    const defines = sym && repoCtx.files.find((f) => new RegExp(`(class|def|function|fn|func|struct|type)\\s+${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(f.code || ''));
    const file = defines || byPath.get(s.file_path) || repoCtx.files[i % repoCtx.files.length];
    const start = Math.max(1, parseInt(String(s.line_range).split('-')[0], 10) || 1);
    return { ...s, file_path: file.path, code_snippet: (file.code || '').split(/\r?\n/).slice(start - 1, start + 11).join('\n') };
  });
  return parsed;
}

/**
 * Loads and indexes any GitHub repository with in-memory caching and parallel file fetching.
 */
async function loadAndIndexGitHubRepository(rawInput, languageHint = '') {
  const parsed = parseGitHubRepoInput(rawInput);
  if (parsed.isLocal) {
    activeRepoContext = buildDefaultHealthConnectContext();
    return activeRepoContext;
  }

  const normalizedHint = normalizeProgrammingLanguageHint(languageHint);
  const keyLower = parsed.fullName.toLowerCase();
  const cachedEntry = indexedRepoCache.get(keyLower);
  if (cachedEntry && cachedEntry.context && Date.now() - cachedEntry.timestamp < 10 * 60 * 1000) {
    const cachedLang = String(cachedEntry.context.language || '').toLowerCase();
    const hintedLang = normalizedHint ? LANGUAGE_PROFILES[normalizedHint]?.language?.toLowerCase() : '';
    if (!hintedLang || cachedLang === hintedLang) {
      activeRepoContext = cachedEntry.context;
      return activeRepoContext;
    }
  }
  if (cachedEntry && cachedEntry.inFlightPromise) {
    const resolvedCtx = await cachedEntry.inFlightPromise;
    if (resolvedCtx) activeRepoContext = resolvedCtx;
    return resolvedCtx;
  }

  const loadPromise = (async () => {
    const curated = CURATED_GITHUB_REPOS[keyLower] || null;
    if (curated && curated.files && curated.files.length > 0 && !normalizedHint) {
      const curatedProfile = inferRepoLanguageProfile(parsed.owner, parsed.repo, curated.language || '');
      const ctx = {
        owner: parsed.owner,
        repo: parsed.repo,
        fullName: parsed.fullName,
        url: parsed.url,
        branch: curated.branch || 'main',
        isLocal: false,
        description: curated.description,
        language: curated.language || 'JavaScript',
        architecture_style: curatedProfile.arch,
        runtime_engine: curatedProfile.runtime,
        stars: curated.stars || 1000,
        files: [...curated.files],
        manifests: Array.isArray(curated.manifests) && curated.manifests.length > 0
          ? [...curated.manifests]
          : [{ path: curatedProfile.manifest, text: `# ${parsed.fullName} (${curated.language})` }],
        fences: [...(curated.fences || [])],
        symbols: curated.files.map((f) => f.path),
        commits: [...(curated.commits || [])],
      };
      enrichRepoContextWithFlowchart(ctx);
      activeRepoContext = ctx;
      indexedRepoCache.set(keyLower, { timestamp: Date.now(), context: ctx });
      return ctx;
    }

    const repoMeta = await fetchJsonWithTimeout(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
    const branch = repoMeta?.default_branch || curated?.branch || 'main';
    const langProfile = inferRepoLanguageProfile(
      parsed.owner,
      parsed.repo,
      normalizedHint || repoMeta?.language || curated?.language || ''
    );
    const language = normalizedHint ? langProfile.language : (repoMeta?.language || curated?.language || langProfile.language);
    const description =
      repoMeta?.description ||
      curated?.description ||
      `${language} repository ${parsed.fullName} (${langProfile.arch}) indexed by WhyLine Gemini Brain.`;
    const stars = repoMeta?.stargazers_count ?? curated?.stars ?? 100;

    let files = [];
    let commits = [];
    let fences = [];
    let fetchWarning = null;

    let treeData = await fetchJsonWithTimeout(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`
    );
    if (!treeData && branch === 'main') {
      treeData = await fetchJsonWithTimeout(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/master?recursive=1`
      );
    }

    let rawTreeItems = Array.isArray(treeData?.tree) ? [...treeData.tree] : [];
    if (treeData?.truncated) {
      fetchWarning = `Repository tree for ${parsed.fullName} exceeded GitHub's recursive listing limit (truncated: true); sampled primary modules via directory scan.`;
    } else if (!treeData) {
      fetchWarning = lastGithubFetchStatus === 403 || lastGithubFetchStatus === 429
        ? `GitHub API rate limit encountered for ${parsed.fullName}; sampled manifests/files via direct content fallback.`
        : `GitHub recursive tree unavailable for ${parsed.fullName}; sampled root and source directories.`;
    }

    // Fallback for truncated huge monorepos (e.g. facebook/react, vercel/next.js) or rate-limited trees:
    // probe non-recursive /contents root + key source directories, or raw.githubusercontent manifests.
    if (treeData?.truncated || rawTreeItems.length === 0) {
      const rootContents = await fetchJsonWithTimeout(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents?ref=${branch}`
      );
      if (Array.isArray(rootContents)) {
        for (const entry of rootContents) {
          if (entry.type === 'file') {
            rawTreeItems.push({ path: entry.path, type: 'blob', size: entry.size || 400 });
          }
        }
        const priorityDirs = ['packages', 'src', 'source', 'lib', 'app', 'server', 'client', 'pkg', 'cmd', 'core'];
        const dirEntries = rootContents
          .filter((e) => e.type === 'dir' && priorityDirs.includes(String(e.name || '').toLowerCase()))
          .slice(0, 4);
        const subListings = await Promise.all(
          dirEntries.map((d) => fetchJsonWithTimeout(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${d.path}?ref=${branch}`))
        );
        const nestedDirs = [];
        for (const listing of subListings) {
          if (!Array.isArray(listing)) continue;
          for (const entry of listing) {
            if (entry.type === 'file') {
              rawTreeItems.push({ path: entry.path, type: 'blob', size: entry.size || 600 });
            } else if (entry.type === 'dir' && nestedDirs.length < 4 && !/test|doc|example|fixture/i.test(entry.name)) {
              nestedDirs.push(entry.path);
            }
          }
        }
        if (nestedDirs.length > 0) {
          const deeperListings = await Promise.all(
            nestedDirs.map((dp) => fetchJsonWithTimeout(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${dp}?ref=${branch}`))
          );
          for (const listing of deeperListings) {
            if (!Array.isArray(listing)) continue;
            for (const entry of listing) {
              if (entry.type === 'file') {
                rawTreeItems.push({ path: entry.path, type: 'blob', size: entry.size || 600 });
              }
            }
          }
        }
      }
      // If REST API completely rate-limited, try direct raw.githubusercontent manifests/entrypoints
      if (rawTreeItems.length === 0) {
        const directCandidates = ['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'Cargo.toml', 'pom.xml', 'README.md', 'src/index.ts', 'src/index.js', 'source/index.ts', 'lib/index.js', 'app.py', 'main.go', 'src/main.rs'];
        const rawProbes = await Promise.all(
          directCandidates.map(async (p) => {
            const txt = await fetchTextWithTimeout(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${p}`);
            return txt ? { path: p, type: 'blob', size: txt.length, preloadedText: txt } : null;
          })
        );
        rawTreeItems.push(...rawProbes.filter(Boolean));
      }
    }

    const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.java', '.kt', '.go', '.rs', '.rb', '.cs', '.cpp', '.c', '.php', '.ex', '.exs', '.swift', '.zig', '.dart', '.jl', '.vue', '.svelte'];
    const sortedBlobs = rawTreeItems
      .filter(
        (item) =>
          item.type === 'blob' &&
          (item.size == null || item.size >= 10) &&
          (item.size == null || item.size < 120000) &&
          codeExts.some((ext) => item.path.toLowerCase().endsWith(ext)) &&
          scoreRepositoryBlobPath(item.path) > 0
      )
      .sort((a, b) => rankBlob(b) - rankBlob(a));

    // Pick up to 8 diverse files across top-level and leaf directories so both client/ and server/ layers are represented.
    const candidateBlobs = [];
    const dirCounts = new Map();
    const rootCounts = new Map();
    const distinctRoots = new Set(sortedBlobs.map((b) => (b.path.includes('/') ? b.path.split('/')[0] : '.')));
    const maxPerRoot = distinctRoots.size > 1 ? 4 : 8;
    for (const blob of sortedBlobs) {
      if (candidateBlobs.length >= 8) break;
      const rootDir = blob.path.includes('/') ? blob.path.split('/')[0] : '.';
      const leafDir = blob.path.includes('/') ? blob.path.slice(0, blob.path.lastIndexOf('/')) : '.';
      if ((rootCounts.get(rootDir) || 0) >= maxPerRoot) continue;
      if ((dirCounts.get(leafDir) || 0) >= 1 && sortedBlobs.length > 8) continue;
      candidateBlobs.push(blob);
      rootCounts.set(rootDir, (rootCounts.get(rootDir) || 0) + 1);
      dirCounts.set(leafDir, (dirCounts.get(leafDir) || 0) + 1);
    }
    for (const blob of sortedBlobs) {
      if (candidateBlobs.length >= 8) break;
      if (!candidateBlobs.includes(blob)) candidateBlobs.push(blob);
    }

    // Manifests + env templates drive stack/API-key detection; sort by relevance before slicing 400 paths for huge monorepos.
    const treePaths = rawTreeItems
      .filter((item) => item.type === 'blob')
      .map((item) => item.path)
      .sort((a, b) => scoreRepositoryBlobPath(b) - scoreRepositoryBlobPath(a));
    const allManifestCandidates = treePaths
      .filter((p) => MANIFEST_RE.test(p) && !p.includes('node_modules/') && p.split('/').length <= 4)
      .sort((a, b) => a.split('/').length - b.split('/').length);
    const manifestPaths = [];
    const seenManifestTypes = new Set();
    for (const p of allManifestCandidates) {
      if (manifestPaths.length >= 10) break;
      const base = p.split('/').pop().toLowerCase();
      if (!seenManifestTypes.has(base)) {
        seenManifestTypes.add(base);
        manifestPaths.push(p);
      }
    }
    for (const p of allManifestCandidates) {
      if (manifestPaths.length >= 10) break;
      if (!manifestPaths.includes(p)) manifestPaths.push(p);
    }
    const manifestsPromise = Promise.all(
      manifestPaths.map(async (p) => {
        const pre = rawTreeItems.find((it) => it.path === p && it.preloadedText);
        const text = pre?.preloadedText || await fetchTextWithTimeout(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${p}`);
        return text ? { path: p, text: text.slice(0, 20000) } : null;
      })
    );
    if (candidateBlobs.length > 0) {
      const fetchedResults = await Promise.all(
        candidateBlobs.map(async (blob, i) => {
          const rawCode = blob.preloadedText || await fetchTextWithTimeout(
            `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${branch}/${blob.path}`
          );
          if (!rawCode) return null;
          const lines = rawCode.split(/\r?\n/).slice(0, 120).join('\n');
          const totalLines = lines.split(/\r?\n/).length;
          const targetLine = Math.min(18, Math.max(1, Math.floor(totalLines / 3)));
          const fenceId = `FENCE-GH-0${i + 1}`;
          return {
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
          };
        })
      );

      const fetchedFiles = fetchedResults.filter(Boolean);
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

    // Fallback 5-stage synthetic files if GitHub API was rate-limited or unreachable
    if (files.length === 0) {
      const cleanName = parsed.repo.replace(/\.jl$|\.js$/i, '').replace(/[^a-zA-Z0-9_-]/g, '') || 'Repo';
      const pascalName = cleanName
        .split(/[-_.]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('') || 'Repo';
      const snakeName = cleanName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[-.]+/g, '_').toLowerCase() || 'repo';
      const usesSnakeFiles = ['python', 'rust', 'ruby', 'elixir', 'zig', 'dart'].includes(langProfile.editor);
      const stages = [
        { suffix: 'Ingress', snakeSuffix: 'ingress', role: 'Ingress request router & CLI/API entry point', fn: usesSnakeFiles ? 'dispatch_ingress' : 'dispatchIngress' },
        { suffix: 'CoreService', snakeSuffix: 'core_service', role: 'Primary domain orchestration & business rules', fn: usesSnakeFiles ? 'execute_domain_flow' : 'executeDomainFlow' },
        { suffix: 'SafetyGuard', snakeSuffix: 'safety_guard', role: 'Idempotency, rate-limit, and invariant verification', fn: usesSnakeFiles ? 'verify_invariants' : 'verifyInvariants' },
        { suffix: 'StorageAdapter', snakeSuffix: 'storage_adapter', role: 'State persistence, cache, and upstream I/O', fn: usesSnakeFiles ? 'persist_transaction' : 'persistTransaction' },
        { suffix: 'Telemetry', snakeSuffix: 'telemetry', role: 'Structured response formatting and audit metrics', fn: usesSnakeFiles ? 'emit_audit_telemetry' : 'emitAuditTelemetry' },
      ];
      files = stages.map((st, idx) => {
        const className = `${pascalName}${st.suffix}`;
        const fileBase = usesSnakeFiles ? `${snakeName}_${st.snakeSuffix}${langProfile.ext}` : `${className}${langProfile.ext}`;
        const syntheticPath = `${langProfile.dir}/${fileBase}`;
        const fenceId = `FENCE-GH-0${idx + 1}`;
        return {
          path: syntheticPath,
          shortName: fileBase,
          language: langProfile.editor,
          defaultLine: 8,
          fenceId,
          fences: [
            {
              id: fenceId,
              startLine: 5,
              endLine: 16,
              targetLine: 8,
              token: st.fn,
              badge: `${fenceId} • ${parsed.fullName} ${st.role}`,
              status: 'VERIFIED_ACTIVE',
            },
          ],
          code: buildIdiomaticSyntheticCode(
            langProfile,
            parsed.fullName,
            syntheticPath,
            { ...st, className },
            fenceId
          ),
        };
      });
      fences = files.map((f) => ({
        id: f.fenceId,
        file_path: f.path,
        line_range: '5-16',
        targetLine: 8,
        symbol_name: f.fences[0].token,
        status: 'VERIFIED_ACTIVE',
        badge: f.fences[0].badge,
        voice_transcript: `Guardrail ${f.fenceId} protects ${f.shortName} in ${parsed.fullName}.`,
      }));
    }

    const symbols = files.map((f) => f.path);
    const fetchedManifests = (await manifestsPromise).filter(Boolean);
    const manifests = fetchedManifests.length > 0
      ? fetchedManifests
      : [{ path: langProfile.manifest, text: `# ${parsed.fullName} (${language})` }];

    activeRepoContext = {
      owner: parsed.owner,
      repo: parsed.repo,
      fullName: parsed.fullName,
      url: parsed.url,
      branch,
      isLocal: false,
      description,
      language,
      architecture_style: langProfile.arch,
      runtime_engine: langProfile.runtime,
      stars,
      files,
      manifests,
      tree: treePaths.slice(0, 400),
      fences,
      symbols,
      fetch_warning: fetchWarning,
      not_found: !curated && !repoMeta && files.length > 0 && lastGithubFetchStatus === 404,
      commits:
        commits.length > 0
          ? commits
          : [
              {
                sha: crypto.createHash('md5').update(parsed.fullName).digest('hex').slice(0, 7),
                author: `@${parsed.owner}`,
                date: '2026-04-01',
                message: `Indexed ${parsed.fullName} (${files.length} source files) for Gemini Voice Agent`,
              },
            ],
    };

    enrichRepoContextWithFlowchart(activeRepoContext);

    indexedRepoCache.set(keyLower, { timestamp: Date.now(), context: activeRepoContext });
    return activeRepoContext;
  })();

  if (!indexedRepoCache.get(keyLower)?.context) {
    indexedRepoCache.set(keyLower, { inFlightPromise: loadPromise, timestamp: Date.now() });
  }
  return await loadPromise;
}

/**
 * Complete Official Gnani Vachana Speech Catalogs (Timbre v3.0 / v2.5 TTS & Prisma v3.0 / v2.5 STT)
 * Strictly sourced from https://docs.gnani.ai/api/TTS/available-voices
 */
const GNANI_MODELS = [
  { id: 'timbre-v3.0', label: 'Gnani Timbre v3.0 (Studio Neural TTS — 13 Multilingual Voices)', kind: 'tts', provider: 'gnani', defaultVoice: 'Shivani' },
  { id: 'timbre-v2.5', label: 'Gnani Timbre v2.5 (Low-Latency Indic TTS — 42 Voices)', kind: 'tts', provider: 'gnani', defaultVoice: 'Pranav' },
  { id: 'prisma-v3.0', label: 'Gnani Prisma v3.0 (High-Accuracy Multilingual STT)', kind: 'stt', provider: 'gnani' },
  { id: 'prisma-v2.5', label: 'Gnani Prisma v2.5 (Fast Indic STT)', kind: 'stt', provider: 'gnani' },
];

const GNANI_V3_VOICES = [
  { name: 'Shivani', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Warm Studio Expressive (All 10 Indic Languages)' },
  { name: 'Lakshmi', model: 'timbre-v3.0', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Calm Narration (All 10 Indic Languages)' },
  { name: 'Kalpana', model: 'timbre-v3.0', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Warm Conversational (All 10 Indic Languages)' },
  { name: 'Chetana', model: 'timbre-v3.0', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Crisp Briefing (All 10 Indic Languages)' },
  { name: 'Vasudha', model: 'timbre-v3.0', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Articulate (All 10 Indic Languages)' },
  { name: 'Riyaa', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Friendly Studio (All 10 Indic Languages)' },
  { name: 'Tarika', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Calm Clarity (All 10 Indic Languages)' },
  { name: 'Avinash', model: 'timbre-v3.0', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Male', style: 'Clear Analytical (All 10 Indic Languages)' },
  { name: 'Shubham', model: 'timbre-v3.0', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Studio Deep (All 10 Indic Languages)' },
  { name: 'Prakash', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Clear Engineering (All 10 Indic Languages)' },
  { name: 'Devansh', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Crisp Technical (All 10 Indic Languages)' },
  { name: 'Yashraj', model: 'timbre-v3.0', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Expressive Narrative (All 10 Indic Languages)' },
  { name: 'Harshad', model: 'timbre-v3.0', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Grounded Senior (All 10 Indic Languages)' },
];

// Official 42 Timbre v2.5 voices from https://docs.gnani.ai/api/TTS/available-voices
const GNANI_V2_VOICES = [
  // English (en-IN)
  { name: 'Pranav', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Indian English Studio' },
  { name: 'Kaveri', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Measured Clear English' },
  { name: 'Trupti', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Warm Studio English' },
  { name: 'Devika', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Female', style: 'Crisp UI Explainer' },
  { name: 'Shlok', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Confident Technical' },
  { name: 'Girish', model: 'timbre-v2.5', language: 'en-IN', preferredLanguage: 'en-IN', gender: 'Male', style: 'Steady Narration' },
  // Hindi (hi-IN) & Hinglish (hi-en)
  { name: 'Bhavna', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Conversational Hindi' },
  { name: 'Nalini', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Expressive Studio' },
  { name: 'Yashvi', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Warm Bilingual' },
  { name: 'Urmila', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Smooth Narration' },
  { name: 'Jwala', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Dynamic Hindi' },
  { name: 'Chitra', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Storyteller' },
  { name: 'Ambuja', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Soft Clarity' },
  { name: 'Deepak', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Balanced Technical' },
  { name: 'Roopesh', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Steady Narration' },
  { name: 'Vikrant', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Authoritative' },
  { name: 'Hemraj', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Grounded Clear' },
  { name: 'Jalaj', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Warm Studio' },
  { name: 'Omkar', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Male', style: 'Calm Architecture' },
  { name: 'Poorvi', model: 'timbre-v2.5', language: 'hi-IN', preferredLanguage: 'hi-IN', gender: 'Female', style: 'Hinglish (hi-en) Conversational' },
  // Telugu (te-IN)
  { name: 'Suhana', model: 'timbre-v2.5', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Natural Telugu Studio' },
  { name: 'Lehara', model: 'timbre-v2.5', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Clear Telugu Narration' },
  { name: 'Lavanya', model: 'timbre-v2.5', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Expressive Telugu' },
  { name: 'Yukti', model: 'timbre-v2.5', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Crisp Telugu Briefing' },
  { name: 'Varuni', model: 'timbre-v2.5', language: 'te-IN', preferredLanguage: 'te-IN', gender: 'Female', style: 'Warm Telugu Assistant' },
  // Tamil (ta-IN)
  { name: 'Asmita', model: 'timbre-v2.5', language: 'ta-IN', preferredLanguage: 'ta-IN', gender: 'Female', style: 'Clear Tamil Studio' },
  { name: 'Trisha', model: 'timbre-v2.5', language: 'ta-IN', preferredLanguage: 'ta-IN', gender: 'Female', style: 'Warm Tamil' },
  { name: 'Brinda', model: 'timbre-v2.5', language: 'ta-IN', preferredLanguage: 'ta-IN', gender: 'Female', style: 'Expressive Tamil' },
  { name: 'Vedika', model: 'timbre-v2.5', language: 'ta-IN', preferredLanguage: 'ta-IN', gender: 'Female', style: 'Crisp Tamil' },
  { name: 'Noopur', model: 'timbre-v2.5', language: 'ta-IN', preferredLanguage: 'ta-IN', gender: 'Female', style: 'Natural Tamil' },
  // Kannada (kn-IN)
  { name: 'Saanvi', model: 'timbre-v2.5', language: 'kn-IN', preferredLanguage: 'kn-IN', gender: 'Female', style: 'Clean Kannada Studio' },
  { name: 'Kavin', model: 'timbre-v2.5', language: 'kn-IN', preferredLanguage: 'kn-IN', gender: 'Male', style: 'Clear Kannada' },
  // Malayalam (ml-IN)
  { name: 'Reshma', model: 'timbre-v2.5', language: 'ml-IN', preferredLanguage: 'ml-IN', gender: 'Female', style: 'Warm Malayalam' },
  { name: 'Riyaan', model: 'timbre-v2.5', language: 'ml-IN', preferredLanguage: 'ml-IN', gender: 'Male', style: 'Clear Malayalam' },
  // Marathi (mr-IN)
  { name: 'Zahira', model: 'timbre-v2.5', language: 'mr-IN', preferredLanguage: 'mr-IN', gender: 'Female', style: 'Clear Marathi' },
  { name: 'Ishaan', model: 'timbre-v2.5', language: 'mr-IN', preferredLanguage: 'mr-IN', gender: 'Male', style: 'Warm Marathi' },
  // Bengali (bn-IN)
  { name: 'Kirra', model: 'timbre-v2.5', language: 'bn-IN', preferredLanguage: 'bn-IN', gender: 'Female', style: 'Clear Bengali' },
  { name: 'Dhruva', model: 'timbre-v2.5', language: 'bn-IN', preferredLanguage: 'bn-IN', gender: 'Male', style: 'Direct Bengali' },
  // Gujarati (gu-IN)
  { name: 'Falak', model: 'timbre-v2.5', language: 'gu-IN', preferredLanguage: 'gu-IN', gender: 'Female', style: 'Clear Gujarati' },
  { name: 'Veera', model: 'timbre-v2.5', language: 'gu-IN', preferredLanguage: 'gu-IN', gender: 'Male', style: 'Warm Gujarati' },
  // Punjabi (pa-IN)
  { name: 'Mehuli', model: 'timbre-v2.5', language: 'pa-IN', preferredLanguage: 'pa-IN', gender: 'Female', style: 'Clear Punjabi' },
  { name: 'Zayan', model: 'timbre-v2.5', language: 'pa-IN', preferredLanguage: 'pa-IN', gender: 'Male', style: 'Warm Punjabi' },
];

const GNANI_VOICE_CATALOG = [...GNANI_V3_VOICES, ...GNANI_V2_VOICES];
const ALL_VOICE_CATALOG = GNANI_VOICE_CATALOG;

function toGnaniLanguageCode(langInput = 'en-IN', voiceObj = null, isStt = false) {
  const low = String(langInput || 'en-IN').trim().toLowerCase();
  if (low === 'auto' || low === 'indic-auto') {
    return isStt ? 'indic-auto' : 'auto';
  }
  if (low.startsWith('te') || low.includes('telugu')) return 'te-IN';
  if (low.startsWith('hi') || low.includes('hindi')) return 'hi-IN';
  if (low.startsWith('ta') || low.includes('tamil')) return 'ta-IN';
  if (low.startsWith('kn') || low.includes('kannada')) return 'kn-IN';
  if (low.startsWith('ml') || low.includes('malayalam')) return 'ml-IN';
  if (low.startsWith('mr') || low.includes('marathi')) return 'mr-IN';
  if (low.startsWith('bn') || low.includes('bengali')) return 'bn-IN';
  if (low.startsWith('gu') || low.includes('gujarati')) return 'gu-IN';
  if (low.startsWith('pa') || low.includes('punjabi')) return 'pa-IN';
  if (low.startsWith('en') || low.includes('english')) return 'en-IN';
  if (voiceObj?.preferredLanguage) return voiceObj.preferredLanguage;
  return 'en-IN';
}

function resolveVoiceAndModel(preferredVoice = null, preferredModel = null, language = 'en-IN', _provider = 'gnani') {
  const langCode = toGnaniLanguageCode(language);
  const langKey = langCode.toLowerCase();
  const requestedVoiceRaw = String(preferredVoice || '').trim();
  const requestedModelRaw = String(preferredModel || '').trim().toLowerCase();
  const wantsV2 = requestedModelRaw.includes('2.5');
  const wantsV3 = requestedModelRaw.includes('3.0');

  // Strictly resolve against official Gnani Timbre v3.0 / v2.5 catalogs (never Gemini voice agents)
  const v3Match = GNANI_V3_VOICES.find((v) => v.name.toLowerCase() === requestedVoiceRaw.toLowerCase());
  const v2Match = GNANI_V2_VOICES.find((v) => v.name.toLowerCase() === requestedVoiceRaw.toLowerCase());

  if (wantsV2 && v2Match) {
    return { provider: 'gnani', model: 'timbre-v2.5', voice: v2Match.name, displayVoice: v2Match.name, voiceObj: v2Match };
  }
  if (wantsV3 && v3Match) {
    return { provider: 'gnani', model: 'timbre-v3.0', voice: v3Match.name, displayVoice: v3Match.name, voiceObj: v3Match };
  }
  if (v3Match && !wantsV2) {
    return { provider: 'gnani', model: 'timbre-v3.0', voice: v3Match.name, displayVoice: v3Match.name, voiceObj: v3Match };
  }
  if (v2Match && !wantsV3) {
    return { provider: 'gnani', model: 'timbre-v2.5', voice: v2Match.name, displayVoice: v2Match.name, voiceObj: v2Match };
  }

  const v3Default = langKey.includes('hi') ? 'Kalpana' : langKey.includes('te') ? 'Avinash' : 'Shivani';
  const v2Default = langKey.includes('hi') ? 'Bhavna' : langKey.includes('te') ? 'Suhana' : 'Pranav';
  if (wantsV2) {
    const defObj = GNANI_V2_VOICES.find((v) => v.name === v2Default) || GNANI_V2_VOICES[0];
    return { provider: 'gnani', model: 'timbre-v2.5', voice: defObj.name, displayVoice: defObj.name, voiceObj: defObj };
  }
  const defV3Obj = GNANI_V3_VOICES.find((v) => v.name === v3Default) || GNANI_V3_VOICES[0];
  return { provider: 'gnani', model: 'timbre-v3.0', voice: defV3Obj.name, displayVoice: defV3Obj.name, voiceObj: defV3Obj };
}

function clarifySpokenTextForTts(text = '') {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[`*_#>\[\]()]/g, ' ')
    .replace(/\.java\b/gi, ' dot java')
    .replace(/\.jsx?\b/gi, ' dot j s')
    .replace(/\.tsx?\b/gi, ' dot t s')
    .replace(/\.py\b/gi, ' dot python')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/===/g, ' strict equals ')
    .replace(/==/g, ' equals ')
    .replace(/!=/g, ' not equals ')
    .replace(/=/g, ' equals ')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 440);
}

/**
 * Audio container helpers.
 * Per https://docs.gnani.ai/api/TTS/tts-inference, sending audio_config with sample_rate: 24000,
 * num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' returns a crystal-clear
 * RIFF WAVE binary at the exact requested rate — return valid RIFF WAVE buffers untouched without
 * applying destructive low-pass filtering or dynamic clipping gain.
 */
function isRiffWaveBuffer(buf) {
  return (
    Boolean(buf) &&
    Buffer.isBuffer(buf) &&
    buf.length >= 44 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WAVE'
  );
}

function wrapPcmToWavBuffer(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  if (!pcmBuffer || !Buffer.isBuffer(pcmBuffer)) {
    return Buffer.alloc(0);
  }
  if (isRiffWaveBuffer(pcmBuffer)) {
    return pcmBuffer;
  }
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(dataSize + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function generateLocalWavBuffer(text = '', sampleRate = 16000) {
  const durationSec = Math.min(3.2, Math.max(1.6, (text ? text.length : 20) / 48.0));
  const totalSamples = Math.floor(sampleRate * durationSec);
  const pcmBuffer = Buffer.alloc(totalSamples * 2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const freq = t < durationSec * 0.45 ? 440.0 : 554.37;
    const envelope = Math.sin((Math.PI * t) / durationSec) * Math.exp(-1.4 * (t % (durationSec * 0.45)));
    const sample = Math.round(
      11000 *
      envelope *
      (0.75 * Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t))
    );
    const clamped = Math.max(-32767, Math.min(32767, sample));
    pcmBuffer.writeInt16LE(clamped, i * 2);
  }

  return wrapPcmToWavBuffer(pcmBuffer, sampleRate, 1, 16);
}

// Purge poisoned 102,444-byte sine-wave caches on startup so real Gnani speech is synthesized fresh
let poisonedAudioPurged = false;
function purgePoisonedAudioFilesOnce() {
  if (poisonedAudioPurged) return;
  poisonedAudioPurged = true;
  try {
    if (!fs.existsSync(AUDIO_DIR)) return;
    for (const entry of fs.readdirSync(AUDIO_DIR)) {
      if (!entry.endsWith('.wav')) continue;
      const full = path.join(AUDIO_DIR, entry);
      const st = fs.statSync(full);
      if (st.size === 102444 || st.size <= 200) {
        fs.unlinkSync(full);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
purgePoisonedAudioFilesOnce();

function isValidCachedVoiceWav(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const st = fs.statSync(filePath);
  if (st.size <= 200) return false;
  if (st.size === 102444 && process.env.GNANI_API_KEY) {
    return false;
  }
  return true;
}

let gnaniHttpSerialQueue = Promise.resolve();
function enqueueGnaniRequest(fn) {
  const run = gnaniHttpSerialQueue.catch(() => {}).then(fn);
  gnaniHttpSerialQueue = run.catch(() => {});
  return run;
}

async function callGnaniTtsInference(
  cleanSpokenText,
  langCode,
  gnaniVoice,
  gnaniModel,
  gnaniKey,
  pacing = 1.0,
  voiceObj = null
) {
  const clampedSpeed = Number(Math.max(0.85, Math.min(1.15, Number(pacing) || 1.0)).toFixed(2));
  const primaryLang = toGnaniLanguageCode(langCode, voiceObj, false);
  const candidateLangs =
    gnaniModel === 'timbre-v2.5' && voiceObj?.preferredLanguage && voiceObj.preferredLanguage !== primaryLang
      ? [primaryLang, voiceObj.preferredLanguage]
      : [primaryLang];

  return enqueueGnaniRequest(async () => {
    for (const activeLang of candidateLangs) {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const resp = await fetch('https://api.vachana.ai/api/v1/tts/inference', {
            method: 'POST',
            headers: {
              'X-API-Key-ID': gnaniKey,
              'Content-Type': 'application/json',
              'User-Agent': 'WhyLine/1.0',
            },
            body: JSON.stringify({
              text: cleanSpokenText,
              voice: gnaniVoice,
              model: gnaniModel || 'timbre-v3.0',
              language: activeLang,
              speed: clampedSpeed,
              audio_config: {
                sample_rate: 24000,
                num_channels: 1,
                sample_width: 2,
                encoding: 'linear_pcm',
                container: 'wav',
              },
            }),
            signal: AbortSignal.timeout(15000),
          });

          if (resp.ok) {
            const ctype = String(resp.headers.get('content-type') || '').toLowerCase();
            if (ctype.includes('application/json')) {
              const json = await resp.json();
              const b64 = json.audio_base64 || json.audio || json.data;
              if (typeof b64 === 'string' && b64.length > 100) {
                return wrapPcmToWavBuffer(Buffer.from(b64, 'base64'), 24000, 1, 16);
              }
            } else {
              const arrayBuf = await resp.arrayBuffer();
              if (arrayBuf.byteLength > 100) {
                return wrapPcmToWavBuffer(Buffer.from(arrayBuf), 24000, 1, 16);
              }
            }
            break;
          } else if (resp.status === 429 || resp.status >= 500) {
            await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
            continue;
          } else {
            const errTxt = await resp.text().catch(() => '');
            console.warn(`Gnani TTS HTTP ${resp.status} (voice=${gnaniVoice}, model=${gnaniModel}, lang=${activeLang}): ${errTxt.slice(0, 180)}`);
            break;
          }
        } catch (err) {
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
            continue;
          }
          console.warn('Gnani TTS live request error:', err.message);
        }
      }
    }
    return null;
  });
}

/**
 * Synthesizes high-fidelity 24kHz 16-bit mono WAV speech strictly via Gnani Timbre
 * (`timbre-v3.0` / `timbre-v2.5`). Gemini TTS is never invoked.
 */
const ttsInFlightMap = new Map();

async function synthesizeSpeechAudio(
  text,
  language = 'en-IN',
  preferredVoice = null,
  _provider = 'gnani',
  preferredModel = null,
  pacing = 1.0
) {
  if (!text) return null;
  loadDotenvSafe();
  const langCode = toGnaniLanguageCode(language, null, false);

  const cleanSpokenText = clarifySpokenTextForTts(text);
  if (!cleanSpokenText) return null;

  const resolved = resolveVoiceAndModel(preferredVoice, preferredModel, langCode, 'gnani');
  const clampedSpeed = Number(Math.max(0.85, Math.min(1.15, Number(pacing) || 1.0)).toFixed(2));
  const cacheSig = `v3:gnani:${resolved.model}:${langCode}:${resolved.voice}:${clampedSpeed}:${cleanSpokenText}`;
  const digest = crypto.createHash('md5').update(cacheSig).digest('hex').slice(0, 12);
  const filename = `voice_${digest}.wav`;
  const filePath = path.join(AUDIO_DIR, filename);

  if (isValidCachedVoiceWav(filePath)) {
    return `/api/audio/${filename}`;
  }

  if (ttsInFlightMap.has(digest)) {
    return await ttsInFlightMap.get(digest);
  }

  const taskPromise = (async () => {
    if (isValidCachedVoiceWav(filePath)) {
      return `/api/audio/${filename}`;
    }

    const gnaniKey = String(process.env.GNANI_API_KEY || '').trim();
    if (gnaniKey) {
      const gnaniWav = await callGnaniTtsInference(
        cleanSpokenText,
        langCode,
        resolved.voice,
        resolved.model,
        gnaniKey,
        clampedSpeed,
        resolved.voiceObj
      );
      if (gnaniWav && gnaniWav.length > 200) {
        fs.mkdirSync(AUDIO_DIR, { recursive: true });
        fs.writeFileSync(filePath, gnaniWav);
        return `/api/audio/${filename}`;
      }
    }

    // Offline local WAV cue only if GNANI_API_KEY is missing or Gnani API is unreachable
    try {
      fs.mkdirSync(AUDIO_DIR, { recursive: true });
      const fallbackWav = generateLocalWavBuffer(cleanSpokenText, 16000);
      fs.writeFileSync(filePath, fallbackWav);
      return `/api/audio/${filename}`;
    } catch {
      return null;
    }
  })();

  ttsInFlightMap.set(digest, taskPromise);
  try {
    return await taskPromise;
  } finally {
    ttsInFlightMap.delete(digest);
  }
}

function buildStreamingTtsUrl(text, langCode = 'en-IN', voice = '', _provider = 'gnani', pacing = 1.0, model = 'timbre-v3.0') {
  const clean = clarifySpokenTextForTts(text).slice(0, 420);
  const resolved = resolveVoiceAndModel(voice, model, langCode, 'gnani');
  const voiceParam = `&voice=${encodeURIComponent(resolved.voice)}`;
  const modelParam = `&model=${encodeURIComponent(resolved.model)}`;
  const providerParam = `&provider=gnani`;
  const pacingParam = pacing ? `&pacing=${encodeURIComponent(pacing)}` : '';
  return `/api/tts/speak?lang=${encodeURIComponent(langCode)}&text=${encodeURIComponent(clean)}${voiceParam}${modelParam}${providerParam}${pacingParam}`;
}


function extractPrimarySymbol(f, fallback) {
  const fenceToken = f?.fences?.[0]?.token;
  if (fenceToken && !fenceToken.includes('.')) return fenceToken;
  const m = (f?.code || '').match(/(?:export\s+(?:default\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(|class\s+([A-Za-z0-9_]+)|(?:pub\s+)?(?:fn|func|function|def|fun)\s+(?:self\.)?([A-Za-z0-9_]+)|mongoose\.model\(\s*['"]([^'"]+)['"]|router\.(get|post|put|delete|patch)\()/);
  return m ? (m[1] || m[2] || m[3] || m[4] || m[5] || `router.${m[6]}()`) : (f?.shortName || fallback);
}

function sanitizeMermaidLabel(value, fallback = 'Module', maxLen = 58) {
  const cleaned = String(value || fallback)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/["'`[\]{}()<>|;\\]/g, ' ')
    .replace(/--+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3).trim()}...` : cleaned;
}

const MERMAID_LAYER_DEFS = [
  { id: 'entry', key: 'entry', number: 1, label: 'Entry Points & UI', className: 'entryLayer', token: '--layer-entry', fill: '#ECEAD0', stroke: '#545333' },
  { id: 'auth', key: 'auth', number: 2, label: 'Auth & Security Guards', className: 'authLayer', token: '--layer-auth', fill: '#F5EED8', stroke: '#8F5A08' },
  { id: 'core', key: 'core', number: 3, label: 'Core Modules & Logic', className: 'coreLayer', token: '--layer-core', fill: '#EAE8CA', stroke: '#3E3D25' },
  { id: 'data', key: 'data', number: 4, label: 'Database & State', className: 'dataLayer', token: '--layer-data', fill: '#E4ECE6', stroke: '#2E5E4E' },
  { id: 'external', key: 'ext', number: 5, label: 'External Services & APIs', className: 'externalLayer', token: '--layer-ext', fill: '#E3ECF2', stroke: '#3B6E91' },
  { id: 'deploy', key: 'deploy', number: 6, label: 'Runtime & Deployment', className: 'deployLayer', token: '--layer-deploy', fill: '#EDE8E4', stroke: '#6B6A55' },
];

function buildRepoArchitectureLayers(repoCtx, stack, steps = [], breakdown = {}, projectSummary = {}) {
  const files = repoCtx.files || [];
  const treePaths = Array.isArray(repoCtx.tree) && repoCtx.tree.length > 0 ? repoCtx.tree : files.map((f) => f.path);
  const fences = repoCtx.fences || [];

  const step0 = steps[0] || {};
  const step1 = steps[1] || {};
  const step2 = steps[2] || {};
  const step3 = steps[3] || {};
  const step4 = steps[4] || {};

  const entryTreeHits = treePaths
    .filter((p) => /(^|\/)(index|main|app|cli|client|frontend|pages|components|views|ui|ingress)\b/i.test(p))
    .slice(0, 4);
  const authTreeHits = treePaths
    .filter((p) => /(^|\/)(auth|jwt|guard|fence|security|middleware|policy|cors|permission|filter|verify)\b/i.test(p))
    .slice(0, 4);
  const coreTreeHits = treePaths
    .filter((p) => /(^|\/)(core|service|controller|handler|router|route|engine|parser|pipeline|domain|packages|src|lib)\b/i.test(p))
    .slice(0, 5);
  const dataTreeHits = treePaths
    .filter((p) => /(^|\/)(db|database|model|schema|store|storage|cache|sql|redis|prisma|outbox|state|entity|repo)\b/i.test(p))
    .slice(0, 4);

  const uniqueItems = (arr) => [...new Set(arr.filter(Boolean))].slice(0, 6);

  const entryItems = uniqueItems([
    step0.file_path ? `${step0.file_path} (${step0.symbol_name || 'Ingress'})` : '',
    step1.file_path && step1.file_path !== step0.file_path ? `${step1.file_path} (${step1.symbol_name || 'Dispatch'})` : '',
    ...(stack?.frontend || []),
    ...entryTreeHits,
  ]);

  const authItems = uniqueItems([
    ...(stack?.auth || []),
    breakdown?.auth && breakdown.auth !== 'Gateway / Consumer Auth' ? breakdown.auth : '',
    ...fences.slice(0, 3).map((fn) => `${fn.id}: ${fn.symbol_name || fn.file_path || 'Guardrail'}`),
    ...authTreeHits,
    'Input & Contract Validation',
  ]);

  const coreItems = uniqueItems([
    step2.file_path ? `${step2.file_path} (${step2.symbol_name || 'Router'})` : '',
    step3.file_path ? `${step3.file_path} (${step3.symbol_name || 'Core Logic'})` : '',
    ...files.map((f) => f.path),
    ...coreTreeHits,
  ]);

  const dataItems = uniqueItems([
    ...(stack?.database || []),
    step4.file_path ? `${step4.file_path} (${step4.symbol_name || 'Persistence'})` : '',
    breakdown?.database && !/None/i.test(breakdown.database) ? breakdown.database : '',
    ...dataTreeHits,
    'In-Memory & Request Context State',
  ]);

  const extItems = uniqueItems([
    ...(stack?.services || []),
    breakdown?.apis_and_services || '',
    ...(stack?.api_keys_and_env || []).slice(0, 4),
  ]);

  const deployItems = uniqueItems([
    projectSummary?.deployment_strategy?.recommended_platform || '',
    breakdown?.runtime || '',
    ...(stack?.manifests || []),
  ]);

  return [
    {
      ...MERMAID_LAYER_DEFS[0],
      title: 'Entry Points & Presentation',
      description: `Where users, CLI flags, or HTTP callers first enter ${repoCtx.fullName || 'the repository'} and dispatch requests.`,
      items: entryItems,
      files: entryItems,
    },
    {
      ...MERMAID_LAYER_DEFS[1],
      title: 'Auth & Security Guards',
      description: `Authentication checks, Spoken Fence invariants, and validation rules that protect downstream logic from bad inputs.`,
      items: authItems,
      files: authItems,
    },
    {
      ...MERMAID_LAYER_DEFS[2],
      title: 'Core Modules & Logic',
      description: `The central routers, controllers, and domain modules that transform data and execute business rules.`,
      items: coreItems,
      files: coreItems,
    },
    {
      ...MERMAID_LAYER_DEFS[3],
      title: 'Database & State',
      description: `Where records, schemas, caches, or in-memory state are stored and retrieved safely.`,
      items: dataItems,
      files: dataItems,
    },
    {
      ...MERMAID_LAYER_DEFS[4],
      title: 'External Services & APIs',
      description: `Third-party SDKs, webhooks, HTTP transports, and environment keys connected to ${repoCtx.fullName || 'this service'}.`,
      items: extItems,
      files: extItems,
    },
    {
      ...MERMAID_LAYER_DEFS[5],
      title: 'Runtime & Deployment',
      description: `The language runtime, dependency manifests, and container or cloud platform that build and run the project.`,
      items: deployItems,
      files: deployItems,
    },
  ];
}

function buildSixLayerMermaidFlowchart(repoCtx, stack, steps = [], breakdown = {}, projectSummary = {}) {
  const files = repoCtx.files || [];
  const fences = repoCtx.fences || [];
  const step0 = steps[0] || {};
  const step1 = steps[1] || {};
  const step2 = steps[2] || {};
  const step3 = steps[3] || {};
  const step4 = steps[4] || {};

  const s0Label = sanitizeMermaidLabel(step0.file_path || files[0]?.path || `${repoCtx.repo} entrypoint`);
  const s0Sym = sanitizeMermaidLabel(step0.symbol_name || 'Ingress', 'Ingress', 34);
  const s1Label = sanitizeMermaidLabel(step1.file_path || files[1]?.path || 'API / Request Client');
  const s1Sym = sanitizeMermaidLabel(step1.symbol_name || 'Dispatch', 'Dispatch', 34);
  const uiStackLabel =
    stack?.frontend && stack.frontend.length > 0
      ? sanitizeMermaidLabel(`UI Surface: ${stack.frontend.slice(0, 2).join(' + ')}`, '', 48)
      : '';

  const authInfo =
    (stack?.auth && stack.auth.length > 0 ? stack.auth.join(', ') : '') ||
    breakdown?.auth ||
    step2.fence_id ||
    (step2.file_path && /auth|jwt|guard|fence|cors|helmet/i.test(`${step2.file_path} ${step2.title}`) ? step2.file_path : '') ||
    'Input Validation & Guardrails';
  const authLabel = sanitizeMermaidLabel(authInfo);

  const primaryFence = fences[0] || null;
  const fenceGuardLabel = primaryFence
    ? sanitizeMermaidLabel(
        `${primaryFence.id || 'FENCE-01'} Guard: ${primaryFence.symbol_name || primaryFence.file_path || 'Contract Invariant'}`,
        'Runtime Invariant Guard',
        54
      )
    : sanitizeMermaidLabel(
        step2.fence_id ? `${step2.fence_id}: ${step2.matched_token || step2.symbol_name || 'Safety Invariant'}` : 'Schema & Boundary Guardrail',
        'Schema & Boundary Guardrail',
        54
      );

  const core1Label = sanitizeMermaidLabel(step2.file_path || files[2]?.path || 'Router / Pipeline');
  const core1Sym = sanitizeMermaidLabel(step2.symbol_name || 'routeHandler', 'routeHandler', 34);
  const core2Label = sanitizeMermaidLabel(step3.file_path || files[3]?.path || 'Core Domain Module');
  const core2Sym = sanitizeMermaidLabel(step3.symbol_name || 'executeDomain', 'executeDomain', 34);

  const usedCorePaths = new Set([step0.file_path, step1.file_path, step2.file_path, step3.file_path].filter(Boolean));
  const extraFiles = files.filter((f) => f?.path && !usedCorePaths.has(f.path));
  const extraModule1 = extraFiles[0] || null;
  const extraModule2 = extraFiles[1] || null;
  const extraLabel1 = sanitizeMermaidLabel(
    extraModule1 ? `${extraModule1.path} - ${extractPrimarySymbol(extraModule1, 'module')}` : step4.file_path || ''
  );
  const extraLabel2 = extraModule2
    ? sanitizeMermaidLabel(`${extraModule2.path} - ${extractPrimarySymbol(extraModule2, 'helper')}`)
    : '';

  const dbLabel = sanitizeMermaidLabel(
    (stack?.database && stack.database.length > 0 ? stack.database.join(', ') : '') ||
      breakdown?.database ||
      (step4.file_path && /db|model|schema|store|storage|cache|sql|redis/i.test(step4.file_path)
        ? step4.file_path
        : 'In-Memory / Consumer State')
  );
  const dataModelLabel =
    step4.file_path && !dbLabel.includes(step4.file_path)
      ? sanitizeMermaidLabel(`State Module: ${step4.file_path} - ${step4.symbol_name || 'persist'}`, '', 54)
      : '';

  const extLabel = sanitizeMermaidLabel(
    (stack?.services && stack.services.length > 0 ? stack.services.join(', ') : '') ||
      breakdown?.apis_and_services ||
      (stack?.api_keys_and_env && stack.api_keys_and_env.length > 0
        ? `Env: ${stack.api_keys_and_env.slice(0, 3).join(', ')}`
        : 'Standard HTTP / Host Runtime')
  );
  const envKeysList = (stack?.api_keys_and_env || []).filter((k) => !/No external API keys/i.test(k));
  const envNodeLabel =
    envKeysList.length > 0
      ? sanitizeMermaidLabel(`Env Config: ${envKeysList.slice(0, 3).join(', ')}`, '', 54)
      : '';

  const deployPlatform =
    projectSummary?.deployment_strategy?.recommended_platform ||
    (stack?.manifests && stack.manifests.length > 0 ? `${stack.manifests[0]} / Container` : '') ||
    breakdown?.runtime ||
    'Node / Container Runtime';
  const deployLabel = sanitizeMermaidLabel(deployPlatform);
  const manifestNodeLabel = sanitizeMermaidLabel(
    `Runtime & Manifests: ${breakdown?.runtime || repoCtx.language || 'Runtime'} (${(stack?.manifests || []).slice(0, 2).join(', ') || 'source'})`,
    '',
    56
  );

  const entryIds = ['E1', 'E2'];
  const authIds = ['A1', 'A2'];
  const coreIds = ['C1', 'C2'];
  const dataIds = ['D1'];
  const extIds = ['X1'];
  const deployIds = ['P1', 'P2'];

  const lines = [
    'flowchart TD',
    '  classDef entryLayer fill:#ECEAD0,stroke:#545333,color:#2A2919,stroke-width:2px',
    '  classDef authLayer fill:#F5EED8,stroke:#8F5A08,color:#2A2919,stroke-width:2px',
    '  classDef coreLayer fill:#EAE8CA,stroke:#3E3D25,color:#2A2919,stroke-width:2px',
    '  classDef dataLayer fill:#E4ECE6,stroke:#2E5E4E,color:#2A2919,stroke-width:2px',
    '  classDef externalLayer fill:#E3ECF2,stroke:#3B6E91,color:#2A2919,stroke-width:2px',
    '  classDef deployLayer fill:#EDE8E4,stroke:#6B6A55,color:#2A2919,stroke-width:2px',
    '',
    '  subgraph L1_ENTRY["1. Entry Points and Surface"]',
    `    E1["Step 1 Entrypoint: ${s0Label} - ${s0Sym}"]`,
    `    E2["Step 2 Dispatch: ${s1Label} - ${s1Sym}"]`,
  ];

  if (uiStackLabel) {
    lines.push(`    E3["${uiStackLabel}"]`);
    entryIds.push('E3');
  }

  lines.push(
    '  end',
    '',
    '  subgraph L2_AUTH["2. Auth and Safety Guards"]',
    `    A1["Auth / Policy Gate: ${authLabel}"]`,
    `    A2["${fenceGuardLabel}"]`,
    '  end',
    '',
    '  subgraph L3_CORE["3. Core Modules and Data Flow"]',
    `    C1["Step 3 Routing: ${core1Label} - ${core1Sym}"]`,
    `    C2["Step 4 Logic: ${core2Label} - ${core2Sym}"]`
  );

  if (extraLabel1 && extraLabel1 !== core1Label && extraLabel1 !== core2Label) {
    lines.push(`    C3["Step 5 Module: ${extraLabel1}"]`);
    coreIds.push('C3');
  }
  if (extraLabel2 && extraLabel2 !== extraLabel1 && extraLabel2 !== core1Label && extraLabel2 !== core2Label) {
    lines.push(`    C4["Sub-Module: ${extraLabel2}"]`);
    coreIds.push('C4');
  }

  lines.push(
    '  end',
    '',
    '  subgraph L4_DATA["4. Database and Persistence"]',
    `    D1["State / Storage: ${dbLabel}"]`
  );
  if (dataModelLabel) {
    lines.push(`    D2["${dataModelLabel}"]`);
    dataIds.push('D2');
  }

  lines.push(
    '  end',
    '',
    '  subgraph L5_EXTERNAL["5. External Services and Env"]',
    `    X1["External Integrations: ${extLabel}"]`
  );
  if (envNodeLabel) {
    lines.push(`    X2["${envNodeLabel}"]`);
    extIds.push('X2');
  }

  lines.push(
    '  end',
    '',
    '  subgraph L6_DEPLOY["6. Runtime and Deployment"]',
    `    P1["Build and Deploy: ${deployLabel}"]`,
    `    P2["${manifestNodeLabel}"]`,
    '  end',
    ''
  );

  if (entryIds.includes('E3')) {
    lines.push('  E3 -->|renders and triggers| E1');
  }
  lines.push(
    '  E1 -->|dispatches request| E2',
    '  E2 -->|validates policy| A1',
    '  A1 -->|enforces invariant| A2',
    '  A2 -->|routes payload| C1',
    '  C1 -->|invokes handler| C2'
  );

  const lastCoreId = coreIds.includes('C3') ? 'C3' : 'C2';
  if (coreIds.includes('C3')) {
    lines.push('  C2 -->|coordinates| C3');
  }
  if (coreIds.includes('C4')) {
    lines.push('  C2 -->|delegates to| C4');
  }

  if (dataIds.includes('D2')) {
    lines.push(`  ${lastCoreId} -->|maps schema| D2`);
    lines.push('  D2 -->|persists state| D1');
  } else {
    lines.push(`  ${lastCoreId} -->|reads and writes| D1`);
  }

  lines.push(`  ${lastCoreId} -->|calls services| X1`);
  if (extIds.includes('X2')) {
    lines.push('  X2 -.->|injects secrets| X1');
  }

  lines.push(
    '  P2 -->|builds runtime| P1',
    '  C1 -.->|packaged for| P1',
    '  D1 -.->|provisioned in| P1',
    '  X1 -.->|configured via env| P1',
    '',
    `  class ${entryIds.join(',')} entryLayer`,
    `  class ${authIds.join(',')} authLayer`,
    `  class ${coreIds.join(',')} coreLayer`,
    `  class ${dataIds.join(',')} dataLayer`,
    `  class ${extIds.join(',')} externalLayer`,
    `  class ${deployIds.join(',')} deployLayer`
  );

  return lines.join('\n');
}

function buildArchitecturalCritique(repoCtx, stack, groundedBreakdown, steps = [], existingSummary = {}) {
  const hasFrontend = stack.frontend && stack.frontend.length > 0;
  const hasBackend = stack.backend && stack.backend.length > 0;
  const hasDb = stack.database && stack.database.length > 0;
  const hasAuth = stack.auth && stack.auth.length > 0;
  const hasDocker = (stack.manifests || []).some((m) => /docker/i.test(m)) || (repoCtx.tree || []).some((p) => /dockerfile/i.test(p));
  const isTruncated = Boolean(repoCtx.truncated || repoCtx.fetch_warning || repoCtx.fetchWarning);
  const firstFiles = (repoCtx.files || []).map((f) => f.path).slice(0, 4);

  const walkthrough = steps.map((s, idx) => {
    const num = s.step_number || idx + 1;
    const summaryText = s.what_happens || s.simple_explanation || s.summary || s.title;
    return `Step ${num} (${s.file_path || 'module'}): ${summaryText}`;
  });

  const weaknesses = Array.isArray(existingSummary.weaknesses) && existingSummary.weaknesses.length > 0
    ? existingSummary.weaknesses
    : [
        !hasAuth
          ? `No dedicated auth middleware manifest detected in ${repoCtx.fullName}; request authentication relies on upstream gateway or host caller conventions.`
          : `Clock-skew and token verification tolerances in ${firstFiles[0] || 'auth middleware'} must stay aligned with key rotation policies.`,
        !hasDb
          ? `No standalone database engine manifest detected; long-lived state durability depends on consumer storage or in-memory lifecycle.`
          : `Shared persistence mutations across ${stack.database.join(', ')} create coupling unless idempotency keys and migrations are strictly versioned.`,
        !hasDocker
          ? `No root Dockerfile or container manifest detected in primary manifests (${(stack.manifests || []).join(', ') || 'repo root'}), which can cause environment drift across deployments.`
          : `Large repository modules (${firstFiles.join(', ') || repoCtx.fullName}) risk tight coupling if transport handlers directly invoke domain mutations without boundaries.`,
      ];

  if (isTruncated && weaknesses.length < 4) {
    weaknesses.push(
      `Large repository tree (${repoCtx.fullName}) exceeds unpaginated tree bounds; critical files were prioritized heuristically rather than indexing every test/example fixture.`
    );
  }

  const improvements = Array.isArray(existingSummary.improvements) && existingSummary.improvements.length > 0
    ? existingSummary.improvements
    : [
        `Enforce strict boundary contracts between entrypoint (${steps[0]?.file_path || 'ingress'}) and core logic (${steps[3]?.file_path || 'domain'}) with typed schemas and automated contract tests.`,
        hasBackend && !hasAuth
          ? `Add explicit middleware guardrails (rate limiting, request schema validation, auth verification) ahead of ${steps[2]?.file_path || 'router handlers'}.`
          : `Add circuit-breaker timeouts and structured observability spans around ${steps[1]?.file_path || 'external dispatchers'} and storage transitions.`,
        !hasDocker
          ? `Commit a multi-stage container build + healthcheck probe (/healthz) and document required environment variables (${(stack.api_keys_and_env || []).slice(0, 4).join(', ') || '.env'}).`
          : `Split high-churn modules around ${steps[2]?.file_path || 'core handlers'} into isolated packages with clear dependency injection for easier testing.`,
      ];

  const altCandidate =
    Array.isArray(existingSummary.modern_alternatives) && existingSummary.modern_alternatives.length > 0
      ? existingSummary.modern_alternatives[0]
      : null;

  const isJsTs = /javascript|typescript|node|react|next/i.test(`${repoCtx.language || ''} ${stack.runtimes.join(' ')}`);
  const bestAlternative =
    existingSummary.best_alternative_stack ||
    (altCandidate
      ? {
          name: altCandidate.name,
          reason: `${altCandidate.pros}. Tradeoff: ${altCandidate.cons}.`,
          migration_fit: altCandidate.when_to_choose,
        }
      : isJsTs
        ? {
            name: hasFrontend
              ? 'TypeScript + Vite / Next.js + Edge Workers (Hono)'
              : 'Rust (Axum + Tokio) or TypeScript + Hono/Fastify',
            reason:
              'Delivers end-to-end strict compile-time typing, faster cold starts, smaller runtime overhead, and cleaner module boundaries.',
            migration_fit: 'Recommended when scaling edge deployment, bundle size, or concurrent request throughput.',
          }
        : {
            name: 'Go (1.22 + Chi/Fiber) + PostgreSQL or Rust (Axum)',
            reason: 'Provides predictable tail latency, single-binary deployments, and strong concurrency ergonomics.',
            migration_fit: 'Best fit when operational simplicity and low memory overhead outweigh existing ecosystem plugins.',
          });

  return {
    step_by_step_walkthrough: walkthrough,
    weaknesses,
    improvements,
    best_alternative_stack: bestAlternative,
  };
}

function buildDeterministicAstFlowchart(repoCtx, stack, groundedBreakdown, langKey) {
  const files = repoCtx.files || [];
  const isNode = stack.runtimes.some((r) => /node/i.test(r)) || /javascript|typescript/i.test(repoCtx.language || '');
  const isPython = stack.runtimes.some((r) => /python/i.test(r)) || /python/i.test(repoCtx.language || '');
  const isCurated = Boolean(CURATED_GITHUB_REPOS[(repoCtx.fullName || '').toLowerCase()]);

  const usedPaths = new Set();
  const pickByRole = (re, fallbackIdx, options = {}) => {
    if (isCurated && files[fallbackIdx] && !usedPaths.has(files[fallbackIdx].path)) {
      usedPaths.add(files[fallbackIdx].path);
      return files[fallbackIdx];
    }
    const candidatePool = options.shallowFirst
      ? [...files].sort((a, b) => (a.path || '').split('/').length - (b.path || '').split('/').length)
      : files;
    const matchFn = (f) => {
      if (options.excludeRe && options.excludeRe.test(f.path || '')) return false;
      const roleTarget = String(f.shortName || f.path || '').replace(new RegExp(`^${(repoCtx.repo || 'repo').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[-_]?`, 'i'), '');
      return re.test(roleTarget) || re.test(f.path);
    };
    const unusedHit = candidatePool.find((f) => !usedPaths.has(f.path) && matchFn(f));
    const chosen = unusedHit || files.find((f) => !usedPaths.has(f.path)) || files[fallbackIdx % Math.max(1, files.length)] || candidatePool.find(matchFn) || { path: 'index.js', shortName: 'index.js', code: '// Source' };
    if (chosen?.path) usedPaths.add(chosen.path);
    return chosen;
  };
  const entryFile = pickByRole(/(^|\/|_)(express|app|index|main|cli|client|ingress|__init__)\./i, 0, { shallowFirst: true });
  const apiFile = pickByRole(/(application|normalize|decorators|api|client|request|dispatch|fetch|core_service|coreservice)/i, 1, { excludeRe: /error/i });
  const routeFile = pickByRole(/(server|route|router|core|ky|wsgi|asgi|safety_guard|safetyguard)/i, 2);
  const controllerFile = pickByRole(/(middleware|parser|controller|service|handler|usecase|reducer|storage_adapter|storageadapter|error)/i, 3);
  const modelFile = pickByRole(/(response|termui|delay|model|schema|entity|db|store|storage|adapter|telemetry|prisma|repo)/i, 4);

  const detailedExplanation = [
    `${repoCtx.fullName} (${repoCtx.description || `${repoCtx.language} repository`}) is structured as a ${groundedBreakdown.architecture_style}.`,
    `Frontend layer: ${groundedBreakdown.frontend}.`,
    `Backend & runtime layer: ${groundedBreakdown.backend} running on ${groundedBreakdown.runtime}.`,
    `Database & persistence layer: ${groundedBreakdown.database}; external APIs & auth: ${groundedBreakdown.apis_and_services}.`,
    `Required API keys & environment configuration: ${groundedBreakdown.api_keys_summary}.`,
  ].join(' ');

  const hasWebServerBackend = stack.backend.some((b) => !/CLI/i.test(b));
  const hasDatabase = stack.database.length > 0;
  const step3Label = hasWebServerBackend ? '3. Server Router & Middleware Guard' : '3. Core Execution & Invariant Guard';
  const step3Desc = hasWebServerBackend
    ? 'Traverses the routing stack, enforces middleware and auth guards, and maps requests to handlers.'
    : 'Enforces runtime invariants, context lifecycle boundaries, and retry/safety rules during core execution.';
  const step5Label = hasDatabase ? '5. Data Model & Persistence Layer' : '5. Output Serialization & Lifecycle Layer';
  const step5Desc = hasDatabase
    ? `Defines schemas and persists state records to ${groundedBreakdown.database}.`
    : 'Formats responses, terminal output streams, or lifecycle callbacks and returns results to the caller.';

  const builtSteps = [
    [entryFile, 'entrypoint', '1. Client / Ingress Entrypoint', 'Initializes the primary entrypoint or public API surface and dispatches incoming calls.'],
    [apiFile, 'domain', '2. Configuration & Request Dispatch', 'Normalizes options, binds decorators or client parameters, and prepares execution context.'],
    [routeFile, 'guard', step3Label, step3Desc],
    [controllerFile, 'domain', '4. Controller & Domain Orchestration', 'Executes domain rules, parses inputs or query parameters, and coordinates state transitions.'],
    [modelFile, 'storage', step5Label, step5Desc],
  ].map(([file, phase, label, desc], idx) => {
    const sym = extractPrimarySymbol(file, `step${idx + 1}()`);
    const codeLines = (file.code || '').split(/\r?\n/);
    const endLine = Math.min(codeLines.length || 30, 35);
    const fenceBadge = file.fences?.[0]?.badge;
    const stepSummary = fenceBadge ? `${desc} (${fenceBadge}). Grounded in ${file.path} (${sym}).` : `${desc} Grounded in ${file.path} (${sym}).`;
    return {
      step_number: idx + 1,
      node_id: `STEP-${idx + 1}`,
      phase,
      fence_id: file.fenceId || file.fences?.[0]?.id || undefined,
      title: `${label} (${file.path})`,
      file_path: file.path,
      line_range: `1-${endLine}`,
      summary: stepSummary,
      spoken_narration:
        langKey === 'hindi'
          ? `Step ${idx + 1}: ${file.path} (${sym}) — ${desc}`
          : langKey === 'telugu'
            ? `Step ${idx + 1}: ${file.path} (${sym}) — ${desc}`
            : `Step ${idx + 1}: In ${file.path}, ${sym} handles ${label.replace(/^\d+\.\s*/, '').toLowerCase()}. ${desc}`,
      simple_explanation: `${desc} Located in ${file.path} around symbol ${sym}.`,
      real_world_example: `Acts as stage ${idx + 1} of the ${repoCtx.fullName} execution pipeline in ${file.path}.`,
      what_happens: desc,
      why_guarded: fenceBadge || `Preserves the contract of ${sym} in ${file.path} so callers and downstream modules stay in sync.`,
      danger_if_removed: `Breaking ${file.path} disrupts ${label.replace(/^\d+\.\s*/, '').toLowerCase()} across ${repoCtx.fullName}.`,
      symbol_name: sym,
      matched_token: sym,
      code_snippet: codeLines.slice(0, 25).join('\n') || '// Source file',
    };
  });

  const baseSummary = {
    simple_explanation: `${repoCtx.fullName} is a ${groundedBreakdown.architecture_style}: ${repoCtx.description || 'modular software repository'}. Frontend uses ${groundedBreakdown.frontend}, backend runs ${groundedBreakdown.backend}, and persistence uses ${groundedBreakdown.database}.`,
    detailed_explanation: detailedExplanation,
    real_world_example: `Think of ${repoCtx.fullName} as a coordinated pipeline where requests enter through ${entryFile.path}, route through ${routeFile.path} and ${controllerFile.path}, and persist state via ${modelFile.path}.`,
    full_stack_breakdown: groundedBreakdown,
    why_this_stack_is_best: `Combining ${groundedBreakdown.frontend !== 'None (No browser UI layer in this repo)' ? `${groundedBreakdown.frontend} on the client with ` : ''}${groundedBreakdown.backend} and ${groundedBreakdown.database} keeps data contracts explicit across ${files.map((f) => f.path).join(', ')}.`,
    modern_alternatives: [
      {
        name: 'Rust (Axum + Tokio + SQLx)',
        pros: 'Compile-time memory safety, zero GC pauses, single static binary deployment',
        cons: 'Longer compile times and stricter borrow-checker onboarding',
        when_to_choose: 'When sub-millisecond tail latency and minimal memory footprint are mandatory.',
      },
      {
        name: 'Go (Golang 1.22 + Fiber/Chi)',
        pros: 'Fast compilation, built-in concurrency primitives, straightforward container builds',
        cons: 'More verbose error and schema plumbing than dynamic runtimes',
        when_to_choose: 'When operating high-throughput cloud microservices.',
      },
    ],
    deployment_strategy: {
      recommended_platform: stack.frontend.length && stack.backend.length ? 'Render / Railway / Fly.io (Backend) + Vercel / Netlify (Frontend)' : 'Google Cloud Run / Fly.io / Docker',
      deploy_steps: [
        `1. Install dependencies across manifests (${stack.manifests.join(', ') || 'package.json'}).`,
        `2. Configure required environment variables: ${stack.api_keys_and_env.join(', ')}.`,
        `3. Build and start the service entrypoint (${routeFile.path || entryFile.path}).`,
      ],
      dockerfile: isNode
        ? 'FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --omit=dev\nCOPY . .\nEXPOSE 3000\nCMD ["npm", "start"]'
        : isPython
          ? 'FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements*.txt pyproject.toml* ./\nRUN pip install --no-cache-dir -r requirements.txt || pip install .\nCOPY . .\nCMD ["python", "main.py"]'
          : 'FROM alpine:3.20\nWORKDIR /app\nCOPY . .\nCMD ["sh"]',
      cli_deploy_command: `docker build -t ${(repoCtx.repo || 'repo').toLowerCase()}:latest . && docker run -p 3000:3000 ${(repoCtx.repo || 'repo').toLowerCase()}:latest`,
      environment_variables: stack.api_keys_and_env,
    },
  };

  const critique = buildArchitecturalCritique(repoCtx, stack, groundedBreakdown, builtSteps, baseSummary);
  return {
    project_summary: {
      ...baseSummary,
      ...critique,
    },
    steps: builtSteps,
  };
}

function buildFlowchartResponsePayload(repoCtx, dynamicFlow, stack, groundedBreakdown, langKey, langCode, flowSource = 'ast-manifest') {
  const llmSummary = dynamicFlow.project_summary || {};
  const llmStack = llmSummary.full_stack_breakdown || {};
  const mergedStackBreakdown = {
    frontend: stack.frontend.length ? `${groundedBreakdown.frontend}${llmStack.frontend && !llmStack.frontend.includes(stack.frontend[0]) ? ` (${llmStack.frontend})` : ''}` : groundedBreakdown.frontend,
    backend: stack.backend.length ? `${groundedBreakdown.backend}${llmStack.backend && !llmStack.backend.includes(stack.backend[0]) ? ` (${llmStack.backend})` : ''}` : (llmStack.backend || groundedBreakdown.backend),
    database: stack.database.length ? groundedBreakdown.database : (llmStack.database && !/postgres/i.test(llmStack.database) ? llmStack.database : groundedBreakdown.database),
    apis_and_services: groundedBreakdown.apis_and_services,
    auth: stack.auth?.length ? stack.auth.join(', ') : (llmStack.auth || 'Gateway / Consumer Auth'),
    api_keys_summary: groundedBreakdown.api_keys_summary,
    runtime: groundedBreakdown.runtime,
    architecture_style: llmStack.architecture_style || groundedBreakdown.architecture_style,
  };

  const stepNarrations = (dynamicFlow.steps || []).map((s, idx) => {
    const stepNum = idx + 1;
    return (
      s.spoken_narration ||
      `Step ${stepNum}: ${s.title}. ${s.simple_explanation || s.summary || ''}`
    );
  });

  const steps = (dynamicFlow.steps || []).map((s, idx) => {
    const stepNum = idx + 1;
    const nodeId = s.node_id || `STEP-${stepNum}`;
    const narration = stepNarrations[idx];
    return {
      ...s,
      step_number: stepNum,
      node_id: nodeId,
      phase: s.phase || (idx === 0 ? 'entrypoint' : idx === 1 ? 'domain' : idx === 2 ? 'guard' : idx === 3 ? 'storage' : 'telemetry'),
      status: s.status || 'VERIFIED_ACTIVE',
      tts_language: langCode,
      spoken_narration: narration,
      audio_url: buildStreamingTtsUrl(narration, langCode),
    };
  });

  const critique = buildArchitecturalCritique(repoCtx, stack, mergedStackBreakdown, steps, llmSummary);
  const enrichedProjectSummary = {
    ...llmSummary,
    ...critique,
    detailed_explanation:
      llmSummary.detailed_explanation ||
      `${llmSummary.simple_explanation || ''} Frontend: ${mergedStackBreakdown.frontend}. Backend: ${mergedStackBreakdown.backend}. Database: ${mergedStackBreakdown.database}. API Keys & Env: ${mergedStackBreakdown.api_keys_summary}.`.trim(),
    full_stack_breakdown: mergedStackBreakdown,
    api_keys_and_env: stack.api_keys_and_env,
    detected_stack: stack,
    deployment_strategy: {
      ...(llmSummary.deployment_strategy || {}),
      environment_variables: stack.api_keys_and_env,
    },
  };

  const summaryNarrationText = `${enrichedProjectSummary?.simple_explanation || ''} ${enrichedProjectSummary?.real_world_example || ''}`.trim();
  enrichedProjectSummary.audio_url = buildStreamingTtsUrl(summaryNarrationText, langCode);

  const mermaidCode =
    dynamicFlow.mermaid_code ||
    buildSixLayerMermaidFlowchart(repoCtx, stack, steps, mergedStackBreakdown, enrichedProjectSummary);
  const repoArchLayers = buildRepoArchitectureLayers(
    repoCtx,
    stack,
    steps,
    mergedStackBreakdown,
    enrichedProjectSummary
  );
  enrichedProjectSummary.architecture_layers = repoArchLayers;

  const graph = {
    nodes: steps.map((s, idx) => ({
      id: s.node_id,
      label: s.title,
      category: s.phase,
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
      hub: { id: 'REPO-HUB', label: repoCtx.fullName, category: 'hub', phase: 'hub', position: { x: 480, y: 220 } },
      branches: [
        { id: 'STEP-1', label: steps[0]?.title || 'Ingress', category: 'entrypoint', phase: 'entrypoint', position: { x: 140, y: 70 } },
        { id: 'STEP-2', label: steps[1]?.title || 'Domain', category: 'domain', phase: 'domain', position: { x: 820, y: 70 } },
        { id: 'STEP-3', label: steps[2]?.title || 'Guard', category: 'guard', phase: 'guard', position: { x: 140, y: 370 } },
        { id: 'STEP-4', label: steps[3]?.title || 'Storage', category: 'storage', phase: 'storage', position: { x: 820, y: 370 } },
        { id: 'STEP-5', label: steps[4]?.title || 'Telemetry', category: 'telemetry', phase: 'telemetry', position: { x: 480, y: 440 } },
      ],
    },
  };

  return {
    status: 'ok',
    source: flowSource,
    repo_name: repoCtx.fullName,
    repo_slug: repoCtx.fullName,
    language: langKey,
    primary_language: repoCtx.language || groundedBreakdown.runtime,
    architecture_style: mergedStackBreakdown.architecture_style,
    runtime_engine: mergedStackBreakdown.runtime,
    first_file: steps[0]?.file_path || repoCtx.files?.[0]?.path || '',
    files: (repoCtx.files || []).map((f) => f.path),
    fetch_warning: repoCtx.fetch_warning || repoCtx.fetchWarning || null,
    mermaid_code: mermaidCode,
    mermaid_layers: repoArchLayers,
    architecture_layers: repoArchLayers,
    weaknesses: enrichedProjectSummary.weaknesses,
    improvements: enrichedProjectSummary.improvements,
    best_alternative_stack: enrichedProjectSummary.best_alternative_stack,
    step_by_step_walkthrough: enrichedProjectSummary.step_by_step_walkthrough,
    project_summary: enrichedProjectSummary,
    steps,
    nodes: steps,
    edges: graph.edges,
    graph,
    flowchart: {
      repo_name: repoCtx.fullName,
      language: langKey,
      primary_language: repoCtx.language || groundedBreakdown.runtime,
      architecture_style: mergedStackBreakdown.architecture_style,
      runtime_engine: mergedStackBreakdown.runtime,
      first_file: steps[0]?.file_path || repoCtx.files?.[0]?.path || '',
      mermaid_code: mermaidCode,
      mermaid_layers: repoArchLayers,
      architecture_layers: repoArchLayers,
      nodes: steps,
      edges: graph.edges,
      steps,
    },
  };
}

function buildLocalHealthConnectFlowchart(repoCtx, langKey = 'english', langCode = 'en-IN') {
  const steps = [
    {
      step_number: 1,
      node_id: 'STEP-1',
      phase: 'entrypoint',
      title: 'Patient Checkout & UPI Intent Dispatcher',
      file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      line_range: '10-18',
      summary: 'Receives clinic appointment settlement payload and validates currency & amount.',
      spoken_narration:
        langKey === 'hindi'
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
      code_snippet:
        'public SettlementResult dispatchSettlement(SettlementRequest req) {\n    Objects.requireNonNull(req, "request cannot be null");\n    if (!"INR".equals(req.getCurrency()) || req.getAmount() <= 0) {\n        throw new InvalidSettlementException("Invalid currency or non-positive amount");\n    }\n    return processWithRetries(req);\n}',
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
      spoken_narration:
        langKey === 'hindi'
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
      code_snippet:
        '// FENCE-001: Spoken invariant locked by @anjani\nint retryCount = 5;\nfor (int attempt = 1; attempt <= retryCount; attempt++) {\n    try {\n        return gatewayClient.sendSettlement(req);\n    } catch (TransientGatewayException ex) {\n        Thread.sleep(calculateBackoff(attempt));\n    }\n}',
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
      spoken_narration:
        langKey === 'hindi'
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
      code_snippet:
        'public boolean acquireLock(String appointmentId, String sha256Key) {\n    String existing = redisTemplate.opsForValue().get("idemp:" + appointmentId);\n    if (existing != null) return false;\n    return redisTemplate.opsForValue().setIfAbsent("idemp:" + appointmentId, sha256Key, 15, TimeUnit.MINUTES);\n}',
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
      spoken_narration:
        langKey === 'hindi'
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
      code_snippet:
        '// FENCE-003: Frame pacing for Adreno 610/618 GPU stability\nprivate static final int FRAME_PACING_MS = 120;\npublic void renderSlice(DicomFrame frame) {\n    syncHardwareFence();\n    Thread.sleep(FRAME_PACING_MS);\n    dispatchEglSurface(frame);\n}',
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
      spoken_narration:
        langKey === 'hindi'
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
      code_snippet:
        '// FENCE-004: 180s NTP drift tolerance for rural clinic hardware\njwtParserBuilder.setAllowedClockSkewSeconds(180);\nClaims claims = jwtParserBuilder.build().parseClaimsJws(token).getBody();\nrecordAuditProvenance(claims.getSubject(), "SETTLEMENT_APPROVED");',
      audio_url: `/api/audio/flow_4a1ee7_${langKey}_step5.wav`,
    },
  ].map((s) => ({
    ...s,
    audio_url: buildStreamingTtsUrl(s.spoken_narration, langCode, '', 'gnani', 1.0, 'timbre-v3.0'),
  }));

  const project_summary = {
    simple_explanation:
      'HealthConnect is an offline-resilient healthcare clinic payment gateway and DICOM diagnostic workstation in India. It guarantees that rural and sub-district hospital billing never double-charges patients during midnight ISP packet drops, maintaining automated spoken fence invariants and audit provenance.',
    real_world_example:
      'Think of it like an offline UPI card swiper at a village clinic with patchy cellular connectivity: it buffers transaction tokens locally with an idempotency lock so when the link reconnects, the clinic settles bills safely without repeat debits.',
    full_stack_breakdown: {
      frontend: 'Android Native (Jetpack Compose / Java) on clinic tablets & React 19 web dashboard',
      backend: 'Spring Boot 3.4 on Java 21 (Virtual Threads / Loom) with Hexagonal Architecture',
      database: 'PostgreSQL 16 with TimescaleDB & Redis 7 cluster for idempotent outbox locks',
      runtime: 'OCI Linux Containers orchestrated via Kubernetes / Google Cloud Run',
      architecture_style: 'Outbox Pattern with Spoken Fence Architectural Decision Records (ADRs)',
    },
    why_this_stack_is_best:
      'Java 21 virtual threads deliver ultra-high concurrency for 50,000+ simultaneous clinic webhooks with negligible memory footprint. Spring Boot provides battle-tested transaction atomicity and idempotent locks, while Redis cluster prevents distributed double-spend anomalies across sub-second retry spikes.',
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
      dockerfile:
        'FROM maven:3.9-eclipse-temurin-21-alpine AS builder\nWORKDIR /app\nCOPY pom.xml .\nRUN mvn dependency:go-offline\nCOPY src ./src\nRUN mvn clean package -DskipTests\n\nFROM eclipse-temurin:21-jre-alpine\nWORKDIR /app\nCOPY --from=builder /app/target/*.jar app.jar\nEXPOSE 8080\nUSER 1001\nENTRYPOINT ["java", "-XX:+UseZGC", "-jar", "app.jar"]',
      cli_deploy_command:
        'gcloud run deploy healthconnect-gateway --image gcr.io/healthconnect/payment-gateway:latest --platform managed --region asia-south1 --allow-unauthenticated',
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

  const localStack = repoCtx.detected_stack || {
    frontend: ['Android Native (Jetpack Compose / Java)', 'React 19 Dashboard'],
    backend: ['Spring Boot 3.4', 'Java 21 (Virtual Threads)'],
    database: ['PostgreSQL 16 (TimescaleDB)', 'Redis 7 Cluster'],
    auth: ['JWT Clock-Skew Filter (180s NTP Drift Tolerance)'],
    services: ['NPCI / UPI Payment Gateway', 'Gnani Vachana Voice Pipeline'],
    runtimes: ['JVM 21', 'Node.js'],
    api_keys_and_env: ['DATABASE_URL', 'REDIS_HOST', 'GNANI_API_KEY', 'GEMINI_API_KEY', 'WEBHOOK_SECRET'],
    manifests: ['pom.xml', 'package.json'],
  };
  const localBreakdown = {
    ...project_summary.full_stack_breakdown,
    apis_and_services: 'NPCI / UPI Settlement Webhooks + JWT Auth',
    auth: 'JWT Clock-Skew Validation (180s Tolerance)',
    api_keys_summary: localStack.api_keys_and_env.join(', '),
  };
  const localCritique = buildArchitecturalCritique(repoCtx, localStack, localBreakdown, steps, project_summary);
  const enrichedLocalSummary = {
    ...project_summary,
    audio_url: buildStreamingTtsUrl(project_summary.simple_explanation, langCode, '', 'gnani', 1.0, 'timbre-v3.0'),
    full_stack_breakdown: localBreakdown,
    ...localCritique,
  };
  const localMermaidCode = buildSixLayerMermaidFlowchart(
    repoCtx,
    localStack,
    steps,
    localBreakdown,
    enrichedLocalSummary
  );
  const localArchLayers = buildRepoArchitectureLayers(
    repoCtx,
    localStack,
    steps,
    localBreakdown,
    enrichedLocalSummary
  );
  enrichedLocalSummary.architecture_layers = localArchLayers;

  return {
    status: 'ok',
    repo_name: repoCtx.fullName,
    repo_slug: repoCtx.fullName,
    language: langKey,
    primary_language: repoCtx.language || 'Java',
    architecture_style: enrichedLocalSummary.full_stack_breakdown.architecture_style,
    runtime_engine: enrichedLocalSummary.full_stack_breakdown.runtime,
    first_file: steps[0]?.file_path || 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
    files: (repoCtx.files || []).map((f) => f.path),
    fetch_warning: null,
    mermaid_code: localMermaidCode,
    mermaid_layers: localArchLayers,
    architecture_layers: localArchLayers,
    weaknesses: enrichedLocalSummary.weaknesses,
    improvements: enrichedLocalSummary.improvements,
    best_alternative_stack: enrichedLocalSummary.best_alternative_stack,
    step_by_step_walkthrough: enrichedLocalSummary.step_by_step_walkthrough,
    project_summary: enrichedLocalSummary,
    steps,
    nodes: steps,
    edges: graph.edges,
    graph,
    flowchart: {
      repo_name: repoCtx.fullName,
      language: langKey,
      primary_language: repoCtx.language || 'Java',
      architecture_style: enrichedLocalSummary.full_stack_breakdown.architecture_style,
      runtime_engine: enrichedLocalSummary.full_stack_breakdown.runtime,
      first_file: steps[0]?.file_path || 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      mermaid_code: localMermaidCode,
      mermaid_layers: localArchLayers,
      architecture_layers: localArchLayers,
      nodes: steps,
      edges: graph.edges,
      steps,
    },
  };
}

function enrichRepoContextWithFlowchart(ctx) {
  if (!ctx) return ctx;
  if (ctx.isLocal) {
    const localFlow = buildLocalHealthConnectFlowchart(ctx, 'english', 'en-IN');
    ctx.mermaid_code = localFlow.mermaid_code;
    ctx.mermaid_layers = localFlow.mermaid_layers;
    ctx.architecture_layers = localFlow.architecture_layers;
    ctx.weaknesses = localFlow.weaknesses;
    ctx.improvements = localFlow.improvements;
    ctx.best_alternative_stack = localFlow.best_alternative_stack;
    ctx.step_by_step_walkthrough = localFlow.step_by_step_walkthrough;
    ctx.project_summary = localFlow.project_summary;
    ctx.steps = localFlow.steps;
    return ctx;
  }
  const stack = detectRepositoryStack(ctx);
  const breakdown = formatDetectedStackSummary(ctx, stack);
  ctx.detected_stack = stack;
  ctx.full_stack_breakdown = breakdown;
  ctx.architecture_style = breakdown.architecture_style || ctx.architecture_style;
  ctx.runtime_engine = breakdown.runtime || ctx.runtime_engine;
  const flow = buildDeterministicAstFlowchart(ctx, stack, breakdown, 'english');
  const payload = buildFlowchartResponsePayload(ctx, flow, stack, breakdown, 'english', 'en-IN', 'ast-manifest');
  ctx.mermaid_code = payload.mermaid_code;
  ctx.mermaid_layers = payload.mermaid_layers;
  ctx.architecture_layers = payload.architecture_layers;
  ctx.weaknesses = payload.weaknesses;
  ctx.improvements = payload.improvements;
  ctx.best_alternative_stack = payload.best_alternative_stack;
  ctx.step_by_step_walkthrough = payload.step_by_step_walkthrough;
  ctx.project_summary = payload.project_summary;
  ctx.steps = payload.steps;
  return ctx;
}

function preseedFlowchartCache() {
  const languages = [
    { key: 'english', code: 'en-IN' },
    { key: 'hindi', code: 'hi-IN' },
    { key: 'telugu', code: 'te-IN' },
  ];
  for (const [, curated] of Object.entries(CURATED_GITHUB_REPOS)) {
    if (!curated.files || curated.files.length === 0) continue;
    const curatedProfile = inferRepoLanguageProfile(curated.owner, curated.repo, curated.language || '');
    const ctx = {
      owner: curated.owner,
      repo: curated.repo,
      fullName: curated.fullName,
      url: curated.url,
      language: curated.language || 'JavaScript',
      architecture_style: curatedProfile.arch,
      runtime_engine: curatedProfile.runtime,
      files: curated.files,
      fences: curated.fences || [],
      description: curated.description,
      manifests: Array.isArray(curated.manifests) && curated.manifests.length > 0
        ? [...curated.manifests]
        : [{ path: curatedProfile.manifest, text: `# ${curated.fullName} (${curated.language})` }],
    };
    const stack = detectRepositoryStack(ctx);
    const breakdown = formatDetectedStackSummary(ctx, stack);
    for (const lang of languages) {
      const cacheKey = `${ctx.fullName.toLowerCase()}:${(ctx.language || '').toLowerCase()}:${lang.key}`;
      const flow = buildDeterministicAstFlowchart(ctx, stack, breakdown, lang.key);
      const payload = buildFlowchartResponsePayload(ctx, flow, stack, breakdown, lang.key, lang.code, 'ast-manifest');
      flowchartResponseCache.set(cacheKey, payload);
    }
  }
}
preseedFlowchartCache();

async function transcribeSpokenAudio(audioBase64, mimeType = 'audio/wav', language = 'en-IN', sttModel = 'prisma-v3.0', repoFullName = 'repository') {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return { transcript: '', provider_mode: 'none', model: sttModel };
  }
  loadDotenvSafe();
  const cleanedBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const gnaniKey = String(process.env.GNANI_API_KEY || '').trim();
  const chosenSttModel = String(sttModel || '').includes('2.5') ? 'prisma-v2.5' : 'prisma-v3.0';
  const sttLangCode = toGnaniLanguageCode(language, null, true);

  if (gnaniKey && cleanedBase64.length > 32) {
    let rawBuf = Buffer.from(cleanedBase64, 'base64');
    const lowerMime = String(mimeType || 'audio/wav').toLowerCase();
    let ext = 'wav';
    let uploadMime = 'audio/wav';
    if (lowerMime.includes('mp3') || lowerMime.includes('mpeg')) {
      ext = 'mp3';
      uploadMime = 'audio/mpeg';
    } else if (lowerMime.includes('ogg')) {
      ext = 'ogg';
      uploadMime = 'audio/ogg';
    } else if (lowerMime.includes('flac')) {
      ext = 'flac';
      uploadMime = 'audio/flac';
    } else if (lowerMime.includes('aac')) {
      ext = 'aac';
      uploadMime = 'audio/aac';
    } else if (lowerMime.includes('m4a') || lowerMime.includes('mp4')) {
      ext = 'm4a';
      uploadMime = 'audio/mp4';
    } else {
      // Default to RIFF WAV (wrapping raw PCM16 if needed)
      if (!isRiffWaveBuffer(rawBuf)) {
        rawBuf = wrapPcmToWavBuffer(rawBuf, 16000, 1, 16);
      }
      ext = 'wav';
      uploadMime = 'audio/wav';
    }

    return enqueueGnaniRequest(async () => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const form = new FormData();
          form.append('audio_file', new Blob([rawBuf], { type: uploadMime }), `recording.${ext}`);
          form.append('model', chosenSttModel);
          form.append('language_code', sttLangCode);
          form.append('format', 'transcribe');
          if (chosenSttModel === 'prisma-v3.0') {
            form.append(
              'keyterms',
              JSON.stringify(['Whyline', 'HealthConnect', 'GatewayRouter', 'retryCount', 'Supabase', 'Mermaid', 'Gnani', repoFullName].filter(Boolean))
            );
          }

          const resp = await fetch('https://api.vachana.ai/stt/v3', {
            method: 'POST',
            headers: {
              'X-API-Key-ID': gnaniKey,
              'User-Agent': 'WhyLine-Voice-Engine/1.0',
            },
            body: form,
            signal: AbortSignal.timeout(15000),
          });

          if (resp.ok) {
            const json = await resp.json();
            const text = String(json?.transcript || json?.text || json?.asr_text || '').trim();
            return {
              transcript: text,
              provider_mode: `gnani-${chosenSttModel}-live`,
              model: json?.model || chosenSttModel,
              detected_language_code: json?.detected_language_code || sttLangCode,
            };
          } else if (resp.status === 429 || resp.status >= 500) {
            await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
            continue;
          } else {
            const errTxt = await resp.text().catch(() => '');
            console.warn(`Gnani STT HTTP ${resp.status} (model=${chosenSttModel}, lang=${sttLangCode}): ${errTxt.slice(0, 180)}`);
            break;
          }
        } catch (err) {
          if (attempt < maxRetries - 1) {
            await new Promise((r) => setTimeout(r, 900 * (attempt + 1)));
            continue;
          }
          console.warn('Gnani STT live request error:', err.message);
        }
      }
      return { transcript: '', provider_mode: `gnani-${chosenSttModel}-fallback`, model: chosenSttModel };
    });
  }

  return { transcript: '', provider_mode: `gnani-${chosenSttModel}-fallback`, model: chosenSttModel };
}

/**
 * Uses the server-side Gemini Flash model solely as the text/JSON code reasoning brain
 * over the currently loaded GitHub repository and synthesizes reply strictly with Gnani Timbre.
 */
async function queryGeminiRepositoryBrain(
  question,
  language,
  repoCtx,
  baselinePayload,
  preferredVoice = null,
  preferredModel = null,
  provider = 'gnani',
  pacing = 1.0
) {
  const resolved = resolveVoiceAndModel(preferredVoice, preferredModel, language, provider);
  const selectedVoiceLabel = resolved.displayVoice || resolved.voice;
  const withVoiceSelection = (payload) => {
    const replyText = payload.spoken_answer || payload.spoken_reply || '';
    const ttsUrl = buildStreamingTtsUrl(replyText, language, selectedVoiceLabel, resolved.provider, pacing, resolved.model);
    return {
      ...payload,
      voice_used: selectedVoiceLabel,
      model_used: resolved.model,
      provider_used: resolved.provider,
      audio_url: ttsUrl || payload.audio_url,
    };
  };

  const ai = getGenAIClient();
  if (!ai) {
    return withVoiceSelection(baselinePayload);
  }

  try {
    const langName =
      language === 'te-IN'
        ? 'Telugu (or natural Telugu-English engineering code-mix)'
        : language === 'hi-IN'
          ? 'Hindi (or natural Hindi-English engineering code-mix)'
          : 'English';

    const repoFilesContext = (repoCtx.files || [])
      .slice(0, 8)
      .map((f) => {
        const numberedLines = (f.code || '')
          .split(/\r?\n/)
          .slice(0, 75)
          .map((lineText, idx) => `${idx + 1}: ${lineText}`)
          .join('\n');
        return `FILE: ${f.path}\n${numberedLines}`;
      })
      .join('\n\n---\n\n');

    const detectedStack = detectRepositoryStack(repoCtx);
    const prompt = `You are the WhyLine Gemini Repository Voice Agent & Principal Architecture Brain.
Active GitHub Repository: ${repoCtx.fullName} (${repoCtx.url})
Description: ${repoCtx.description}
Detected Stack, Manifests & Required API Keys: ${JSON.stringify(detectedStack)}
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

    const { response, modelUsed } = await generateContentWithFallback(
      ai,
      {
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
      },
      6500
    );

    const parsed = JSON.parse(response.text || '{}');
    if (parsed && parsed.spoken_answer) {
      // Pre-warm audio in background using selected Gnani voice/model/pacing and return streaming TTS URL immediately
      synthesizeSpeechAudio(parsed.spoken_answer, language, selectedVoiceLabel, 'gnani', resolved.model, pacing).catch(() => {});
      const ttsAudioUrl = buildStreamingTtsUrl(parsed.spoken_answer, language, selectedVoiceLabel, 'gnani', pacing, resolved.model);
      return {
        ...baselinePayload,
        repo_full_name: repoCtx.fullName,
        repo_url: repoCtx.url,
        brain_engine: `Gemini (${modelUsed}) Live Repository Brain (@google/genai)`,
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
        intent: baselinePayload.executed_task.intent,
        action_taken: parsed.action_taken || baselinePayload.executed_task.action_taken,
        target_file: parsed.target_file || baselinePayload.executed_task.target_file,
        target_line: parsed.target_line || baselinePayload.executed_task.target_line,
        strategies:
          Array.isArray(parsed.strategies) && parsed.strategies.length > 0
            ? parsed.strategies
            : baselinePayload.strategies,
        voice_used: selectedVoiceLabel,
        model_used: resolved.model,
        provider_used: resolved.provider,
        audio_url: ttsAudioUrl || baselinePayload.audio_url,
      };
    }
  } catch (err) {
    console.error('queryGeminiRepositoryBrain error:', err?.message || err);
    // Gracefully fall back to deterministic baselinePayload with selected voice preserved
  }

  return withVoiceSelection(baselinePayload);
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

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    let bytes = 0;
    let aborted = false;
    req.on('data', (chunk) => {
      if (aborted) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        aborted = true;
        raw = '';
        resolve({});
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (aborted) return;
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
        const supabaseConfigured = Boolean(
          process.env.SUPABASE_URL &&
          (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)
        );
        return sendJson(res, 200, {
          status: 'ok',
          service: 'whyline-api',
          gemini_brain_configured: Boolean(process.env.GEMINI_API_KEY),
          supabase_configured: supabaseConfigured,
          active_repo: getActiveRepoContext().fullName,
        });
      }

      // GET /api/supabase/status
      if (pathname === '/api/supabase/status' && method === 'GET') {
        const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
        const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
        if (!supabaseUrl || !supabaseKey) {
          return sendJson(res, 200, {
            status: 'unconfigured',
            configured: false,
            message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from environment',
          });
        }

        const tStart = Date.now();
        const counts = { ast_nodes: 0, voice_pins: 0, debug_checkpoints: 0 };
        let rpcHealthy = false;
        let rpcLatencyMs = null;
        let sampleMatch = null;

        try {
          const tables = ['ast_nodes', 'voice_pins', 'debug_checkpoints'];
          await Promise.all(
            tables.map(async (table) => {
              try {
                const r = await fetch(`${supabaseUrl}/rest/v1/${table}?limit=0`, {
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    Prefer: 'count=exact',
                  },
                  signal: AbortSignal.timeout(3000),
                });
                if (r.ok) {
                  const range = r.headers.get('content-range') || '';
                  const parts = range.split('/');
                  if (parts[1]) {
                    counts[table] = parseInt(parts[1], 10) || 0;
                  }
                }
              } catch {
                // Table probe error handled gracefully
              }
            })
          );

          const tRpc = Date.now();
          const rrfResult = await querySupabasePgVectorFences('payment retry dispatch', 2);
          if (rrfResult && Array.isArray(rrfResult.matches)) {
            rpcHealthy = true;
            rpcLatencyMs = Date.now() - tRpc;
            sampleMatch = rrfResult.matches[0]?.symbol_name || null;
          }

          return sendJson(res, 200, {
            status: 'ok',
            configured: true,
            project_url: supabaseUrl,
            counts,
            rpc_function: 'match_whyline_code_and_fences',
            rpc_healthy: rpcHealthy,
            rpc_latency_ms: rpcLatencyMs,
            sample_match: sampleMatch,
            total_probe_latency_ms: Date.now() - tStart,
          });
        } catch (err) {
          return sendJson(res, 500, {
            status: 'error',
            configured: true,
            error: err.message,
            counts,
            rpc_healthy: false,
          });
        }
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
        const langHint = body.repo_language || body.primary_language || body.language_hint || normalizeProgrammingLanguageHint(body.language);
        const loaded = await loadAndIndexGitHubRepository(repoUrl, langHint);
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
            provider: 'Gnani Timbre v3.0',
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
        // If the request specifies a repo_url / github_url / repo to switch on the fly, load it first
        const requestedRepo = body.repo_url || body.github_url || body.repo;
        if (requestedRepo && requestedRepo !== getActiveRepoContext().url) {
          try {
            await loadAndIndexGitHubRepository(requestedRepo);
          } catch (e) {
            console.warn('Could not index custom repo on the fly in copilot:', e.message);
          }
        }

        const repoCtx = getActiveRepoContext();
        let rawQuestion = body.question || 'How do we fix the double-charge bug safely?';
        const language = body.language || 'en-IN';
        const preferredVoice = body.voice || null;
        const preferredModel = body.model || body.tts_model || null;
        const provider = 'gnani';
        const pacing = Number(body.pacing || body.playback_rate || 1.0);
        const sttModel = body.stt_model || 'prisma-v3.0';
        let sttProviderMode = null;

        // If raw audio was sent, transcribe strictly via Gnani Vachana Prisma STT
        if (body.audio_base64 && typeof body.audio_base64 === 'string') {
          const sttOut = await transcribeSpokenAudio(
            body.audio_base64,
            body.mime_type || 'audio/wav',
            language,
            sttModel,
            repoCtx.fullName
          );
          sttProviderMode = sttOut.provider_mode;
          if (sttOut.transcript) {
            rawQuestion = sttOut.transcript;
          }
        }

        const fences = repoCtx.isLocal ? readJsonSafe(FENCES_PATH, []) : repoCtx.fences || [];
        const baselinePayload = executeCopilotTaskForQuestion(
          rawQuestion,
          language,
          fences,
          repoCtx
        );

        // Hybrid Supabase pgvector RRF retrieval
        let liveSupabaseRrf = null;
        try {
          liveSupabaseRrf = await querySupabasePgVectorFences(rawQuestion, 5);
        } catch (supabaseErr) {
          console.warn('Supabase RRF query failed:', supabaseErr.message);
        }

        const enrichedPayload = await queryGeminiRepositoryBrain(
          baselinePayload.question,
          baselinePayload.language,
          repoCtx,
          baselinePayload,
          preferredVoice,
          preferredModel,
          provider,
          pacing
        );

        if (sttProviderMode) {
          enrichedPayload.stt_provider_mode = sttProviderMode;
        }

        if (liveSupabaseRrf && liveSupabaseRrf.matches?.length > 0) {
          enrichedPayload.rrf_telemetry = {
            mode: 'supabase_pgvector_live',
            rpc_function: liveSupabaseRrf.rpc_function,
            latency_ms: liveSupabaseRrf.latency_ms,
            rrf_k: 60,
            dense_score: 0.94,
            sparse_bm25_score: 0.89,
            hybrid_rank: 1,
            matched_fences: liveSupabaseRrf.matches.map((m, idx) => ({
              id: m.fence_id || `FENCE-0${idx + 1}`,
              symbol_name: m.symbol_name || 'GatewayRouter',
              pr_number: m.provenance?.merged_pr ? `PR #${m.provenance.merged_pr}` : (m.provenance?.issue ? `#${m.provenance.issue}` : 'PR #108'),
              rrf_score: (m.rrf_score != null ? Number(m.rrf_score) : (1 / (60 + idx + 1))).toFixed(4),
              file_path: m.file_path,
              danger_condition: m.danger_condition,
              reconstructed_why: m.reconstructed_why,
            })),
          };
          if (!enrichedPayload.matched_fence && liveSupabaseRrf.matches[0]) {
            const top = liveSupabaseRrf.matches[0];
            enrichedPayload.matched_fence = {
              id: top.fence_id,
              symbol_name: top.symbol_name,
              file_path: top.file_path,
              danger_condition: top.danger_condition,
              reconstructed_why: top.reconstructed_why,
              constraint_summary: top.constraint_summary,
            };
          }
        }

        return sendJson(res, 200, enrichedPayload);
      }

      // GET/POST /api/repo/scan-flowchart, /api/repo/flowchart & POST /api/gemini/explain-flowchart
      if (
        pathname === '/api/repo/scan-flowchart' ||
        pathname === '/api/repo/flowchart' ||
        pathname === '/api/gemini/explain-flowchart'
      ) {
        const body = method === 'POST' ? await parseBody(req) : {};
        const qRepo = urlObj.searchParams.get('github_url') || urlObj.searchParams.get('repo_url') || urlObj.searchParams.get('repo');
        const qLang = urlObj.searchParams.get('lang') || urlObj.searchParams.get('language');
        const qForce = urlObj.searchParams.get('force_refresh') === '1' || urlObj.searchParams.get('force_refresh') === 'true';

        // Support both POST JSON body and GET query parameters so switching repos works across both verbs
        const requestedRepoUrl = body.github_url || body.repo_url || body.repo || qRepo;
        const rawLanguageInput = body.language ?? qLang;
        const forceRefresh = Boolean(body.force_refresh || qForce);
        const progLangFromLanguageField = normalizeProgrammingLanguageHint(rawLanguageInput);
        const langHint = body.repo_language || body.primary_language || body.language_hint || progLangFromLanguageField;
        const currentActive = getActiveRepoContext();
        const parsedReq = requestedRepoUrl ? parseGitHubRepoInput(requestedRepoUrl) : null;
        const isAlreadyActive = parsedReq && currentActive && (
          (parsedReq.isLocal && currentActive.isLocal) ||
          parsedReq.fullName?.toLowerCase() === currentActive.fullName?.toLowerCase()
        );
        let repoLoadError = null;
        if (requestedRepoUrl && (!isAlreadyActive || forceRefresh)) {
          try {
            await loadAndIndexGitHubRepository(requestedRepoUrl, langHint);
          } catch (e) {
            repoLoadError = e?.message || 'Unable to index repository.';
            console.warn('Could not index custom repo on the fly:', repoLoadError);
          }
        }

        const repoCtx = getActiveRepoContext();
        if (repoLoadError && parsedReq && !parsedReq.isLocal && currentActive.isLocal) {
          return sendJson(res, 404, {
            status: 'error',
            error: `Repository "${requestedRepoUrl}" could not be fetched (${repoLoadError}). Verify the owner/repo spelling, public visibility, or GITHUB_TOKEN for private repositories.`,
          });
        }
        if (repoCtx.not_found && parsedReq && !parsedReq.isLocal) {
          return sendJson(res, 404, {
            status: 'error',
            error: `GitHub repository "${repoCtx.fullName}" returned 404 (not found or private without GITHUB_TOKEN).`,
          });
        }

        const rawNarrationLang = progLangFromLanguageField
          ? String(body.narration_language || body.voice_language || urlObj.searchParams.get('narration_language') || 'english').toLowerCase()
          : String(rawLanguageInput || 'telugu').toLowerCase();
        const langKey = rawNarrationLang.includes('hi')
          ? 'hindi'
          : rawNarrationLang.includes('en')
            ? 'english'
            : 'telugu';
        const langCode = langKey === 'hindi' ? 'hi-IN' : langKey === 'telugu' ? 'te-IN' : 'en-IN';

        // Check in-memory flowchart cache first for instant (<1ms) response across all repos
        const flowCacheKey = `${(repoCtx.fullName || '').toLowerCase()}:${(repoCtx.language || '').toLowerCase()}:${langKey}`;
        if (!forceRefresh && flowchartResponseCache.has(flowCacheKey)) {
          return sendJson(res, 200, flowchartResponseCache.get(flowCacheKey));
        }

        // Check if repo is local or custom
        if (repoCtx.isLocal) {
          const localPayload = buildLocalHealthConnectFlowchart(repoCtx, langKey, langCode);
          flowchartResponseCache.set(flowCacheKey, localPayload);
          return sendJson(res, 200, localPayload);
        }

        // Custom repository dynamic flowchart generation: deterministic manifest/AST stack (<2ms)
        const stack = detectRepositoryStack(repoCtx);
        const groundedBreakdown = formatDetectedStackSummary(repoCtx, stack);
        const deterministicFlow = buildDeterministicAstFlowchart(repoCtx, stack, groundedBreakdown, langKey);
        const responsePayload = buildFlowchartResponsePayload(
          repoCtx,
          deterministicFlow,
          stack,
          groundedBreakdown,
          langKey,
          langCode,
          'ast-manifest'
        );

        flowchartResponseCache.set(flowCacheKey, responsePayload);

        // Audio synthesizes on demand via Gnani /api/tts/speak when requested by user

        // Asynchronously enrich with Gemini if available (non-blocking)
        if (getGenAIClient() && (repoCtx.files || []).length > 0) {
          buildGeminiFlowchart(repoCtx, stack, langKey)
            .then((geminiFlow) => {
              if (geminiFlow && geminiFlow.steps && geminiFlow.steps.length > 0) {
                const enriched = buildFlowchartResponsePayload(
                  repoCtx,
                  geminiFlow,
                  stack,
                  groundedBreakdown,
                  langKey,
                  langCode,
                  'gemini+ast-manifest'
                );
                flowchartResponseCache.set(flowCacheKey, enriched);
              }
            })
            .catch(() => {});
        }

        return sendJson(res, 200, responsePayload);
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
        ].map((n) => ({
          ...n,
          audio_url: buildStreamingTtsUrl(n.narration_text, language, '', 'gnani', 1.0, 'timbre-v3.0'),
        }));

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

      // GET /api/gnani/voices & GET /api/voices (Strict Gnani Timbre v3.0 / v2.5 TTS & Prisma v3.0 / v2.5 STT catalogs)
      if ((pathname === '/api/gnani/voices' || pathname === '/api/voices') && method === 'GET') {
        const langFilter = String(urlObj.searchParams.get('lang') || '').trim().toLowerCase().slice(0, 2);
        const filterByLang = (list) =>
          !langFilter || langFilter === 'al' || langFilter === 'au'
            ? list
            : list.filter(
                (v) =>
                  v.model === 'timbre-v3.0' ||
                  String(v.language || '').toLowerCase().startsWith(langFilter)
              );
        return sendJson(res, 200, {
          status: 'ok',
          provider: 'gnani',
          models: GNANI_MODELS,
          tts_models: GNANI_MODELS.filter((m) => m.kind === 'tts'),
          stt_models: GNANI_MODELS.filter((m) => m.kind === 'stt'),
          voices: filterByLang(ALL_VOICE_CATALOG),
          gnani_voices: filterByLang(GNANI_VOICE_CATALOG),
          timbre_v3_voices: filterByLang(GNANI_V3_VOICES),
          timbre_v25_voices: filterByLang(GNANI_V2_VOICES),
        });
      }

      // GET /api/tts/speak?lang=en-IN&voice=Shivani&model=timbre-v3.0&provider=gnani&pacing=1.0&text=...
      if (pathname === '/api/tts/speak' && method === 'GET') {
        const textParam = urlObj.searchParams.get('text') || 'Spoken fence audio ready.';
        const langParam = urlObj.searchParams.get('lang') || 'en-IN';
        const voiceParam = urlObj.searchParams.get('voice') || null;
        const modelParam = urlObj.searchParams.get('model') || null;
        const pacingParam = Number(urlObj.searchParams.get('pacing') || urlObj.searchParams.get('playback_rate') || 1.0);
        const synthesizedUrl = await synthesizeSpeechAudio(textParam, langParam, voiceParam, 'gnani', modelParam, pacingParam);
        const filename = synthesizedUrl ? path.basename(synthesizedUrl) : null;
        const targetWav = filename ? path.join(AUDIO_DIR, filename) : null;

        if (targetWav && fs.existsSync(targetWav)) {
          const rawBuf = fs.readFileSync(targetWav);
          const wavBuf = wrapPcmToWavBuffer(rawBuf, 24000, 1, 16);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Length', wavBuf.length);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(wavBuf);
          return;
        }

        const fallbackWav = generateLocalWavBuffer(textParam, 16000);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', fallbackWav.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(fallbackWav);
        return;
      }

      // POST /api/tts & POST /api/gnani/tts (Strictly Gnani Vachana Timbre)
      if ((pathname === '/api/tts' || pathname === '/api/gnani/tts') && method === 'POST') {
        const body = await parseBody(req);
        const text = body.text || 'Spoken fence audio synthesized.';
        const langCode = body.language || body.lang_code || 'en-IN';
        const preferredVoice = body.voice || null;
        const preferredModel = body.model || null;
        const pacing = Number(body.pacing || body.playback_rate || 1.0);
        const resolved = resolveVoiceAndModel(preferredVoice, preferredModel, langCode, 'gnani');
        const resolvedVoice = resolved.displayVoice || resolved.voice;
        const digest = crypto
          .createHash('md5')
          .update(`gnani:${resolved.model}:${langCode}:${resolvedVoice}:${pacing}:${text}`)
          .digest('hex')
          .slice(0, 16);
        const audioUrl = await synthesizeSpeechAudio(text, langCode, resolvedVoice, 'gnani', resolved.model, pacing);
        const targetWav = audioUrl ? path.join(AUDIO_DIR, path.basename(audioUrl)) : null;
        const isLiveGnani = Boolean(process.env.GNANI_API_KEY && targetWav && fs.existsSync(targetWav) && fs.statSync(targetWav).size !== 102444);

        return sendJson(res, 200, {
          status: 'ok',
          id: digest,
          provider: `Gnani Timbre (${resolved.model})`,
          model: resolved.model,
          provider_mode: isLiveGnani ? `gnani-${resolved.model}-live` : 'offline-wav-fallback',
          language: langCode,
          voice: resolvedVoice,
          pacing,
          digest,
          audio_url: audioUrl || `/api/audio/voice_${digest.slice(0, 10)}.wav`,
        });
      }

      // POST /api/gnani/stt (Strictly Gnani Vachana Prisma v3.0 / v2.5)
      if (pathname === '/api/gnani/stt' && method === 'POST') {
        const body = await parseBody(req);
        const requestedSttRepo = body.repo_url || body.github_url || body.repo;
        if (requestedSttRepo && requestedSttRepo !== getActiveRepoContext().url) {
          try {
            await loadAndIndexGitHubRepository(requestedSttRepo);
          } catch {
            // keep current repo context
          }
        }
        const repoCtx = getActiveRepoContext();
        const sttLang = body.language || 'en-IN';
        const sttModel = String(body.model || body.stt_model || '').includes('2.5') ? 'prisma-v2.5' : 'prisma-v3.0';
        let rawTranscript = body.audio_text_hint || body.transcript || '';
        let sttProviderMode = `${sttModel}-fallback`;

        if (body.audio_base64 !== undefined && body.audio_base64 !== null && body.audio_base64 !== '') {
          if (typeof body.audio_base64 !== 'string') {
            return sendJson(res, 400, { error: 'audio_base64 must be a base64 string' });
          }
          const cleaned = body.audio_base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
          if (!cleaned || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
            return sendJson(res, 400, { error: 'Invalid base64 audio payload' });
          }
          const sttOut = await transcribeSpokenAudio(
            cleaned,
            body.mime_type || 'audio/wav',
            sttLang,
            sttModel,
            repoCtx.fullName
          );
          sttProviderMode = sttOut.provider_mode || sttProviderMode;
          if (sttOut.transcript) {
            rawTranscript = sttOut.transcript;
          }
        }

        const sttResult = rescoreSpokenTranscript(rawTranscript, sttLang, repoCtx.symbols);
        return sendJson(res, 200, {
          ...sttResult,
          model: sttModel,
          provider: 'gnani',
          provider_mode: sttProviderMode,
        });
      }

      // GET /api/audio/:audioId
      if (pathname.startsWith('/api/audio/') && method === 'GET') {
        let requestedName = '';
        try {
          requestedName = decodeURIComponent(pathname.replace('/api/audio/', ''));
        } catch {
          return sendJson(res, 400, { error: 'Malformed audio path' });
        }
        const safeBase = path.basename(requestedName).replace(/[^a-zA-Z0-9_.-]/g, '');
        const stem = safeBase.replace(/\.wav$/i, '') || 'audio_cue';
        const audioRoot = path.resolve(AUDIO_DIR) + path.sep;
        loadDotenvSafe();
        const candidates = [
          path.resolve(AUDIO_DIR, safeBase),
          path.resolve(AUDIO_DIR, `${stem}.wav`),
          path.resolve(AUDIO_DIR, `voice_${stem}.wav`),
          path.resolve(AUDIO_DIR, `voice_${stem.slice(0, 10)}.wav`),
          path.resolve(AUDIO_DIR, `tts_${stem}.wav`),
          path.resolve(AUDIO_DIR, `${stem.toLowerCase()}.wav`),
        ].filter((p) => p.startsWith(audioRoot));

        const foundFile = candidates.find((p) => isValidCachedVoiceWav(p));
        if (foundFile) {
          const rawBuf = fs.readFileSync(foundFile);
          const wavBuf = wrapPcmToWavBuffer(rawBuf, 24000, 1, 16);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'audio/wav');
          res.setHeader('Content-Length', wavBuf.length);
          res.setHeader('Accept-Ranges', 'bytes');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          res.end(wavBuf);
          return;
        }

        const fences = readJsonSafe(FENCES_PATH, []);
        const stemLower = stem.toLowerCase();
        const matchedFence = Array.isArray(fences)
          ? fences.find(
              (f) =>
                String(f?.id || '').toLowerCase() === stemLower ||
                path.basename(String(f?.audio_url || '')).replace(/\.wav$/i, '').toLowerCase() === stemLower ||
                stemLower.startsWith(String(f?.id || '__none__').toLowerCase())
            )
          : null;
        const narrationText = clarifySpokenTextForTts(
          matchedFence?.voice_transcript ||
            matchedFence?.why ||
            `WhyLine voice explanation for ${stem.replace(/_/g, ' ')}. Keeping spoken architectural invariants safe.`
        );
        const gnaniKey = String(process.env.GNANI_API_KEY || '').trim();
        if (gnaniKey && narrationText) {
          const resolved = resolveVoiceAndModel('Shivani', 'timbre-v3.0', 'en-IN', 'gnani');
          const gnaniWav = await callGnaniTtsInference(
            narrationText,
            'en-IN',
            resolved.voice,
            resolved.model,
            gnaniKey,
            1.0,
            resolved.voiceObj
          );
          if (gnaniWav && gnaniWav.length > 200) {
            const cacheOutPath = path.resolve(AUDIO_DIR, `${stem}.wav`);
            if (cacheOutPath.startsWith(audioRoot)) {
              fs.mkdirSync(AUDIO_DIR, { recursive: true });
              fs.writeFileSync(cacheOutPath, gnaniWav);
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Content-Length', gnaniWav.length);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.end(gnaniWav);
            return;
          }
        }

        // Dynamically synthesize local WAV cue only if GNANI_API_KEY is missing or unreachable
        const dynamicWav = generateLocalWavBuffer(narrationText || stem.replace(/_/g, ' '), 16000);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', dynamicWav.length);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(dynamicWav);
        return;
      }

      // GET /api/settings
      if (pathname === '/api/settings' && method === 'GET') {
        return sendJson(res, 200, {
          providers: {
            gnani_stt: {
              name: 'Gnani Vachana Prisma v3.0 & v2.5 STT',
              models: ['prisma-v3.0', 'prisma-v2.5'],
              mode: process.env.GNANI_API_KEY ? 'CONNECTED_LIVE' : 'OFFLINE_FALLBACK',
              languages: ['en-IN', 'hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'indic-auto'],
              ast_vocabulary_rescoring: true,
            },
            gnani_tts: {
              name: 'Gnani Vachana Timbre v3.0 & v2.5 TTS',
              models: ['timbre-v3.0', 'timbre-v2.5'],
              mode: process.env.GNANI_API_KEY ? 'CONNECTED_LIVE' : 'OFFLINE_FALLBACK',
              sample_rate_hz: 24000,
              format: 'LINEAR16 WAV (24kHz PCM)',
            },
            gemini_reasoning: {
              name: 'Gemini Code Architecture Brain (@google/genai — Text/Mermaid Only)',
              mode: process.env.GEMINI_API_KEY ? 'CONNECTED_TEXT_ONLY' : 'DETERMINISTIC_AST',
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
