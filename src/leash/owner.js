/**
 * 予算の持ち主（人間）の側。口座の鍵を持つのはここだけ。
 *
 * できること:
 *   - 承認済みの支払先に対して、上限付きの予算枠（チャネル）を作る
 *   - 枠の一覧と消化状況を見る
 *   - 枠を閉じる
 *
 * できないこと（意図的に）:
 *   - エージェントの代わりにクレームへ署名すること。署名権はエージェントにしか無い
 */
import { xrpToDrops, dropsToXrp } from 'xrpl';
import { rpc, submitAndWait, autofill } from '../lib/rpc.js';
import { LEASH_SOURCE_TAG, TF_CLOSE } from './constants.js';

export class LeashOwner {
  /** @param {import('xrpl').Wallet} wallet 予算の持ち主のウォレット */
  constructor(wallet) {
    this.wallet = wallet;
  }

  get address() {
    return this.wallet.address;
  }

  /**
   * 承認済みの支払先へ、上限付きの予算枠を作る。
   *
   * 支払先(payee)は台帳に固定され、以後変更する取引型が存在しない。
   * 上限(capXrp)は `PaymentChannelFund` で**増額できるが、それができるのは
   * チャネルの送金元（＝この口座）だけ**であり、口座の鍵が要る。
   * エージェントは署名鍵しか持たないため、上限を動かせない。
   * エージェントには agentPublicKey に対応する秘密鍵しか渡らないため、
   * 上限超過も支払先の変更も構造上できない。
   *
   * @param {object} p
   * @param {string} p.payee           承認済みの支払先アドレス
   * @param {string} p.capXrp          上限（XRP）
   * @param {string} p.agentPublicKey  エージェントの公開鍵
   * @param {number} [p.settleDelaySec] 受取人が応答しない場合に取り消せるまでの秒数
   * @param {number} [p.expiresInSec]   枠の有効期限（秒）。未指定なら無期限
   */
  async grantBudget({ payee, capXrp, agentPublicKey, settleDelaySec = 3600, expiresInSec }) {
    const tx = {
      TransactionType: 'PaymentChannelCreate',
      Account: this.address,
      Destination: payee,
      Amount: xrpToDrops(capXrp),
      SettleDelay: settleDelaySec,
      PublicKey: agentPublicKey,
      SourceTag: LEASH_SOURCE_TAG,
    };
    if (expiresInSec) {
      // XRPL のタイムスタンプは 2000-01-01 起点
      tx.CancelAfter = Math.floor(Date.now() / 1000) - 946684800 + expiresInSec;
    }

    const filled = await autofill(tx);
    const res = await submitAndWait(this.wallet.sign(filled).tx_blob);
    if (res.result !== 'tesSUCCESS') {
      throw new Error(`予算枠の作成に失敗: ${res.result} ${res.message ?? ''}`);
    }

    const budget = await this.#findBudget(payee);
    return { ...budget, txHash: res.hash };
  }

  /**
   * 予算枠の一覧と消化状況を返す。
   * 公開情報のみを読むため、鍵を持たないインスタンスでも呼べる。
   */
  async listBudgets() {
    const res = await rpc('account_channels', { account: this.address, ledger_index: 'validated' });
    return (res.channels ?? []).map((c) => {
      const cap = Number(c.amount);
      const spent = Number(c.balance);
      return {
        channelId: c.channel_id,
        payee: c.destination_account,
        publicKey: c.public_key_hex,
        capXrp: dropsToXrp(c.amount),
        spentXrp: dropsToXrp(c.balance),
        remainingXrp: dropsToXrp(String(cap - spent)),
        usedPercent: cap === 0 ? 0 : Math.round((spent / cap) * 1000) / 10,
        expiresAt: c.cancel_after ? new Date((c.cancel_after + 946684800) * 1000).toISOString() : null,
      };
    });
  }

  /** 予算枠を閉じる。残額は持ち主に戻る。 */
  async revoke(channelId) {
    const filled = await autofill({
      TransactionType: 'PaymentChannelClaim',
      Account: this.address,
      Channel: channelId,
      Flags: TF_CLOSE,
      SourceTag: LEASH_SOURCE_TAG,
    });
    const res = await submitAndWait(this.wallet.sign(filled).tx_blob);
    return { result: res.result, txHash: res.hash };
  }

  async #findBudget(payee) {
    const res = await rpc('account_channels', { account: this.address, destination_account: payee });
    const c = res.channels?.[res.channels.length - 1];
    if (!c) throw new Error('作成した予算枠が見つからない');
    return {
      channelId: c.channel_id,
      payee: c.destination_account,
      capXrp: dropsToXrp(c.amount),
      spentXrp: dropsToXrp(c.balance),
    };
  }
}
