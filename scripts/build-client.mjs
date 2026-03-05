import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const clientOutputDir = resolve(process.env.CLIENT_PATH || 'dist/client');

mkdirSync(clientOutputDir, { recursive: true });

await build({
  entryPoints: ['src/client/index.ts'],
  bundle: true,
  splitting: true,
  format: 'esm',
  outdir: clientOutputDir,
  sourcemap: true,
});

await build({
  entryPoints: ['src/client/shared-websocket-worker.ts'],
  bundle: true,
  format: 'esm',
  outfile: resolve(clientOutputDir, 'shared-websocket-worker.js'),
  sourcemap: true,
});

cpSync('src/client/index.html', resolve(clientOutputDir, 'index.html'));
cpSync('src/client/styles.css', resolve(clientOutputDir, 'styles.css'));
cpSync('src/client/sounds', resolve(clientOutputDir, 'sounds'), { recursive: true });
cpSync('src/client/images', resolve(clientOutputDir, 'images'), { recursive: true });

console.log(`Client build output: ${clientOutputDir}`);
