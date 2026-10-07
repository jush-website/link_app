const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, timingSafeEqual } = require('node:crypto');

// Google 不接受 Electron 的內嵌登入。只在登入期間開放本機回傳端點，
// 憑證放在 POST 本文，nonce 放 URL fragment，不写入網址查詢或日誌。
function startGoogleLogin({ directory, openExternal, timeoutMs = 180000 }) {
  return new Promise((resolve, reject) => {
    const nonce = randomBytes(32).toString('hex');
    let origin;
    let settled = false;
    let timer;
    const finish = (error, credentials) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      if (error) reject(error); else resolve(credentials);
    };
    const json = (response, status, value) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(value));
    };
    const server = http.createServer((request, response) => {
      handle(request, response).catch(() => {
        if (!response.headersSent && !response.destroyed) json(response, 400, { error: 'Invalid request' });
        else response.destroy();
      });
    });
    async function handle(request, response) {
      if (request.headers.host !== new URL(origin).host) return json(response, 403, { error: 'Invalid host' });
      const pathname = new URL(request.url, origin).pathname;
      if (request.method === 'POST' && pathname === '/desktop-auth/callback') {
        const authorization = Buffer.from(request.headers.authorization ?? '');
        const expected = Buffer.from(`Bearer ${nonce}`);
        if (request.headers.origin !== origin || authorization.length !== expected.length || !timingSafeEqual(authorization, expected)) return json(response, 403, { error: 'Invalid login session' });
        if (request.headers['content-type']?.split(';')[0] !== 'application/json') return json(response, 415, { error: 'Expected JSON' });
        let bytes = 0;
        const chunks = [];
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 16384) { json(response, 413, { error: 'Payload too large' }); return; }
          chunks.push(chunk);
        }
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          const idToken = typeof body.idToken === 'string' && body.idToken.length >= 10 ? body.idToken : null;
          const accessToken = typeof body.accessToken === 'string' && body.accessToken.length >= 10 ? body.accessToken : null;
          if (!idToken && !accessToken) return json(response, 400, { error: 'Missing Google credential' });
          json(response, 200, { received: true });
          finish(null, { idToken, accessToken });
        } catch { json(response, 400, { error: 'Invalid credential response' }); }
        return;
      }
      if (request.method !== 'GET') return json(response, 405, { error: 'Method not allowed' });
      const relative = pathname === '/' ? 'desktop-login.html' : pathname.slice(1);
      if (relative !== 'desktop-login.html' && !relative.startsWith('assets/')) return json(response, 404, { error: 'Not found' });
      try {
        const root = await fs.realpath(directory);
        const file = await fs.realpath(path.resolve(root, decodeURIComponent(relative)));
        if (!file.startsWith(root + path.sep)) return json(response, 403, { error: 'Invalid path' });
        const body = await fs.readFile(file);
        const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
        response.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" });
        response.end(body);
      } catch { json(response, 404, { error: 'Not found' }); }
    }
    server.on('error', error => finish(error));
    server.listen(0, '127.0.0.1', () => {
      origin = `http://localhost:${server.address().port}`;
      timer = setTimeout(() => finish(Object.assign(new Error('Google login timed out'), { code: 'google/cancelled' })), timeoutMs);
      timer.unref();
      Promise.resolve(openExternal(`${origin}/desktop-login.html#${nonce}`)).catch(error => finish(error));
    });
  });
}

module.exports = { startGoogleLogin };
