import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createWhylineApiMiddleware } from '../backend-api-middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSR_DIR = path.resolve(__dirname, '..', 'node_modules', '@phosphor-icons', 'react', 'dist', 'csr');

function whylineBackendPlugin() {
  const apiMiddleware = createWhylineApiMiddleware();
  return {
    name: 'whyline-backend-api',
    enforce: 'pre',
    transform(code, id) {
      if (
        (id.endsWith('.jsx') || id.endsWith('.tsx') || id.endsWith('.js')) &&
        !id.includes('node_modules') &&
        code.includes('@phosphor-icons/react')
      ) {
        return code.replace(
          /import\s*\{([^}]+)\}\s*from\s*['"]@phosphor-icons\/react['"]\s*;?/g,
          (_match, specifiers) => {
            const parts = specifiers
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            return parts
              .map((spec) => {
                const [imported, local] = spec.split(/\s+as\s+/).map((x) => x.trim());
                const iconFile = path.join(CSR_DIR, `${imported}.es.js`);
                if (fs.existsSync(iconFile)) {
                  const alias = local ? `${imported} as ${local}` : imported;
                  return `import { ${alias} } from '${iconFile.replace(/\\/g, '/')}';`;
                }
                return `import { ${spec} } from '@phosphor-icons/react';`;
              })
              .join('\n');
          }
        );
      }
      return null;
    },
    configureServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiMiddleware);
    },
    closeBundle() {
      try {
        const srcDist = path.resolve(__dirname, 'dist');
        const rootDist = path.resolve(__dirname, '..', 'dist');
        if (fs.existsSync(srcDist)) {
          fs.cpSync(srcDist, rootDist, { recursive: true, force: true });
        }
      } catch {
        // ignore copy errors
      }
    },
  };
}

export default defineConfig({
  plugins: [whylineBackendPlugin(), react()],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
});
