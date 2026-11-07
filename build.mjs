// Сборка: src/main.js -> dist/app.js (один IIFE), копирование public/ -> dist/,
// плюс dist/single.html — весь кошелёк в одном файле (открывается двойным кликом).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'dist/app.js',
  inject: ['src/shim.js'],
  define: { global: 'globalThis', 'process.env.NODE_ENV': '"production"' },
  jsx: 'transform',
  legalComments: 'none',
  logLevel: 'info',
});

cpSync('public', 'dist', { recursive: true });

// version stamp for service worker cache busting
const stamp = Date.now().toString(36);
const swPath = 'dist/sw.js';
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD__', stamp));

// single-file build
const html = readFileSync('dist/index.html', 'utf8');
const css = readFileSync('dist/style.css', 'utf8');
const js = readFileSync('dist/app.js', 'utf8').replace(/<\/script>/g, '<\\/script>');
const single = html
  .replace(/<link rel="stylesheet" href="style.css">/, () => `<style>${css}</style>`)
  .replace(/<script src="app.js"><\/script>/, () => `<script>${js}</script>`)
  .replace(/<link rel="manifest"[^>]*>/, '')
  .replace(/<script>[^<]*serviceWorker[^<]*<\/script>/, '');
writeFileSync('dist/single.html', single);
console.log('build ok', stamp);
