/* 보금 — 로컬 개발 서버: 정적 파일 + /api/ai (Vercel 함수와 같은 핸들러) */
const http = require('http');
const fs = require('fs');
const path = require('path');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch (e) { /* .env 없으면 AI만 비활성 */ }
const ai = require('./api/ai');

const PORT = +process.env.PORT || 5180;
const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/ai') {
    if (req.method === 'POST') {
      const parts = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 128 * 1024) { res.statusCode = 413; return res.end(); } parts.push(c); }
      try { req.body = JSON.parse(Buffer.concat(parts).toString('utf8') || '{}'); } catch (e) { req.body = null; }
    }
    return ai(req, res);
  }
  // 점(.)으로 시작하는 경로(.env 등)와 서버 소스는 내보내지 않는다
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  if (rel.split('/').some((p) => p.startsWith('.')) || /^(server\.js|api\/|supabase\/)/.test(rel)) { res.statusCode = 404; return res.end('Not found'); }
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  });
}).listen(PORT, () => console.log(`보금 → http://localhost:${PORT}`));
