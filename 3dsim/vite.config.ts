import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'path';
import { slicerBridgePlugin } from './server/slicerPlugin.ts';

function orcaWorkerManifestPlugin(): Plugin {
  return {
    name: 'orca-worker-manifest',
    writeBundle(outputOptions, bundle) {
      const outDir = outputOptions.dir || path.resolve(import.meta.dirname, '../public/3dsim');
      const assetFile = Object.keys(bundle).find(
        (fileName) => fileName.includes('slicer.worker') && fileName.endsWith('.js')
      );
      let workerUrl = assetFile ? `/3dsim/${assetFile.replace(/^\/+/, '')}` : null;
      if (!workerUrl && fs.existsSync(path.join(outDir, 'assets'))) {
        const found = fs
          .readdirSync(path.join(outDir, 'assets'))
          .find((f) => f.startsWith('slicer.worker') && f.endsWith('.js'));
        if (found) workerUrl = `/3dsim/assets/${found}`;
      }
      if (workerUrl) {
        fs.writeFileSync(
          path.join(outDir, 'orca-worker-manifest.json'),
          JSON.stringify({ workerUrl, generatedAt: new Date().toISOString() }, null, 2),
          'utf8'
        );
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/3dsim/',
  plugins: [react(), tailwindcss(), slicerBridgePlugin(), orcaWorkerManifestPlugin()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      'lucide-react': path.resolve(import.meta.dirname, './src/components/icons/MinimalIcons.tsx'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    outDir: process.env.VERCEL ? 'dist' : '../public/3dsim',
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    cors: true,
    proxy: {
      '/api/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/wallet': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/knowledge': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: ['**/temp_**/**', '**/*.gcode', '**/*.3mf', '**/result.json'],
    },
  },
});
