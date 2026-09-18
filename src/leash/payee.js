/**
 * 支払先（サービス提供者）の側。受け取った伝票を台帳で換金する。
 */
import { xrpToDrops } from 'xrpl';
import { submitAndWait, autofill } from '../lib/rpc.js';
import { LEASH_SOURCE_TAG } from './constants.js';

export class LeashPayee {
  constructor(wallet) {
    this.wallet = wallet;
  }

  get address() {
    return this.wallet.address;
  }

  /**
   * 伝票を換金する。上限を超えていれば台帳が拒否する。
   * @param {{channelId:string, cumulativeXrp:string, signature:string, publicKey:string}} voucher
   */
  async redeem(voucher) {
    const filled = await autofill({
      TransactionType: 'PaymentChannelClaim',
      Account: this.address,
      Channel: voucher.channelId,
      Balance: xrpToDrops(voucher.cumulativeXrp),
      Amount: xrpToDrops(voucher.cumulativeXrp),
      Signature: voucher.signature,
      PublicKey: voucher.publicKey,
      SourceTag: LEASH_SOURCE_TAG,
    });
    const res = await submitAndWait(this.wallet.sign(filled).tx_blob);
    return {
      accepted: res.result === 'tesSUCCESS',
      result: res.result,
      txHash: res.hash,
      message: res.message,
    };
  }
}
