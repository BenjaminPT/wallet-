// Мини-сервер без зависимостей: раздаёт папку с кошельком.
// node server.mjs [--port 8080] [--lan] [--dir ./app]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join, extname, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const PORT = Number(arg('--port', process.env.PORT || 8080));
const LAN = process.argv.includes('--lan') || process.env.LAN === '1';
const exists = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const ROOT = resolve(arg('--dir', [join(here, 'app'), join(here, '..', 'dist')].find(exists) || join(here, 'app')));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    let target = file;
    try { if (!(await stat(target)).isFile()) throw 0; } catch { target = join(ROOT, 'index.html'); }
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target)] || 'application/octet-stream',
      'cache-control': target.endsWith('sw.js') ? 'no-cache' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end('error'); }
}).listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`\n  Noir Wallet запущен\n  На этом компьютере:  http://localhost:${PORT}`);
  if (LAN) {
    for (const l of Object.values(networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log(`  В вашей сети:        http://${l.address}:${PORT}  (без HTTPS кошелёк на телефоне не заработает, используйте туннель)`);
  }
  console.log('  Остановить: Ctrl+C\n');
});
