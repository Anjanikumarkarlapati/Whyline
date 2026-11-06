import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWhylineApiMiddleware } from './backend-api-middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ROOT = path.resolve(__dirname, 'frontend');
const DIST_DIR = path.join(FRONTEND_ROOT, 'dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
};

const apiMiddleware = createWhylineApiMiddleware();

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: FRONTEND_ROOT,
      server: {
        middlewareMode: true,
        hmr: false,
        fs: {
          allow: [path.resolve(__dirname)],
        },
      },
      appType: 'spa',
    });

    const server = http.createServer((req, res) => {
      apiMiddleware(req, res, () => {
        vite.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end('Not Found');
        });
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`WhyLine Studio dev server running at http://0.0.0.0:${PORT}`);
    });
    return;
  }

  const server = http.createServer((req, res) => {
    apiMiddleware(req, res, () => {
      const urlObj = new URL(req.url || '/', `http://localhost:${PORT}`);
      let relPath = decodeURIComponent(urlObj.pathname);
      if (relPath === '/') relPath = '/index.html';

      const candidate = path.join(DIST_DIR, relPath);
      if (candidate.startsWith(DIST_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        const ext = path.extname(candidate).toLowerCase();
        res.statusCode = 200;
        res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
        fs.createReadStream(candidate).pipe(res);
        return;
      }

      const indexHtml = path.join(DIST_DIR, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        fs.createReadStream(indexHtml).pipe(res);
        return;
      }

      res.statusCode = 404;
      res.end('Not Found');
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`WhyLine Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
