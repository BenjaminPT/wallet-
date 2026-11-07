// Сборка: src/main.js -> dist/app.js (один IIFE), копирование public/ -> dist/,
// плюс dist/single.html — весь кошелёк в одном файле (открывается двойным кликом).
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const BUILD = (process.env.GITHUB_SHA || '').slice(0, 7) || Date.now().toString(36);

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
  define: { global: 'globalThis', 'process.env.NODE_ENV': '"production"', BUILD_ID: JSON.stringify(BUILD) },
  jsx: 'transform',
  legalComments: 'none',
  logLevel: 'info',
});

cpSync('public', 'dist', { recursive: true });

// версия для кэша сервис-воркера
const stamp = BUILD;
const swPath = 'dist/sw.js';
writeFileSync(swPath, readFileSync(swPath, 'utf8').replace('__BUILD__', stamp));

// SRI + версия в URL (чтобы устаревший кэш не ломал проверку целостности)
const sri = (f) => 'sha384-' + createHash('sha384').update(readFileSync(f)).digest('base64');
const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
let html = readFileSync('dist/index.html', 'utf8');
const css = readFileSync('dist/style.css', 'utf8');
const js = readFileSync('dist/app.js', 'utf8').replace(/<\/script>/g, '<\\/script>');
const hosted = html
  .replace('<link rel="stylesheet" href="style.css">', `<link rel="stylesheet" href="style.css?v=${stamp}" integrity="${sri('dist/style.css')}">`)
  .replace('<script src="app.js"></script>', `<script src="app.js?v=${stamp}" integrity="${sri('dist/app.js')}"></script>`);
writeFileSync('dist/index.html', hosted);
writeFileSync('dist/version.json', JSON.stringify({ build: stamp, appSha256: sha256('dist/app.js') }, null, 1));

// автономный файл: всё внутри, поэтому разрешаем inline-скрипт (CSP остаётся строгой по сетям)
const single = html
  .replace('script-src \'self\'', "script-src 'unsafe-inline'")
  .replace(/<link rel="stylesheet" href="style.css">/, () => `<style>${css}</style>`)
  .replace(/<script src="app.js"><\/script>/, () => `<script>${js}</script>`)
  .replace(/<link rel="manifest"[^>]*>/, '');
writeFileSync('dist/single.html', single);
console.log('build ok', stamp, sha256('dist/app.js'));
