import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

await build({
  root,
  build: {
    ssr: path.resolve(root, 'src/logic/verifyAllExperiments.ts'),
    outDir: path.resolve(root, 'dist-test'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'verify.mjs',
        format: 'es',
      },
    },
  },
  configFile: false,
});

console.log('\nRunning bundled test runner...\n');
await import('./dist-test/verify.mjs');
