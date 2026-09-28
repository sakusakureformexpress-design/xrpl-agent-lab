/**
 * 伝票の金額計算。**浮動小数点を通さない。**
 *
 * XRP の金額を Number で足すと 0.1 + 0.2 = 0.30000000000000004 になり、
 * 7桁目以降の端数で xrpToDrops が例外を投げる、または上限の判定がずれる。
 * ここでは全て drops（1 XRP = 1,000,000 drops）の BigInt で計算する。
 */
const XRP_RE = /^(0|[1-9]\d*)(\.\d{1,6})?$/;

/** XRP の10進文字列を drops（BigInt）にする。形式が不正なら null。 */
export function xrpToDropsBig(xrp) {
  const s = String(xrp);
  if (!XRP_RE.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return BigInt(whole) * 1000000n + BigInt((frac + '000000').slice(0, 6));
}

/** drops（BigInt）を XRP の10進文字列にする。末尾の0は落とす。 */
export function dropsToXrpStr(drops) {
  const whole = drops / 1000000n;
  const frac = (drops % 1000000n).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

/**
 * 次に発行する伝票の累計額を決める。純粋関数。
 *
 * 伝票は「このチャネルから累計でいくら」を表す。基準は、台帳で換金済みの額と
 * 発行済みで未換金の最大額のうち大きい方（未換金の伝票を小さい額で上書きしないため）。
 *
 * @param {object} p
 * @param {string} p.spentDrops   台帳で換金済みの額（drops の10進文字列）
 * @param {string} p.capDrops     チャネルの上限（drops の10進文字列）
 * @param {bigint} [p.issuedDrops] 発行済みで最大の累計額
 * @param {string} p.amountXrp    今回払う額
 * @returns {{ok:true, cumulativeDrops:bigint, cumulativeXrp:string, remainingXrp:string}
 *          | {ok:false, reason:string}}
 */
export function nextVoucher({ spentDrops, capDrops, issuedDrops = 0n, amountXrp }) {
  const amount = xrpToDropsBig(amountXrp);
  if (amount === null) return { ok: false, reason: 'amountXrp must be a decimal XRP amount with at most 6 decimal places, e.g. "0.5".' };
  if (amount <= 0n) return { ok: false, reason: 'amountXrp must be greater than zero.' };

  if (!/^\d+$/.test(String(spentDrops)) || !/^\d+$/.test(String(capDrops))) {
    return { ok: false, reason: 'Could not read the budget amounts from the ledger.' };
  }
  const spent = BigInt(spentDrops);
  const cap = BigInt(capDrops);

  const base = spent > issuedDrops ? spent : issuedDrops;
  const cumulative = base + amount;
  if (cumulative > cap) {
    return {
      ok: false,
      reason: `Refused: this would bring the total drawn to ${dropsToXrpStr(cumulative)} XRP, above the ` +
              `${dropsToXrpStr(cap)} XRP cap (${dropsToXrpStr(issuedDrops)} XRP already authorized but not yet ` +
              `redeemed). The ledger would reject it with tecUNFUNDED_PAYMENT.`,
    };
  }
  return {
    ok: true,
    cumulativeDrops: cumulative,
    cumulativeXrp: dropsToXrpStr(cumulative),
    remainingXrp: dropsToXrpStr(cap - cumulative),
  };
}
