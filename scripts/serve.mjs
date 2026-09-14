import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
export function createServer(root = projectRoot) {
  return http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const file = path.resolve(root, relative);
      const inside = path.relative(root, file);
      const allowed = relative === 'index.html' || ['pages/', 'css/', 'js/', 'assets/'].some(prefix => relative.startsWith(prefix));
      if (!allowed || inside.startsWith('..') || path.isAbsolute(inside)) { res.writeHead(403).end('Forbidden'); return; }
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createServer();
  server.listen(Number(process.env.PORT) || 5500, '127.0.0.1', () => console.log('Dashly is ready at http://localhost:' + server.address().port));
}
