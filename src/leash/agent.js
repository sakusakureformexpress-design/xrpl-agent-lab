/**
 * AIエージェントの側。**口座を持たない。署名鍵だけを持つ。**
 *
 * エージェントが乗っ取られても、できるのは
 * 「既にある枠に対して、支払いの伝票に署名する」ことだけ。
 *   - 上限を超える伝票に署名しても、台帳が拒否する
 *   - 承認されていない相手には、そもそも枠が無いので払えない
 *   - 人間の口座を操作することはできない
 */
import { signPaymentChannelClaim, Wallet } from 'xrpl';

export class LeashAgent {
  /**
   * @param {object} p
   * @param {string} p.privateKey エージェントの秘密鍵（人間の口座鍵ではない）
   * @param {string} p.publicKey  対応する公開鍵
   */
  constructor({ privateKey, publicKey }) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  /** 新しいエージェント用の鍵ペアを作る。 */
  static create() {
    const w = Wallet.generate();
    return new LeashAgent({ privateKey: w.privateKey, publicKey: w.publicKey });
  }

  /**
   * 支払いの伝票（クレーム）に署名する。
   *
   * cumulativeXrp は「この枠からの累計支払額」であり、都度の金額ではない。
   * Payment Channel の仕様上、伝票は累計額で表現される。
   *
   * @returns {{channelId:string, cumulativeXrp:string, signature:string, publicKey:string}}
   */
  authorize({ channelId, cumulativeXrp }) {
    return {
      channelId,
      cumulativeXrp: String(cumulativeXrp),
      signature: signPaymentChannelClaim(channelId, String(cumulativeXrp), this.privateKey),
      publicKey: this.publicKey,
    };
  }
}
