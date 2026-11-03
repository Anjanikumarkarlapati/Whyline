import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildGeminiCodebasePrompt,
  buildReasonedCodebaseExplanation,
} from './src/utils/codebaseReasoning.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.post('/api/gemini/explain-codebase', async (req, res) => {
    const startTime = Date.now();
    const {
      question = '',
      repo_slug = 'Anjanikumarkarlapati/Whyline',
      fence_id = 'FENCE-001',
      language = 'en-IN',
      code_context = '',
    } = req.body || {};

    const { bcp47, systemInstruction, prompt } = buildGeminiCodebasePrompt({
      question,
      repoSlug: repo_slug,
      fenceId: fence_id,
      language,
      codeContext: code_context,
    });

    const fallback = buildReasonedCodebaseExplanation({
      question,
      fenceId: fence_id,
      language: bcp47,
      repoSlug: repo_slug,
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(200).json({
        ...fallback,
        provider: 'WhyLine Gemini Reasoning Engine (Deterministic Local Mode)',
        latency_ms: Date.now() - startTime,
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MEDIUM,
          },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              simple_explanation: {
                type: Type.STRING,
                description:
                  'A clear, beginner-friendly explanation in simple terms without just reading the raw code.',
              },
              real_world_example: {
                type: Type.STRING,
                description:
                  'A vivid everyday real-world analogy or example that makes the concept effortless to understand.',
              },
              reasoning_steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description:
                  '3 concise step-by-step reasoning points explaining why the code is written this way, what breaks if removed, and how to handle it safely.',
              },
              spoken_reply: {
                type: Type.STRING,
                description:
                  'A natural, conversational voice explanation combining the simple explanation and the real-world example in the requested language.',
              },
            },
            required: [
              'simple_explanation',
              'real_world_example',
              'reasoning_steps',
              'spoken_reply',
            ],
          },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);

      res.status(200).json({
        topic: fallback.topic,
        language: bcp47,
        reasoning_engine: 'gemini-3.8-flash (ThinkingLevel.HIGH)',
        provider: 'Google Gemini API (gemini-3.8-flash • ThinkingLevel.HIGH)',
        simple_explanation: parsed.simple_explanation || fallback.simple_explanation,
        real_world_example: parsed.real_world_example || fallback.real_world_example,
        reasoning_steps:
          Array.isArray(parsed.reasoning_steps) && parsed.reasoning_steps.length > 0
            ? parsed.reasoning_steps
            : fallback.reasoning_steps,
        spoken_reply: parsed.spoken_reply || fallback.spoken_reply,
        latency_ms: Date.now() - startTime,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(200).json({
        ...fallback,
        provider: 'WhyLine Gemini Reasoning Engine (Resilient Mode)',
        gemini_notice: errMsg,
        latency_ms: Date.now() - startTime,
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`WhyLine Studio server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
