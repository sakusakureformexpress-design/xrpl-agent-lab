/**
 * 検証2: XRP 以外（ドル建てトークン）で上限を台帳に強制できるか
 *
 * Payment Channel は XRP 限定とされる。ではドル建て（RLUSD 等）ではどうするのか。
 * 仕様の読みではなく、実際にトランザクションを投げて確かめる。
 *
 * 試すこと:
 *   A. 発行体が asfAllowTrustLineLocking を立てられるか（TokenEscrow 有効かの判定）
 *   B. PaymentChannelCreate に IOU を渡すとどうなるか
 *   C. EscrowCreate に IOU を渡すとどうなるか
 */
import { Wallet } from 'xrpl';
import { rpc, fundFromFaucet, waitForAccount, submitAndWait, autofill } from '../lib/rpc.js';

const CURRENCY = 'USD';
const results = [];
function record(name, detail) {
  console.log(`\n■ ${name}`);
  console.log(JSON.stringify(detail, null, 2));
  results.push({ name, detail });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function trySubmit(wallet, tx) {
  try {
    const filled = await autofill(tx);
    const r = await submitAndWait(wallet.sign(filled).tx_blob);
    return { result: r.result, hash: r.hash, message: r.message };
  } catch (e) {
    return { result: 'EXCEPTION', message: e.message };
  }
}

async function main() {
  const issuer = Wallet.generate();  // トークン発行体（RLUSD で言えば Ripple の立場）
  const holder = Wallet.generate();  // 予算の持ち主
  const vendor = Wallet.generate();  // 支払先

  await fundFromFaucet(issuer.address);
  await fundFromFaucet(holder.address);
  await fundFromFaucet(vendor.address);
  await waitForAccount(issuer.address);
  await waitForAccount(holder.address);
  await waitForAccount(vendor.address);
  record('準備', { issuer: issuer.address, holder: holder.address, vendor: vendor.address });

  // --- A. TokenEscrow (XLS-85) が有効か ---
  // 発行体が asfAllowTrustLineLocking (17) を立てられるかで判定する。
  const flagRes = await trySubmit(issuer, {
    TransactionType: 'AccountSet',
    Account: issuer.address,
    SetFlag: 17, // asfAllowTrustLineLocking
  });
  record('A. 発行体が asfAllowTrustLineLocking を立てられるか', {
    ...flagRes,
    判定: flagRes.result === 'tesSUCCESS'
      ? '✓ 立った → TokenEscrow (XLS-85) は有効'
      : '✗ 立たない → TokenEscrow は無効、または未対応',
  });
  await sleep(3000);

  // --- トラストラインを張ってトークンを配る ---
  const trust = await trySubmit(holder, {
    TransactionType: 'TrustSet',
    Account: holder.address,
    LimitAmount: { currency: CURRENCY, issuer: issuer.address, value: '1000000' },
  });
  record('トラストライン設定', trust);
  await sleep(3000);

  const issue = await trySubmit(issuer, {
    TransactionType: 'Payment',
    Account: issuer.address,
    Destination: holder.address,
    Amount: { currency: CURRENCY, issuer: issuer.address, value: '1000' },
  });
  record('トークン発行（1000 USD を holder へ）', issue);
  await sleep(3000);

  // --- B. Payment Channel に IOU を渡す ---
  const chan = await trySubmit(holder, {
    TransactionType: 'PaymentChannelCreate',
    Account: holder.address,
    Destination: vendor.address,
    Amount: { currency: CURRENCY, issuer: issuer.address, value: '100' }, // IOU
    SettleDelay: 60,
    PublicKey: Wallet.generate().publicKey,
  });
  record('B. PaymentChannelCreate に IOU を渡す', {
    ...chan,
    判定: chan.result === 'tesSUCCESS'
      ? '✓ 通った（想定外。Payment Channel は XRP 限定のはず）'
      : '✗ 拒否された → Payment Channel は XRP 限定で確定',
  });
  await sleep(3000);

  // --- C. Escrow に IOU を渡す ---
  const finishAfter = Math.floor(Date.now() / 1000) - 946684800 + 120; // Ripple epoch + 2分
  const esc = await trySubmit(holder, {
    TransactionType: 'EscrowCreate',
    Account: holder.address,
    Destination: vendor.address,
    Amount: { currency: CURRENCY, issuer: issuer.address, value: '100' }, // IOU
    FinishAfter: finishAfter,
  });
  record('C. EscrowCreate に IOU を渡す', {
    ...esc,
    判定: esc.result === 'tesSUCCESS'
      ? '✓ 通った → トークンのエスクローが可能。ドル建ての上限強制に使える'
      : '✗ 拒否された → この経路は使えない',
  });

  console.log('\nJSON_RESULT_START');
  console.log(JSON.stringify({ issuer: issuer.address, holder: holder.address, vendor: vendor.address, results }, null, 2));
  console.log('JSON_RESULT_END');
}

main().catch((e) => { console.error('エラー:', e.message); process.exit(2); });
