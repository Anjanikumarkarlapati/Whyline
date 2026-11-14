import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEMO_FILES } from './demoFiles';

const WorkbenchContext = createContext(null);

const QA_HISTORY_STORAGE_KEY = 'whyline-qa-history-v3-gnani';

export const QUICK_GITHUB_REPOS = [
  {
    label: 'HealthConnect/payment-gateway-v1',
    fullName: 'HealthConnect/payment-gateway-v1',
    url: 'https://github.com/HealthConnect/payment-gateway-v1',
    simpleDescription:
      'Handles clinic payment settlements, retry rules, and medical image processing.',
    sampleQuestion:
      'How do we fix the double-charge bug in GatewayRouter.java without breaking retryCount = 5?',
    starterQuestions: [
      {
        label: 'Fix double-charge safely',
        query:
          'How do we fix the double-charge bug in GatewayRouter.java without breaking retryCount = 5?',
        file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
        line: 23,
      },
      {
        label: 'Why does DicomShaderPipeline wait 120ms?',
        query: 'Can we remove Thread.sleep(120) in DicomShaderPipeline.java on clinic tablets?',
        file: 'src/main/java/com/healthconnect/imaging/DicomShaderPipeline.java',
        line: 9,
      },
      {
        label: 'Why allow 180s clock drift in JWT?',
        query: 'Why does JwtClockSkewFilter.java allow 180 seconds of clock drift?',
        file: 'src/main/java/com/healthconnect/auth/JwtClockSkewFilter.java',
        line: 6,
      },
    ],
  },
  {
    label: 'expressjs/express',
    fullName: 'expressjs/express',
    url: 'https://github.com/expressjs/express',
    simpleDescription:
      'Fast, minimal web framework for Node.js that routes HTTP requests through middleware.',
    sampleQuestion:
      'How does app.use mount middleware and preserve lazyrouter initialization in lib/application.js?',
    starterQuestions: [
      {
        label: 'How does app.use() add middleware?',
        query:
          'How does app.use mount middleware and preserve lazyrouter initialization in lib/application.js?',
      },
      {
        label: 'How does Express route a request?',
        query: 'How does Router.handle match incoming HTTP URLs to route handlers in Express?',
      },
    ],
  },
  {
    label: 'sindresorhus/ky',
    fullName: 'sindresorhus/ky',
    url: 'https://github.com/sindresorhus/ky',
    simpleDescription:
      'Tiny and friendly JavaScript HTTP client built on top of the browser Fetch API.',
    sampleQuestion:
      'How does Ky.ts clone the Request stream and calculate Retry-After backoff during retries?',
    starterQuestions: [
      {
        label: 'How do automatic request retries work?',
        query:
          'How does Ky.ts clone the Request stream and calculate Retry-After backoff during retries?',
      },
      {
        label: 'How are HTTP timeouts handled?',
        query: 'How does Ky handle request timeouts using AbortController?',
      },
    ],
  },
  {
    label: 'pallets/click',
    fullName: 'pallets/click',
    url: 'https://github.com/pallets/click',
    simpleDescription:
      'Python package for creating command-line interfaces with clean options and help menus.',
    sampleQuestion:
      'Why does BaseCommand.main wrap invoke(ctx) inside with self.make_context in src/click/core.py?',
    starterQuestions: [
      {
        label: 'How does Click run a CLI command?',
        query:
          'Why does BaseCommand.main wrap invoke(ctx) inside with self.make_context in src/click/core.py?',
      },
      {
        label: 'How are command arguments parsed?',
        query: 'How does Click validate command line options before calling the Python function?',
      },
    ],
  },
];

const DEFAULT_SPOKEN_REPLY =
  'In GatewayRouter.java on line 23, retryCount is set to 5 because the v1 payment gateway drops packets around midnight. To stop double-charging without removing the 5 retries, pass a unique idempotency key for each orderId into sendV1Frame so duplicate retries are safely ignored.';

const DEFAULT_GNANI_AUDIO_URL =
  `/api/tts/speak?lang=en-IN&voice=Shivani&provider=gnani&model=timbre-v3.0&pacing=1.0&text=${encodeURIComponent(DEFAULT_SPOKEN_REPLY)}`;

const DEFAULT_ANSWER = {
  question:
    'How do we fix the double-charge bug in GatewayRouter.java without breaking retryCount = 5?',
  repo_full_name: 'HealthConnect/payment-gateway-v1',
  language: 'en-IN',
  voice: 'Shivani',
  brain_engine: 'Gemini 3.8 Flash',
  audio_url: DEFAULT_GNANI_AUDIO_URL,
  spoken_reply: DEFAULT_SPOKEN_REPLY,
  guardrail_rule:
    'Keep retryCount = 5 in GatewayRouter.java until application.yml switches gateway.version from v1 to v2.',
  recommended_patch: `String idempotencyKey = "settle_" + orderId;
for (int attempt = 1; attempt <= retryCount; attempt++) {
    if (sendV1Frame(orderId, amountPaise, timeoutMs, idempotencyKey)) {
        return new PaymentReceipt(orderId, "SETTLED", attempt);
    }
}`,
  executed_task: {
    task_id: 'TASK-212',
    intent: 'EXPLAIN_AND_SUGGEST_SAFE_FIX',
    guardrail_status: 'Safe Fix Ready',
    action_taken:
      'Checked GatewayRouter.java (line 23) and prepared a safe idempotency key fix that keeps the 5 retries intact.',
    target_file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
    target_line: 23,
    fence_id: 'FENCE-001',
  },
  referenced_files: [
    {
      file_path: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      line_number: 23,
      explanation:
        'Runs up to 5 payment settlement attempts with a 4500ms timeout to handle midnight network drops.',
      snippet: `int retryCount = 5; // Keep 5 retries for v1 midnight packet drops\nint timeoutMs = 4500;`,
    },
    {
      file_path: 'src/main/resources/application.yml',
      line_number: 6,
      explanation:
        'Configures which payment gateway version is active (v1 requires 5 retries; v2 handles retries automatically).',
      snippet: `gateway:\n  version: v1\n  settlementWindow: "00:00-00:15"`,
    },
  ],
  strategies: [
    {
      rank: 1,
      title: 'Add a Unique Idempotency Key Inside the Retry Loop',
      description:
        'Create a deterministic key from orderId and send it with each retry so the payment server never charges the same order twice.',
      risk_level: 'LOW',
      referenced_file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      referenced_line: 23,
    },
    {
      rank: 2,
      title: 'Add Short Wait Times Between Retries',
      description:
        'Keep retryCount = 5, but pause briefly (2s, 4s, 8s) between retries so the server can recover.',
      risk_level: 'MODERATE',
      referenced_file: 'src/main/java/com/healthconnect/payments/GatewayRouter.java',
      referenced_line: 15,
    },
  ],
};

function loadInitialHistory() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(QA_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage error
  }
  return [
    {
      id: 'default-qa-1',
      question: DEFAULT_ANSWER.question,
      repoFullName: DEFAULT_ANSWER.repo_full_name,
      language: DEFAULT_ANSWER.language,
      timestamp: 'Saved Example',
      response: DEFAULT_ANSWER,
    },
  ];
}

export function WorkbenchProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [repoContext, setRepoContext] = useState({
    owner: 'HealthConnect',
    repo: 'payment-gateway-v1',
    fullName: 'HealthConnect/payment-gateway-v1',
    url: 'https://github.com/HealthConnect/payment-gateway-v1',
    branch: 'main',
    isLocal: true,
    description:
      'Handles clinic payment settlements, retry rules, and medical image processing.',
    files: DEMO_FILES,
  });
  const [repoLoading, setRepoLoading] = useState(false);

  // Shared Question & Answer State across Ask Repo, Answers, and Flowcharts pages
  const [currentQuery, setCurrentQuery] = useState(
    'How do we fix the double-charge bug in gateway router without breaking retry count = 5 using idempotency key until application yml upgrades to gateway dot version v2?'
  );
  const [latestResponse, setLatestResponse] = useState(DEFAULT_ANSWER);
  const [latestSttTelemetry, setLatestSttTelemetry] = useState(null);
  const [latestAudioUrl, setLatestAudioUrl] = useState(DEFAULT_GNANI_AUDIO_URL);
  const [cacheTelemetry, setCacheTelemetry] = useState(null);
  const [qaHistory, setQaHistory] = useState(loadInitialHistory);

  const activeFiles =
    repoContext?.files && repoContext.files.length > 0 ? repoContext.files : DEMO_FILES;

  const urlFile = searchParams.get('file');
  const urlLine = searchParams.get('line');
  const urlPanel = searchParams.get('panel');
  const urlFence = searchParams.get('fence');

  const defaultFile = activeFiles[0].path;
  const initialFile = urlFile || defaultFile;
  const parsedLine = urlLine ? parseInt(urlLine, 10) : NaN;
  const initialLine =
    Number.isInteger(parsedLine) && parsedLine > 0 ? parsedLine : activeFiles[0].defaultLine || 1;
  const initialPanel =
    urlPanel && ['fence', 'why', 'ask'].includes(urlPanel) ? urlPanel : 'ask';
  const initialFence = urlFence !== null ? urlFence : activeFiles[0].fenceId;

  const [file, setFileState] = useState(initialFile);
  const [line, setLineState] = useState(initialLine);
  const [panel, setPanelState] = useState(initialPanel);
  const [fenceId, setFenceIdState] = useState(initialFence);

  useEffect(() => {
    if (urlFile && urlFile !== file) {
      setFileState(urlFile);
    }
    if (urlLine) {
      const parsed = parseInt(urlLine, 10);
      if (Number.isInteger(parsed) && parsed > 0 && parsed !== line) {
        setLineState(parsed);
      }
    }
    if (urlPanel && ['fence', 'why', 'ask'].includes(urlPanel) && urlPanel !== panel) {
      setPanelState(urlPanel);
    }
    if (urlFence !== null && urlFence !== fenceId) {
      setFenceIdState(urlFence);
    }
  }, [urlFile, urlLine, urlPanel, urlFence]);

  const updateParams = useCallback(
    (newFile, newLine, newPanel, newFence) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('file', newFile);
      nextParams.set('line', String(newLine));
      nextParams.set('panel', newPanel);
      if (newFence) {
        nextParams.set('fence', newFence);
      } else {
        nextParams.delete('fence');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const applyLoadedRepo = useCallback((loadedRepo) => {
    if (!loadedRepo) return;
    setRepoContext(loadedRepo);
    const files =
      loadedRepo.files && loadedRepo.files.length > 0 ? loadedRepo.files : DEMO_FILES;
    const firstDoc = files[0];
    if (firstDoc) {
      setFileState(firstDoc.path);
      setLineState(firstDoc.defaultLine || 1);
      setFenceIdState(firstDoc.fenceId || null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/github/current')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.repo) {
          setRepoContext(data.repo);
        }
      })
      .catch(() => {});

    const handleGlobalRepoUpdate = (e) => {
      if (e.detail?.repo) {
        applyLoadedRepo(e.detail.repo);
      }
    };
    window.addEventListener('whyline-repo-updated', handleGlobalRepoUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('whyline-repo-updated', handleGlobalRepoUpdate);
    };
  }, [applyLoadedRepo]);

  const loadGitHubRepo = async (repoUrl) => {
    if (!repoUrl || !String(repoUrl).trim()) return null;
    setRepoLoading(true);
    try {
      const resp = await fetch('/api/github/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: String(repoUrl).trim() }),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data?.repo) {
        applyLoadedRepo(data.repo);
        window.dispatchEvent(
          new CustomEvent('whyline-repo-updated', { detail: { repo: data.repo } })
        );
        return data.repo;
      }
    } catch {
      // ignore error
    } finally {
      setRepoLoading(false);
    }
    return null;
  };

  const addQaHistoryEntry = useCallback((entry) => {
    if (!entry || !entry.question || !entry.response) return;
    setQaHistory((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
            item.question.toLowerCase() === entry.question.toLowerCase() &&
            item.repoFullName === entry.repoFullName &&
            item.language === entry.language
          )
      );
      const next = [
        {
          id: `qa-${Date.now()}`,
          question: entry.question,
          repoFullName: entry.repoFullName || 'HealthConnect/payment-gateway-v1',
          language: entry.language || 'en-IN',
          timestamp: 'Just now',
          response: entry.response,
          sttTelemetry: entry.sttTelemetry || null,
        },
        ...filtered,
      ].slice(0, 12);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(QA_HISTORY_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore storage error
      }
      return next;
    });
  }, []);

  const clearQaHistory = useCallback(() => {
    setQaHistory([]);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(QA_HISTORY_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const selectFile = (newFilePath) => {
    const targetDoc = activeFiles.find((f) => f.path === newFilePath) || activeFiles[0];
    const targetLine = targetDoc.defaultLine || 1;
    const targetFence = targetDoc.fenceId || null;
    setFileState(targetDoc.path);
    setLineState(targetLine);
    setFenceIdState(targetFence);
    updateParams(targetDoc.path, targetLine, panel, targetFence);
  };

  const selectLine = (newLine, newFenceId = null) => {
    if (!Number.isInteger(newLine) || newLine <= 0) return;
    setLineState(newLine);
    setFenceIdState(newFenceId);
    updateParams(file, newLine, panel, newFenceId);
  };

  const setPanel = (newPanel) => {
    if (!['fence', 'why', 'ask'].includes(newPanel)) return;
    setPanelState(newPanel);
    updateParams(file, line, newPanel, fenceId);
  };

  const selectLocation = ({ file: f, line: l, fenceId: id, panel: p }) => {
    const nextF = f || file;
    const nextL = Number.isInteger(l) && l > 0 ? l : line;
    const nextP = p || panel;
    const nextId = id !== undefined ? id : fenceId;

    setFileState(nextF);
    setLineState(nextL);
    setPanelState(nextP);
    setFenceIdState(nextId);
    updateParams(nextF, nextL, nextP, nextId);
  };

  const activeDoc = activeFiles.find((f) => f.path === file) || activeFiles[0];

  return (
    <WorkbenchContext.Provider
      value={{
        file,
        line,
        panel,
        fenceId,
        activeDoc,
        demoFiles: activeFiles,
        repoContext,
        repoLoading,
        loadGitHubRepo,
        selectFile,
        selectLine,
        setPanel,
        selectLocation,
        currentQuery,
        setCurrentQuery,
        latestResponse,
        setLatestResponse,
        latestSttTelemetry,
        setLatestSttTelemetry,
        latestAudioUrl,
        setLatestAudioUrl,
        cacheTelemetry,
        setCacheTelemetry,
        qaHistory,
        addQaHistoryEntry,
        clearQaHistory,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
}

export function useWorkbenchSelection() {
  const ctx = useContext(WorkbenchContext);
  if (!ctx) {
    throw new Error('useWorkbenchSelection must be used within a WorkbenchProvider');
  }
  return ctx;
}
