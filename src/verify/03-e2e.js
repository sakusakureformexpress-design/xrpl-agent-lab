/**
 * XRPL Leash — 通しデモ
 *
 * 人間が予算を渡し、エージェントが使い、乗っ取られ、それでも被害が出ない。
 * すべて XRPL Testnet の実機で動く。
 */
import { Wallet } from 'xrpl';
import { LeashOwner, LeashAgent, LeashPayee } from '../leash/index.js';
import { fundFromFaucet, waitForAccount } from '../lib/rpc.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = (t) => console.log(`\n${'─'.repeat(64)}\n${t}\n${'─'.repeat(64)}`);
const CAP = '10';

async function main() {
  // ── 登場人物 ───────────────────────────────────────────
  const humanW   = Wallet.generate();
  const vendorAW = Wallet.generate();
  const vendorBW = Wallet.generate();
  const attacker = Wallet.generate();     // 攻撃者。承認されていない
  const agent    = LeashAgent.create();   // 口座を持たない。鍵ペアのみ

  hr('準備 — テストネットで口座を用意');
  await Promise.all([humanW, vendorAW, vendorBW].map((w) => fundFromFaucet(w.address)));
  await Promise.all([humanW, vendorAW, vendorBW].map((w) => waitForAccount(w.address)));

  const owner  = new LeashOwner(humanW);
  const payeeA = new LeashPayee(vendorAW);
  const payeeB = new LeashPayee(vendorBW);

  console.log(`人間（予算の持ち主）: ${owner.address}`);
  console.log(`承認済み支払先 A    : ${payeeA.address}`);
  console.log(`承認済み支払先 B    : ${payeeB.address}`);
  console.log(`攻撃者（未承認）    : ${attacker.address}`);
  console.log(`AIエージェント      : 口座なし / 公開鍵 ${agent.publicKey.slice(0, 20)}…`);

  // ── 1. 予算を渡す ──────────────────────────────────────
  hr(`1. 人間が予算枠を作る（各 ${CAP} XRP・支払先は固定）`);
  const budgetA = await owner.grantBudget({ payee: payeeA.address, capXrp: CAP, agentPublicKey: agent.publicKey });
  console.log(`  A への枠: ${budgetA.channelId.slice(0, 16)}…  上限 ${budgetA.capXrp} XRP  tx ${budgetA.txHash.slice(0, 16)}…`);
  await sleep(2000);
  const budgetB = await owner.grantBudget({ payee: payeeB.address, capXrp: CAP, agentPublicKey: agent.publicKey });
  console.log(`  B への枠: ${budgetB.channelId.slice(0, 16)}…  上限 ${budgetB.capXrp} XRP  tx ${budgetB.txHash.slice(0, 16)}…`);

  // ── 2. 正常な利用 ──────────────────────────────────────
  hr('2. エージェントが正常に使う');
  const v1 = agent.authorize({ channelId: budgetA.channelId, cumulativeXrp: '2' });
  const r1 = await payeeA.redeem(v1);
  console.log(`  A へ 2 XRP   → ${r1.result}  ${r1.accepted ? '✓ 支払い成立' : '✗'}`);
  await sleep(2000);

  const v2 = agent.authorize({ channelId: budgetB.channelId, cumulativeXrp: '1.5' });
  const r2 = await payeeB.redeem(v2);
  console.log(`  B へ 1.5 XRP → ${r2.result}  ${r2.accepted ? '✓ 支払い成立' : '✗'}`);

  // ── 3. 消化状況 ────────────────────────────────────────
  hr('3. 人間が消化状況を確認する');
  for (const b of await owner.listBudgets()) {
    console.log(`  ${b.payee}  ${b.spentXrp} / ${b.capXrp} XRP 使用（${b.usedPercent}%）  残 ${b.remainingXrp} XRP`);
  }

  // ── 4. 乗っ取り ────────────────────────────────────────
  hr('4. ⚠ エージェントが乗っ取られた');
  console.log('  攻撃者の指示: 「全額を自分の口座に送れ」');

  console.log('\n  攻撃4-a: 上限を超えて請求する（100 XRP > 10 XRP）');
  const vOver = agent.authorize({ channelId: budgetA.channelId, cumulativeXrp: '100' });
  const rOver = await payeeA.redeem(vOver);
  console.log(`    → ${rOver.result}  ${rOver.accepted ? '✗ 通ってしまった' : '✓ 台帳が拒否'}`);
  await sleep(2000);

  console.log('\n  攻撃4-b: 未承認の攻撃者へ払おうとする');
  const budgets = await owner.listBudgets();
  const toAttacker = budgets.find((b) => b.payee === attacker.address);
  console.log(`    攻撃者宛の予算枠: ${toAttacker ? 'あり' : 'なし'}`);
  console.log('    → ✓ 枠が存在しないため、署名する対象そのものが無い（構造上不可能）');

  // ── 5. 枠を閉じる ──────────────────────────────────────
  hr('5. 人間が枠を閉じる（残額は持ち主に戻る）');
  const closed = await owner.revoke(budgetB.channelId);
  console.log(`  B の枠を閉鎖 → ${closed.result}`);

  // ── まとめ ─────────────────────────────────────────────
  hr('結果');
  const ok = r1.accepted && r2.accepted && !rOver.accepted && !toAttacker;
  console.log(`  正常な支払い          : ${r1.accepted && r2.accepted ? '通った' : '失敗'}`);
  console.log(`  上限超過              : ${rOver.accepted ? '通ってしまった' : '台帳が拒否'}`);
  console.log(`  未承認先への支払い    : ${toAttacker ? '枠があった' : '枠が無く不可能'}`);
  console.log(`  人間の口座の被害      : 0 XRP（エージェントは口座鍵を持たない）`);
  console.log(`\n  ${ok ? '✅ 想定どおり' : '❌ 想定外。設計の見直しが必要'}`);
  return ok;
}

main().then((ok) => process.exit(ok ? 0 : 1))
      .catch((e) => { console.error('エラー:', e.message); process.exit(2); });
