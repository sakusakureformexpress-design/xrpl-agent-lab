/**
 * ダッシュボードの数字を組み立てる層。
 *
 * 設計上の約束:
 *   - **鍵を一切扱わない。** 引数は公開アドレスとファイルパスだけ
 *   - 台帳から読むのは公開情報のみ（account_channels / account_info / account_tx）
 *   - 加工は純粋関数に分け、I/O は collect() にだけ置く（テスト可能にするため）
 *
 * このファイルが答える問いはひとつ:
 * **「いまエージェントが動かせる上限はいくらで、それを誰が強制しているのか」**
 */
import fs from 'node:fs';
import { rpc } from '../lib/rpc.js';
import { LEASH_SOURCE_TAG } from '../leash/constants.js';
import { parseMemo } from '../leash/memo.js';

const DROPS_PER_XRP = 1000000n;

/** drops(文字列/BigInt) を XRP の文字列にする。丸めない。 */
export function dropsToXrpString(drops) {
  const n = BigInt(drops);
  const neg = n < 0n;
  const a = neg ? -n : n;
  const whole = a / DROPS_PER_XRP;
  const frac = (a % DROPS_PER_XRP).toString().padStart(6, '0').replace(/0+$/, '');
  return `${neg ? '-' : ''}${whole}${frac ? '.' + frac : ''}`;
}

/** 0〜100 の消化率。上限 0 は 0% とする（0除算を避ける）。 */
export function usedPercent(spentDrops, capDrops) {
  const cap = BigInt(capDrops);
  if (cap === 0n) return 0;
  return Number((BigInt(spentDrops) * 10000n) / cap) / 100;
}

/**
 * 消化率から深刻度を返す。メーターの色はここだけが決める。
 * 色そのものは返さない（表示層の責務）。
 */
export function severityOf(percent, { expired = false } = {}) {
  if (expired) return 'expired';
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'warning';
  return 'normal';
}

/**
 * account_channels の結果を、台帳が強制している予算枠の一覧にする。
 *
 * @param {object[]} channels rippled の channels 配列
 * @param {number} [nowMs]    期限判定の基準時刻
 */
export function budgetRows(channels, nowMs = Date.now()) {
  return (channels ?? []).map((c) => {
    const cap = BigInt(c.amount);
    const spent = BigInt(c.balance);
    const remaining = cap - spent;
    // XRPL のタイムスタンプは 2000-01-01 起点
    const expiresAtMs = c.cancel_after ? (c.cancel_after + 946684800) * 1000 : null;
    const expiringAtMs = c.expiration ? (c.expiration + 946684800) * 1000 : null;
    const effectiveExpiry = [expiresAtMs, expiringAtMs].filter((x) => x != null).sort((a, b) => a - b)[0] ?? null;
    const expired = effectiveExpiry != null && effectiveExpiry <= nowMs;
    const percent = usedPercent(spent, cap);
    return {
      channelId: c.channel_id,
      payee: c.destination_account,
      agentPublicKey: c.public_key_hex ?? null,
      capDrops: cap.toString(),
      spentDrops: spent.toString(),
      remainingDrops: remaining.toString(),
      capXrp: dropsToXrpString(cap),
      spentXrp: dropsToXrpString(spent),
      remainingXrp: dropsToXrpString(remaining),
      percent,
      severity: severityOf(percent, { expired }),
      expiresAt: effectiveExpiry ? new Date(effectiveExpiry).toISOString() : null,
      expired,
      settleDelaySec: c.settle_delay ?? null,
    };
  });
}

/**
 * ブローカーのポリシーと当日状態から、エージェント単位の消化状況を作る。
 *
 * **ここで出す数字はソフトウェアが強制しているものである。**
 * 状態ファイルを書き換えられる者はこの上限を無効化できる。表示層でそう明示する。
 *
 * @param {object} policy   ポリシー JSON
 * @param {object} stateAll 状態ファイル全体（`agent:YYYY-MM-DD` がキー）
 * @param {string} today    ISO の日付
 */
export function agentRows(policy, stateAll, today) {
  const agents = policy?.agents ?? {};
  return Object.keys(agents).map((name) => {
    const limits = agents[name]?.limits ?? {};
    const state = stateAll?.[`${name}:${today}`] ?? { spentDrops: '0', payees: [] };
    const capDrops = limits.dailyTotalMaxDrops != null ? String(limits.dailyTotalMaxDrops) : null;
    const percent = capDrops ? usedPercent(state.spentDrops, capDrops) : 0;
    return {
      name,
      spentDrops: String(state.spentDrops ?? '0'),
      spentXrp: dropsToXrpString(state.spentDrops ?? '0'),
      dailyCapDrops: capDrops,
      dailyCapXrp: capDrops ? dropsToXrpString(capDrops) : null,
      perPaymentMaxXrp: limits.perPaymentMaxDrops != null ? dropsToXrpString(limits.perPaymentMaxDrops) : null,
      percent,
      severity: capDrops ? severityOf(percent) : 'normal',
      payeesToday: state.payees ?? [],
      newPayeesPerDay: limits.newPayeesPerDay ?? null,
      alwaysAllow: agents[name]?.payees?.alwaysAllow ?? [],
      denyList: agents[name]?.payees?.denyList ?? [],
      autoApprove: agents[name]?.payees?.autoApprove === true,
      allowedDomains: agents[name]?.payees?.domains?.allowed ?? [],
      requireVerifiedDomain: agents[name]?.payees?.domains?.requireVerified === true,
    };
  });
}

/**
 * account_tx の結果から、本ツール経由の取引だけを抜き出す。
 *
 * rippled の API v1 は `tx`、v2 は `tx_json` に入れてくる。両方受ける。
 * SourceTag が一致するものだけを残すので、同じ口座の他の取引は混ざらない。
 */
export function activityRows(transactions, { sourceTag = LEASH_SOURCE_TAG, account = null, accounts = null, limit = 25 } = {}) {
  // account（単一）と accounts（複数）のどちらでも受ける。自分側かどうかの判定にしか使わない
  const mine = new Set([...(accounts ?? []), ...(account ? [account] : [])].filter(Boolean));
  const out = [];
  for (const entry of transactions ?? []) {
    const tx = entry.tx_json ?? entry.tx ?? entry;
    if (!tx || tx.SourceTag !== sourceTag) continue;
    const result = entry.meta?.TransactionResult ?? entry.metaData?.TransactionResult ?? null;
    // **他人のメモは描画しない。** 台帳のメモ欄は誰でも書ける領域であり、
    // 画面に出す理由が無い。自分たちの MemoType のものだけを構造化して取る。
    const leash = parseMemo(tx.Memos);
    const foreignMemos = (tx.Memos ?? []).length - (leash ? 1 : 0);
    const dateMs = tx.date != null ? (tx.date + 946684800) * 1000 : (entry.close_time_iso ? Date.parse(entry.close_time_iso) : null);
    out.push({
      hash: entry.hash ?? tx.hash ?? null,
      type: tx.TransactionType,
      account: tx.Account ?? null,
      destination: tx.Destination ?? null,
      // 自分が出したものか、受け取ったものか
      direction: mine.size === 0 ? null : (mine.has(tx.Account) ? 'out' : 'in'),
      amountDrops: typeof tx.Amount === 'string' ? tx.Amount : null,
      amountXrp: typeof tx.Amount === 'string' ? dropsToXrpString(tx.Amount) : null,
      result,
      // tec* は「台帳に載ったが失敗した」= 拒否の証拠として重要
      rejected: typeof result === 'string' && !result.startsWith('tes'),
      ledgerIndex: entry.ledger_index ?? tx.ledger_index ?? null,
      at: dateMs ? new Date(dateMs).toISOString() : null,
      channel: tx.Channel ?? null,
      // invoice / resource は相手のサーバ由来。描画は textContent 限定
      leash: leash ? { agent: leash.agent ?? null, policy: leash.policy ?? null, invoice: leash.invoice ?? null, resource: leash.resource ?? null } : null,
      foreignMemos: foreignMemos > 0 ? foreignMemos : 0,
    });
  }
  // 複数の口座から集めるので、ここで新しい順に並べ直してから切る
  out.sort((a, b) => (Date.parse(b.at ?? 0) || 0) - (Date.parse(a.at ?? 0) || 0));
  return out.slice(0, limit);
}

/** 表の見出しに出す合計。台帳が強制する分とソフトウェアが強制する分を**混ぜない**。 */
export function totals({ budgets, brokerBalanceDrops, ownerBalanceDrops }) {
  const ledgerEnforced = budgets
    .filter((b) => !b.expired)
    .reduce((a, b) => a + BigInt(b.remainingDrops), 0n);
  const software = brokerBalanceDrops != null ? BigInt(brokerBalanceDrops) : null;
  const reachable = ledgerEnforced + (software ?? 0n);
  return {
    ledgerEnforcedDrops: ledgerEnforced.toString(),
    ledgerEnforcedXrp: dropsToXrpString(ledgerEnforced),
    softwareEnforcedDrops: software?.toString() ?? null,
    softwareEnforcedXrp: software != null ? dropsToXrpString(software) : null,
    reachableDrops: reachable.toString(),
    reachableXrp: dropsToXrpString(reachable),
    ownerBalanceXrp: ownerBalanceDrops != null ? dropsToXrpString(ownerBalanceDrops) : null,
    budgetCount: budgets.filter((b) => !b.expired).length,
    expiredCount: budgets.filter((b) => b.expired).length,
  };
}

/** 口座残高を drops で返す。存在しない口座は null（エラーにしない）。 */
async function balanceDrops(address) {
  if (!address) return null;
  try {
    const r = await rpc('account_info', { account: address, ledger_index: 'validated' });
    return r.account_data?.Balance ?? null;
  } catch {
    return null;   // 未作成の口座は台帳に存在しない。異常ではない
  }
}

function readJsonOrNull(path) {
  if (!path) return null;
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    // 壊れたファイルを「空」として扱わない。上限が 0 に見えてしまう
    return { __error: `${path}: ${e.message}` };
  }
}

/**
 * 表示に必要なものを一度に集める。
 *
 * @param {object} p
 * @param {string} p.ownerAddress  予算の持ち主の口座（公開アドレス）
 * @param {string} [p.policyPath]  ブローカーのポリシー JSON
 * @param {string} [p.statePath]   ブローカーの当日状態
 */
export async function collect({ ownerAddress, policyPath, statePath }) {
  const warnings = [];
  const policyRaw = readJsonOrNull(policyPath);
  if (policyRaw?.__error) { warnings.push(`ポリシーを読めない: ${policyRaw.__error}`); }
  const policy = policyRaw?.__error ? null : policyRaw;

  const stateRaw = readJsonOrNull(statePath ?? (policyPath ? policyPath.replace(/[^/]+$/, '.leash-state.json') : null));
  if (stateRaw?.__error) { warnings.push(`状態ファイルを読めない: ${stateRaw.__error}`); }
  const stateAll = stateRaw?.__error ? {} : (stateRaw ?? {});

  let channels = [];
  try {
    const r = await rpc('account_channels', { account: ownerAddress, ledger_index: 'validated' });
    channels = r.channels ?? [];
  } catch (e) {
    warnings.push(`予算枠を読めない: ${e.message}`);
  }

  const brokerAccount = policy?.brokerAccount ?? null;

  // 第1段は所有者の口座、第2段はブローカー口座に記録が残る。両方見ないと片肺になる。
  const ours = [ownerAddress, brokerAccount].filter(Boolean);
  const transactions = [];
  const seenHashes = new Set();
  for (const account of ours) {
    try {
      const r = await rpc('account_tx', {
        account, ledger_index_min: -1, ledger_index_max: -1, limit: 60, binary: false,
      });
      for (const t of r.transactions ?? []) {
        // 同じ取引が両方の口座に現れうる（ブローカーが所有者へ払う等）
        const h = t.hash ?? t.tx_json?.hash ?? t.tx?.hash;
        if (h && seenHashes.has(h)) continue;
        if (h) seenHashes.add(h);
        transactions.push(t);
      }
    } catch (e) {
      warnings.push(`取引履歴を読めない (${account}): ${e.message}`);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const budgets = budgetRows(channels);
  const agents = policy ? agentRows(policy, stateAll, today) : [];
  const [ownerBalanceDrops, brokerBalanceDrops] = await Promise.all([
    balanceDrops(ownerAddress), balanceDrops(brokerAccount),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    network: policy?.network ?? 'xrpl:1',
    sourceTag: LEASH_SOURCE_TAG,
    owner: { address: ownerAddress, balanceXrp: ownerBalanceDrops ? dropsToXrpString(ownerBalanceDrops) : null },
    broker: brokerAccount
      ? { address: brokerAccount, balanceXrp: brokerBalanceDrops ? dropsToXrpString(brokerBalanceDrops) : null }
      : null,
    budgets,
    agents,
    activity: activityRows(transactions, { accounts: ours }),
    totals: totals({ budgets, brokerBalanceDrops, ownerBalanceDrops }),
    warnings,
  };
}
