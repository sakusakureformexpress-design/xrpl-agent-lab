/**
 * 有料APIサーバ（x402 の merchant 側）
 *
 * XRPL の x402 スキームに沿う:
 *   402 と一緒に PAYMENT-REQUIRED（base64 JSON）を返す
 *   クライアントは PAYMENT-SIGNATURE（base64 JSON、payload.signedTxBlob）で再送
 *   サーバは PAYMENT-RESPONSE（base64 JSON）で決済結果を返す
 *
 * 参考: https://xrpl-x402.t54.ai/docs/xrpl-scheme
 */
import http from 'node:http';
import { submitAndWait, rpc } from '../src/lib/rpc.js';

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const unb64 = (s) => JSON.parse(Buffer.from(s, 'base64').toString('utf8'));

export function startMerchant({ payTo, priceDrops = '20000', port = 0 }) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname !== '/market-data') {
      res.writeHead(404).end('not found');
      return;
    }

    const sig = req.headers['payment-signature'];

    // ── 支払いが無い → 402 と要求内容 ────────────────────
    if (!sig) {
      const requirements = {
        x402Version: 1,
        error: 'Payment required to access this resource',
        accepts: [{
          scheme: 'exact',
          network: 'xrpl:1',                       // XRPL Testnet
          asset: 'XRP',
          payTo,
          amount: priceDrops,                      // drops
          maxTimeoutSeconds: 60,
          resource: `http://${req.headers.host}/market-data`,
          description: 'Premium market data',
          mimeType: 'application/json',
          extra: { invoiceId: 'INV-' + Date.now(), sourceTag: 0 },
        }],
      };
      res.writeHead(402, {
        'content-type': 'application/json',
        'PAYMENT-REQUIRED': b64(requirements),
      }).end(JSON.stringify(requirements));
      return;
    }

    // ── 支払いあり → 検証して決済 ───────────────────────
    try {
      const { accepted, payload } = unb64(sig);
      if (accepted?.payTo !== payTo) throw new Error('payTo が一致しない');
      if (!payload?.signedTxBlob) throw new Error('signedTxBlob が無い');

      const settled = await submitAndWait(payload.signedTxBlob);
      if (settled.result !== 'tesSUCCESS') {
        const body = { success: false, errorReason: settled.result, transaction: settled.hash ?? '', network: 'xrpl:1' };
        res.writeHead(402, { 'content-type': 'application/json', 'PAYMENT-RESPONSE': b64(body) })
           .end(JSON.stringify(body));
        return;
      }

      const tx = await rpc('tx', { transaction: settled.hash });
      const body = { success: true, transaction: settled.hash, network: 'xrpl:1', payer: tx.Account ?? tx.tx_json?.Account };
      res.writeHead(200, { 'content-type': 'application/json', 'PAYMENT-RESPONSE': b64(body) })
         .end(JSON.stringify({ symbol: 'XRP/USD', price: 3.41, volume24h: 1284000000, asOf: new Date().toISOString() }));
    } catch (e) {
      res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
