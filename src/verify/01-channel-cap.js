/**
 * 検証1: Payment Channel の上限と支払先が、台帳によって強制されるか
 *
 * 企画の心臓部。これが成立しなければ XRPL Leash は成立しない。
 *
 * 確かめること:
 *   A. 上限内のクレームは通る
 *   B. 上限を超えるクレームは「台帳が」拒否する（アプリの判断ではなく）
 *   C. 支払先は作成時に固定され、変更する取引型が存在しない
 *   D. エージェントには署名鍵しか渡らず、人間の口座鍵は渡らない
 */
import { Wallet, signPaymentChannelClaim, xrpToDrops } from 'xrpl';
import { rpc, fundFromFaucet, waitForAccount, submitAndWait, autofill } from '../lib/rpc.js';

const CHANNEL_CAP_XRP = '10';      // 人間が決める上限
const SMALL_CLAIM_XRP = '3';       // 上限内の正常な支払い
const OVERSPEND_CLAIM_XRP = '50';  // 上限を超える請求（乗っ取られたエージェントの想定）

const log = [];
function record(step, detail) {
  const line = `[${new Date().toISOString()}] ${step}`;
  console.log(line);
  if (detail) console.log('   ', JSON.stringify(detail));
  log.push({ step, detail });
}

async function main() {
  // --- 登場人物 ---
  const human  = Wallet.generate();   // 予算の持ち主。鍵はここだけが持つ
  const vendor = Wallet.generate();   // 人間が承認した支払先
  const agent  = Wallet.generate();   // AIエージェント。鍵ペアだけ。口座すら要らない

  record('登場人物を生成', {
    human: human.address,
    vendor: vendor.address,
    agent_publicKey: agent.publicKey,
    'agentは口座を持たない': true,
  });

  // --- 資金供給（テストネットの蛇口） ---
  await fundFromFaucet(human.address);
  await fundFromFaucet(vendor.address);
  await waitForAccount(human.address);
  await waitForAccount(vendor.address);
  record('蛇口から資金供給 完了');

  // --- 1. 人間がチャネルを作る。上限と支払先をここで固定する ---
  const createTx = await autofill({
    TransactionType: 'PaymentChannelCreate',
    Account: human.address,
    Destination: vendor.address,          // ← 支払先。以後변更不可
    Amount: xrpToDrops(CHANNEL_CAP_XRP),  // ← 上限。増額できるのは送金元だけ
    SettleDelay: 60,
    PublicKey: agent.publicKey,           // ← エージェントの公開鍵を登録
  });
  const created = await submitAndWait(human.sign(createTx).tx_blob);
  record('1. PaymentChannelCreate', {
    result: created.result,
    hash: created.hash,
    上限: `${CHANNEL_CAP_XRP} XRP`,
    支払先: vendor.address,
  });
  if (created.result !== 'tesSUCCESS') throw new Error('チャネル作成に失敗: ' + created.result);

  // チャネルIDを取得
  const chans = await rpc('account_channels', { account: human.address, destination_account: vendor.address });
  const channelId = chans.channels[0].channel_id;
  record('チャネルID', { channelId, amount_drops: chans.channels[0].amount });

  // --- 2. 正常系: 上限内のクレーム ---
  // エージェントが自分の秘密鍵で署名する。人間の鍵は一切使わない。
  const sigOk = signPaymentChannelClaim(channelId, SMALL_CLAIM_XRP, agent.privateKey);
  const claimOkTx = await autofill({
    TransactionType: 'PaymentChannelClaim',
    Account: vendor.address,              // 受取人が換金する
    Channel: channelId,
    Balance: xrpToDrops(SMALL_CLAIM_XRP),
    Amount: xrpToDrops(SMALL_CLAIM_XRP),
    Signature: sigOk,
    PublicKey: agent.publicKey,
  });
  const claimOk = await submitAndWait(vendor.sign(claimOkTx).tx_blob);
  record(`2. 上限内のクレーム（${SMALL_CLAIM_XRP} XRP ≤ ${CHANNEL_CAP_XRP} XRP）`, {
    result: claimOk.result,
    hash: claimOk.hash,
    期待: 'tesSUCCESS',
    判定: claimOk.result === 'tesSUCCESS' ? '✓ 通った' : '✗ 想定外',
  });

  // --- 3. 攻撃系: 上限を超えるクレーム ---
  // エージェントが乗っ取られ、上限を無視した請求に署名したと仮定する。
  const sigOver = signPaymentChannelClaim(channelId, OVERSPEND_CLAIM_XRP, agent.privateKey);
  const claimOverTx = await autofill({
    TransactionType: 'PaymentChannelClaim',
    Account: vendor.address,
    Channel: channelId,
    Balance: xrpToDrops(OVERSPEND_CLAIM_XRP),
    Amount: xrpToDrops(OVERSPEND_CLAIM_XRP),
    Signature: sigOver,
    PublicKey: agent.publicKey,
  });
  const claimOver = await submitAndWait(vendor.sign(claimOverTx).tx_blob);
  record(`3. 上限を超えるクレーム（${OVERSPEND_CLAIM_XRP} XRP > ${CHANNEL_CAP_XRP} XRP）`, {
    result: claimOver.result,
    message: claimOver.message,
    hash: claimOver.hash,
    期待: '拒否されること',
    判定: claimOver.result === 'tesSUCCESS' ? '✗ 通ってしまった（企画が破綻）' : '✓ 台帳が拒否した',
  });

  // --- 4. チャネルの最終状態 ---
  const after = await rpc('account_channels', { account: human.address, destination_account: vendor.address });
  const ch = after.channels[0];
  record('4. チャネルの最終状態', {
    上限_amount: ch.amount,
    払い出し済み_balance: ch.balance,
    支払先_destination: ch.destination_account,
    '支払先を変更する取引型は存在しない': true,
  });

  // --- 判定 ---
  const passed =
    claimOk.result === 'tesSUCCESS' &&
    claimOver.result !== 'tesSUCCESS' &&
    ch.destination_account === vendor.address;

  console.log('\n' + '='.repeat(60));
  console.log(passed ? '結論: 台帳による上限強制は成立する' : '結論: 成立しない。設計の見直しが必要');
  console.log('='.repeat(60));

  return { passed, log, channelId, human: human.address, vendor: vendor.address, agent: agent.publicKey };
}

main().then((r) => {
  console.log('\nJSON_RESULT_START');
  console.log(JSON.stringify(r, null, 2));
  console.log('JSON_RESULT_END');
  process.exit(r.passed ? 0 : 1);
}).catch((e) => {
  console.error('エラー:', e.message);
  process.exit(2);
});
