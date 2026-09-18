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
import { buildMemo, policyHash } from '../leash/memo.js';
import { verifyPayeeDomain } from './domain.js';

export class LeashBroker {
  /**
   * @param {object} p
   * @param {string} p.policyPath ポリシー JSON のパス
   * @param {string} p.seed       ブローカー口座のシード（本口座のものではない）
   * @param {string} [p.statePath] 当日集計の保存先
   */
  #locks = new Map();

  constructor({ policyPath, seed, statePath }) {
    this.policyPath = policyPath;
    this.statePath = statePath ?? path.join(path.dirname(policyPath), '.leash-state.json');
    // 列挙不可にする。JSON.stringify やログ出力、エラーのダンプに
    // シードが乗らないようにするため。
    Object.defineProperty(this, 'wallet', {
      value: Wallet.fromSeed(seed), enumerable: false, writable: false, configurable: false,
    });
    this.reload();
  }

  /** シリアライズされても鍵を出さない。 */
  toJSON() {
    return { brokerAccount: this.policy?.brokerAccount, policyPath: this.policyPath };
  }

  /**
   * エージェント単位で直列化する。
   *
   * これが無いと、並行した要求が全て「使用済 0」の状態を読んでから
   * 署名してしまい、日次上限を要求件数の倍数だけ突破できる
   * （実測: 上限 100000 drops に対し 5 件同時で 500000 drops 署名）。
   */
  async #withLock(key, fn) {
    const prev = this.#locks.get(key) ?? Promise.resolve();
    let release;
    const mine = prev.then(() => new Promise((r) => { release = r; }));
    this.#locks.set(key, mine);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.#locks.get(key) === mine) this.#locks.delete(key);
    }
  }

  reload() {
    const raw = fs.readFileSync(this.policyPath, 'utf8');
    // ポリシーのハッシュを取っておき、各支払いのメモに刻む。
    // 台帳はメモを検証しないので強制力は無いが、
    // 「その支払いの時点で有効だったルール」が改ざん不能な形で残る。
    this.policyHash = policyHash(raw);
    const policy = JSON.parse(raw);
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
    const l = (Object.hasOwn(this.policy.agents ?? {}, agentName) ? this.policy.agents[agentName]?.limits : null) ?? {};
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
  /**
   * @param {object} p
   * @param {string} p.host エージェントが**実際に叩いた** URL のホスト名。
   *                        402 本文が自称する resource ではない（そちらは攻撃者が書ける）
   */
  async requestPayment({ agentName, payTo, amountDrops, invoice, resource, host }) {
    // ドメイン検証は通信を伴う。金額や支払先で先に落ちるものに対して
    // 外部へ取りに行くのは無駄であり、要求を投げるだけで外向き通信を
    // 誘発できてしまう。**先にローカルだけで判定する。**
    let domain;
    const needsDomain = Object.hasOwn(this.policy.agents ?? {}, agentName)
      && this.policy.agents[agentName]?.payees?.domains;
    if (needsDomain) {
      const DOMAIN_CODES = new Set(['DOMAIN_NOT_ALLOWED', 'DOMAIN_UNVERIFIED', 'OVER_UNVERIFIED_LIMIT']);
      const { state: pre } = this.#loadState(agentName);
      const dry = decide({ policy: this.policy, agentName, payTo, amountDrops, state: pre });
      if (!dry.allow && !DOMAIN_CODES.has(dry.code)) return dry;  // 通信せずに拒否

      const v = host
        ? await verifyPayeeDomain({ host, payTo, network: this.policy.network })
        : { verified: false, reason: 'ホスト名が渡されていない' };
      domain = { host, ...v };
    }

    return this.#withLock(agentName, async () => {
      const { all, key, state } = this.#loadState(agentName);
      const verdict = decide({ policy: this.policy, agentName, payTo, amountDrops, state, domain });
      if (!verdict.allow) return verdict;

      // **署名の前に枠を確保する。** 署名してから記録すると、その間に
      // 割り込んだ要求が古い残高を読んでしまう。
      const before = { spentDrops: state.spentDrops, payees: [...state.payees] };
      state.spentDrops = (BigInt(state.spentDrops) + BigInt(amountDrops)).toString();
      if (!state.payees.includes(payTo)) state.payees.push(payTo);
      this.#saveState(all, key, state);

      try {
        const memos = buildMemo({
          agent: agentName, policy: this.policyHash, invoice,
          resource: resource ?? (host ? `https://${host}` : undefined),
        });
        const tx = await autofill({
          TransactionType: 'Payment',
          Account: this.wallet.address,
          Destination: payTo,
          Amount: String(amountDrops),
          SourceTag: LEASH_SOURCE_TAG,
          ...(memos ? { Memos: memos } : {}),
        });
        const signed = this.wallet.sign(tx);
        return { ...verdict, signedTxBlob: signed.tx_blob, txHash: signed.hash, payTo, amountDrops: String(amountDrops) };
      } catch (e) {
        // 署名に失敗したら確保した枠を戻す
        const { all: a2, key: k2 } = this.#loadState(agentName);
        this.#saveState(a2, k2, before);
        throw e;
      }
    });
  }

  /** ブローカー口座の残高。最大被害額そのもの。 */
  async balance() {
    const r = await rpc('account_info', { account: this.wallet.address, ledger_index: 'validated' });
    return r.account_data.Balance;
  }
}
