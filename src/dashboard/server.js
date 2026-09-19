/**
 * ダッシュボードを配る HTTP サーバ。
 *
 * 設計上の約束:
 *   - **鍵を持たない。** 起動に必要なのは公開アドレスとポリシーのパスだけ
 *   - **書き込む口が無い。** GET 以外は受けない。予算枠を閉じる操作は CLI に残す
 *   - **127.0.0.1 にしか bind しない。** 認証を持たないため、外に出してはいけない
 *   - **Host ヘッダを検証する。** これが無いと DNS リバインディングで、
 *     悪意あるページが利用者のブラウザ経由でこの API を読める
 */
import http from 'node:http';
import { collect } from './data.js';
import { renderPage } from './render.js';

/** localhost を指す Host だけ通す。DNS リバインディング対策。 */
export function isLocalHost(hostHeader) {
  if (typeof hostHeader !== 'string' || !hostHeader) return false;
  // IPv6 は [::1]:port の形で来る
  const host = hostHeader.startsWith('[')
    ? hostHeader.slice(0, hostHeader.indexOf(']') + 1)
    : hostHeader.split(':')[0];
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * @param {object} p
 * @param {string} p.ownerAddress 予算の持ち主の公開アドレス
 * @param {string} [p.policyPath]
 * @param {string} [p.statePath]
 * @param {number} [p.port]
 * @param {string} [p.host] 既定は 127.0.0.1。変更は自己責任
 */
export function createServer({ ownerAddress, policyPath, statePath }) {
  const snapshot = () => collect({ ownerAddress, policyPath, statePath });

  return http.createServer(async (req, res) => {
    const send = (code, type, body) => {
      res.writeHead(code, {
        'content-type': type,
        'cache-control': 'no-store',
        // 読み取り専用の内部画面。外部資源の読み込みはフォントだけ
        'content-security-policy':
          "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src https://fonts.gstatic.com; script-src 'unsafe-inline'; connect-src 'self'",
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      res.end(body);
    };

    if (req.method !== 'GET') return send(405, 'text/plain; charset=utf-8', 'GET のみ');
    if (!isLocalHost(req.headers.host)) {
      return send(403, 'text/plain; charset=utf-8', 'localhost からのみ利用できます');
    }

    const path = (req.url ?? '/').split('?')[0];
    try {
      if (path === '/api/snapshot') {
        return send(200, 'application/json; charset=utf-8', JSON.stringify(await snapshot()));
      }
      if (path === '/' || path === '/index.html') {
        return send(200, 'text/html; charset=utf-8', renderPage(await snapshot(), { live: true }));
      }
      return send(404, 'text/plain; charset=utf-8', 'not found');
    } catch (e) {
      // 例外の中身に鍵は入らない（このプロセスは鍵を持たない）
      return send(500, 'text/plain; charset=utf-8', `取得に失敗: ${e.message}`);
    }
  });
}

/** サーバを起動して待ち受け URL を返す。 */
export function start({ ownerAddress, policyPath, statePath, port = 7788, host = '127.0.0.1' }) {
  const server = createServer({ ownerAddress, policyPath, statePath });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve({ server, url: `http://${host}:${server.address().port}/` }));
  });
}
