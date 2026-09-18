/**
 * エージェント側の x402 クライアント
 *
 * 重要な点: **支払先は実行時に初めて分かる。** 402 の中に入って返ってくる。
 * 事前に人間が承認しておくことができないので、ブローカーのポリシーで判定する。
 * エージェント（LLM）は口座の鍵を一切持たない。
 */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const unb64 = (s) => JSON.parse(Buffer.from(s, 'base64').toString('utf8'));

/**
 * @param {string} url      叩きたい有料API
 * @param {object} broker   LeashBroker のインスタンス
 * @param {string} agentName ポリシー上のエージェント名
 */
export async function fetchWithPayment(url, broker, agentName) {
  const first = await fetch(url);
  if (first.status !== 402) {
    return { paid: false, status: first.status, data: await first.json().catch(() => null) };
  }

  // 402 から支払い要求を読む
  const header = first.headers.get('PAYMENT-REQUIRED');
  const reqs = header ? unb64(header) : await first.json();
  const accepted = reqs.accepts.find((a) => a.network?.startsWith('xrpl:') && a.asset === 'XRP');
  if (!accepted) return { paid: false, refused: 'XRP で払える選択肢が無い' };

  // ここが要点: payTo は今はじめて知った相手
  const verdict = await broker.requestPayment({
    agentName,
    payTo: accepted.payTo,
    amountDrops: accepted.amount,
  });

  if (!verdict.allow) {
    return { paid: false, refused: verdict.reason, code: verdict.code, payTo: accepted.payTo, amountDrops: accepted.amount };
  }

  // 署名済み tx を載せて再送
  const second = await fetch(url, {
    headers: {
      'PAYMENT-SIGNATURE': b64({ accepted, payload: { signedTxBlob: verdict.signedTxBlob } }),
    },
  });

  const settlementHeader = second.headers.get('PAYMENT-RESPONSE');
  const settlement = settlementHeader ? unb64(settlementHeader) : null;
  const body = await second.json().catch(() => null);

  return {
    paid: second.ok,
    status: second.status,
    data: second.ok ? body : null,
    settlement,
    // ポリシーは通ったが台帳側で失敗した場合を、拒否と区別できるようにする
    settlementError: second.ok ? null : (settlement?.errorReason ?? body?.error ?? `HTTP ${second.status}`),
    payTo: accepted.payTo,
    amountDrops: accepted.amount,
  };
}
