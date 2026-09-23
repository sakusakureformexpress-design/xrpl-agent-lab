/**
 * 検証5: x402 の実際の流れに、ブローカーを通して乗る
 *
 * 確かめること:
 *   - 支払先が実行時にはじめて分かる（402 の中身）状況で成立するか
 *   - ポリシー内なら自動で払えるか
 *   - 1回の上限を超えたら断るか
 *   - 新規支払先の1日上限で断るか
 *   - エージェントは口座の鍵を一度も触らないか
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Wallet } from 'xrpl';
import { LeashBroker } from '../broker/broker.js';
import { startMerchant } from '../../examples/x402-server.js';
import { fetchWithPayment } from '../../examples/x402-client.js';
import { fundFromFaucet, waitForAccount } from '../lib/rpc.js';

// 固定パスだと、同じ機械の他のユーザーが先にファイルを置いてポリシーを差し替えられる。
// 実行ごとに本人しか読み書きできない一時ディレクトリを作る（セキュリティレビュー LOW-12）。
const WORKDIR = fs.mkdtempSync(path.join(os.tmpdir(), 'leash-demo-'));
const POLICY = path.join(WORKDIR, 'policy.json');
const STATE = path.join(WORKDIR, 'state.json');
process.on('exit', () => fs.rmSync(WORKDIR, { recursive: true, force: true }));
const AGENT = 'research-bot';
const hr = (t) => console.log(`\n${'─'.repeat(64)}\n${t}\n${'─'.repeat(64)}`);

async function main() {
  // ── 3つの業者を立てる。どれもエージェントは事前に知らない ──
  const brokerW = Wallet.generate();
  const vendors = [Wallet.generate(), Wallet.generate(), Wallet.generate(), Wallet.generate()];

  // 業者の口座も実在させる。XRPL では未作成の口座に準備金未満を送れないため
  // （実運用でも、API提供者の口座は既に存在している）。
  await Promise.all([brokerW, ...vendors].map((w) => fundFromFaucet(w.address)));
  await Promise.all([brokerW, ...vendors].map((w) => waitForAccount(w.address)));
  console.log(`ブローカー口座: ${brokerW.address}`);

  fs.writeFileSync(POLICY, JSON.stringify({
    version: 1,
    brokerAccount: brokerW.address,
    agents: {
      [AGENT]: {
        limits: {
          perPaymentMaxDrops: '100000',    // 1回 0.1 XRP まで
          dailyTotalMaxDrops: '5000000',   // 1日 5 XRP まで
          newPayeesPerDay: 2,              // 新規の相手は1日2件まで
        },
        payees: { alwaysAllow: [], denyList: [], autoApprove: true },
      },
    },
  }, null, 2));

  const broker = new LeashBroker({ policyPath: POLICY, seed: brokerW.seed, statePath: STATE });
  console.log(`ポリシー: 1回 0.1 XRP / 1日 5 XRP / 新規の相手は1日2件まで`);

  // 4つの業者を起動（価格違い）
  const m = [];
  m.push(await startMerchant({ payTo: vendors[0].address, priceDrops: '20000' }));  // 0.02 XRP
  m.push(await startMerchant({ payTo: vendors[1].address, priceDrops: '30000' }));  // 0.03 XRP
  m.push(await startMerchant({ payTo: vendors[2].address, priceDrops: '50000' }));  // 0.05 XRP
  m.push(await startMerchant({ payTo: vendors[3].address, priceDrops: '900000' })); // 0.9 XRP ← 上限超過

  const call = (i) => fetchWithPayment(`http://127.0.0.1:${m[i].port}/market-data`, broker, AGENT);
  const show = (label, r) => {
    console.log(`\n  ${label}`);
    console.log(`    支払先 ${r.payTo ?? '-'}  金額 ${r.amountDrops ?? '-'} drops`);
    if (r.paid) {
      console.log(`    → ✓ 支払い成立。データ取得: ${JSON.stringify(r.data).slice(0, 60)}…`);
      console.log(`    → tx ${r.settlement?.transaction?.slice(0, 20)}…`);
    } else if (r.code) {
      console.log(`    → ✗ ブローカーが拒否 [${r.code}] ${r.refused}`);
    } else {
      console.log(`    → ✗ 決済に失敗: ${r.settlementError}`);
    }
  };

  hr('1. 未知の業者から 402 が返る → ポリシー内なので自動で払う');
  show('業者A  0.02 XRP', await call(0));
  show('業者B  0.03 XRP', await call(1));

  hr('2. 新規の支払先が1日の上限に達する');
  show('業者C  0.05 XRP（本日3件目の新規）', await call(2));

  hr('3. 1回あたりの上限を超える');
  show('業者D  0.9 XRP（1回上限 0.1 XRP）', await call(3));

  hr('4. 既に払った相手には、また払える');
  show('業者A  0.02 XRP（2回目）', await call(0));

  hr('現在の消化状況');
  const st = broker.status(AGENT);
  console.log(`  本日 ${st.spentDrops} / ${st.dailyTotalMaxDrops} drops 使用`);
  console.log(`  本日の支払先: ${st.payeesToday.length} 件`);
  console.log(`  ブローカー口座残高: ${await broker.balance()} drops  ← 最大被害額`);

  for (const x of m) x.server.close();
  console.log('\n  エージェントは口座の鍵を一度も保持していない。');
  console.log('  ブローカーは自然言語を一切解釈していない。\n');
}

main().catch((e) => { console.error('エラー:', e.message, e.stack); process.exit(1); });
