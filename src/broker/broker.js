/**
 * Leash Broker — ポリシーに従って支払いに署名する常駐プロセスの中核。
 *
 * 設計上の約束:
 *   - **LLM を含まない。** 自然言語を一切解釈しない
 *   - ブローカー口座の鍵しか持たない。本口座の鍵は持たない
 *   - したがって最大被害はブローカー口座の残高
 *   - 判定は policy.js の純粋関数に委譲する（テスト可能にするため）
 */
import fs from 'node:fs';
import path from 'node:path';
import { Wallet } from 'xrpl';
import { rpc, autofill } from '../lib/rpc.js';
import { LEASH_SOURCE_TAG } from '../leash/constants.js';
import { decide, validatePolicy } from './policy.js';

export class LeashBroker {
  /**
   * @param {object} p
   * @param {string} p.policyPath ポリシー JSON のパス
   * @param {string} p.seed       ブローカー口座のシード（本口座のものではない）
   * @param {string} [p.statePath] 当日集計の保存先
   */
  constructor({ policyPath, seed, statePath }) {
    this.policyPath = policyPath;
    this.statePath = statePath ?? path.join(path.dirname(policyPath), '.leash-state.json');
    this.wallet = Wallet.fromSeed(seed);
    this.reload();
  }

  reload() {
    const policy = JSON.parse(fs.readFileSync(this.policyPath, 'utf8'));
    const errs = validatePolicy(policy);
    if (errs.length) throw new Error('ポリシーが不正:\n  - ' + errs.join('\n  - '));
    if (policy.brokerAccount !== this.wallet.address) {
      throw new Error(`ポリシーの brokerAccount (${policy.brokerAccount}) と鍵のアドレス (${this.wallet.address}) が一致しない`);
    }
    this.policy = policy;
  }

  #today() { return new Date().toISOString().slice(0, 10); }

  #loadState(agentName) {
    let all = {};
    try { all = JSON.parse(fs.readFileSync(this.statePath, 'utf8')); } catch { /* 初回 */ }
    const key = `${agentName}:${this.#today()}`;
    return { all, key, state: all[key] ?? { spentDrops: '0', payees: [] } };
  }

  #saveState(all, key, state) {
    all[key] = state;
    // 古い日付は捨てる
    const today = this.#today();
    for (const k of Object.keys(all)) if (!k.endsWith(today)) delete all[k];
    fs.writeFileSync(this.statePath, JSON.stringify(all, null, 2));
  }

  /** 現在の消化状況（読み取り専用）。 */
  status(agentName) {
    const { state } = this.#loadState(agentName);
    const l = this.policy.agents?.[agentName]?.limits ?? {};
    return {
      date: this.#today(),
      spentDrops: state.spentDrops,
      dailyTotalMaxDrops: l.dailyTotalMaxDrops,
      payeesToday: state.payees,
      newPayeesPerDay: l.newPayeesPerDay,
    };
  }

  /**
   * 支払いを要求する。ポリシーが許可すれば署名済み tx_blob を返す。
   *
   * **受け取るのは構造化データだけ。** 自由記述のフィールドは読まない。
   *
   * @returns {Promise<{allow:boolean, code:string, reason:string, signedTxBlob?:string, payTo?:string, amountDrops?:string}>}
   */
  async requestPayment({ agentName, payTo, amountDrops }) {
    const { all, key, state } = this.#loadState(agentName);
    const verdict = decide({ policy: this.policy, agentName, payTo, amountDrops, state });
    if (!verdict.allow) return verdict;

    const tx = await autofill({
      TransactionType: 'Payment',
      Account: this.wallet.address,
      Destination: payTo,
      Amount: String(amountDrops),
      SourceTag: LEASH_SOURCE_TAG,
    });
    const signed = this.wallet.sign(tx);

    // 署名した時点で予算を消費したものとして記録する（二重発行を防ぐ）
    state.spentDrops = (BigInt(state.spentDrops) + BigInt(amountDrops)).toString();
    if (!state.payees.includes(payTo)) state.payees.push(payTo);
    this.#saveState(all, key, state);

    return { ...verdict, signedTxBlob: signed.tx_blob, txHash: signed.hash, payTo, amountDrops: String(amountDrops) };
  }

  /** ブローカー口座の残高。最大被害額そのもの。 */
  async balance() {
    const r = await rpc('account_info', { account: this.wallet.address, ledger_index: 'validated' });
    return r.account_data.Balance;
  }
}
