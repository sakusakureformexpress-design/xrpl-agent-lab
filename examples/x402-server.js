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
import { decode } from 'xrpl';
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
      if (!payload?.signedTxBlob) throw new Error('signedTxBlob が無い');

      // **署名済み tx の中身を必ず検証する。**
      // accepted はクライアントが作った自己申告なので、それだけを見ても意味がない。
      // 実際に台帳へ流れる tx をデコードして、宛先と金額を自分で確かめる。
      const tx = decode(payload.signedTxBlob);
      if (tx.TransactionType !== 'Payment') throw new Error('Payment ではない');
      if (tx.Destination !== payTo) throw new Error(`宛先が自分宛でない: ${tx.Destination}`);
      if (typeof tx.Amount !== 'string') throw new Error('XRP 建てではない');
      if (BigInt(tx.Amount) < BigInt(priceDrops)) {
        throw new Error(`金額が不足: ${tx.Amount} < ${priceDrops}`);
      }

      const settled = await submitAndWait(payload.signedTxBlob);
      if (!settled.validated || settled.result !== 'tesSUCCESS') {
        const body = { success: false, errorReason: settled.result, transaction: settled.hash ?? '', network: 'xrpl:1' };
        res.writeHead(402, { 'content-type': 'application/json', 'PAYMENT-RESPONSE': b64(body) })
           .end(JSON.stringify(body));
        return;
      }

      const onLedger = await rpc('tx', { transaction: settled.hash });
      const body = {
        success: true, transaction: settled.hash, network: 'xrpl:1',
        payer: onLedger.Account ?? onLedger.tx_json?.Account,
      };
      res.writeHead(200, { 'content-type': 'application/json', 'PAYMENT-RESPONSE': b64(body) })
         .end(JSON.stringify({ symbol: 'XRP/USD', price: 3.41, volume24h: 1284000000, asOf: new Date().toISOString() }));
    } catch (e) {
      // 内部の詳細（RPC のエラー文など）はそのまま返さない。
      // 支払い側に必要なのは「受け付けられなかった」ことだけ。
      console.error('[merchant]', e.message);
      res.writeHead(400, { 'content-type': 'application/json' })
         .end(JSON.stringify({ error: 'payment_rejected' }));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}
