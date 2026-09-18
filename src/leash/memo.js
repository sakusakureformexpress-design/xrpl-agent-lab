/**
 * 支出の「理由」を台帳に残すためのメモ。
 *
 * **これは強制ではなく記録である。**
 * 台帳はメモの内容を読まないし、検証もしない
 * （https://xrpl.org/docs/references/protocol/transactions/common-fields）。
 *
 * したがってメモに書いたルールは誰も守ってくれない。
 * できるのは「あとから書き換えられない記録を残す」ことだけ。
 * その代わり、確定した取引のメモは永久に変わらない。
 *
 * 用途:
 *   - 支払いの時点で有効だったポリシーのハッシュ → 改ざん検知
 *   - どのエージェントが、どの請求に対して払ったか → 監査
 */
import crypto from 'node:crypto';

const MEMO_TYPE = 'leash/v1';
const MEMO_FORMAT = 'application/json';
const MAX_MEMO_BYTES = 1024;   // XRPL の Memos フィールドの上限

const hex = (s) => Buffer.from(s, 'utf8').toString('hex').toUpperCase();

/** ポリシーの内容から、決定的なハッシュを作る。 */
export function policyHash(policyJsonText) {
  return crypto.createHash('sha256').update(policyJsonText, 'utf8').digest('hex');
}

/**
 * 支出の理由を表すメモを組み立てる。
 *
 * @param {object} p
 * @param {string} [p.agent]     エージェント名
 * @param {string} [p.policy]    ポリシーの SHA-256（先頭16バイト＝32文字に切り詰める）
 * @param {string} [p.invoice]   x402 の invoiceId
 * @param {string} [p.resource]  支払い対象のURL
 * @returns {Array|undefined} Memos フィールドに入れる配列。中身が無ければ undefined
 */
export function buildMemo({ agent, policy, invoice, resource } = {}) {
  const body = {};
  if (agent) body.a = agent;
  if (policy) body.p = policy.slice(0, 32);     // 衝突耐性は十分。容量を節約する
  if (invoice) body.i = invoice;
  if (resource) body.r = resource;
  if (Object.keys(body).length === 0) return undefined;

  let json = JSON.stringify(body);
  // 上限を超えるなら、切り詰めてよい項目（URL）から削る
  if (Buffer.byteLength(hex(json), 'utf8') / 2 > MAX_MEMO_BYTES - 64 && body.r) {
    body.r = body.r.slice(0, 120);
    json = JSON.stringify(body);
  }

  const memo = {
    Memo: {
      MemoType: hex(MEMO_TYPE),
      MemoFormat: hex(MEMO_FORMAT),
      MemoData: hex(json),
    },
  };

  const bytes = (memo.Memo.MemoType.length + memo.Memo.MemoFormat.length + memo.Memo.MemoData.length) / 2;
  if (bytes > MAX_MEMO_BYTES) throw new Error(`メモが 1KB を超えている: ${bytes} bytes`);
  return [memo];
}

/** 台帳から読んだ Memos を元の形に戻す。壊れていても例外を投げない。 */
export function parseMemo(memos) {
  for (const m of memos ?? []) {
    try {
      const t = Buffer.from(m.Memo?.MemoType ?? '', 'hex').toString('utf8');
      if (t !== MEMO_TYPE) continue;
      const body = JSON.parse(Buffer.from(m.Memo.MemoData, 'hex').toString('utf8'));
      return { agent: body.a, policy: body.p, invoice: body.i, resource: body.r };
    } catch { /* 他人のメモ。無視する */ }
  }
  return null;
}
