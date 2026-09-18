#!/usr/bin/env node
/**
 * XRPL Leash — owner CLI
 *
 * 予算の持ち主（人間）のための操作。口座の鍵を扱うのはこちら側だけ。
 *
 *   LEASH_OWNER_SEED=s... node bin/leash.js <command>
 */
import { Wallet } from 'xrpl';
import { LeashOwner } from '../src/leash/index.js';

const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.flatMap((a, i, arr) => (a.startsWith('--') ? [[a.slice(2), arr[i + 1]?.startsWith('--') ? true : arr[i + 1]]] : [])),
);

function ownerOrDie() {
  const seed = process.env.LEASH_OWNER_SEED;
  if (!seed) {
    console.error('LEASH_OWNER_SEED が未設定です。予算の持ち主のシードを指定してください。');
    process.exit(1);
  }
  return new LeashOwner(Wallet.fromSeed(seed));
}

const commands = {
  async 'new-agent'() {
    const w = Wallet.generate();
    console.log('新しいエージェント鍵を作りました。\n');
    console.log(`  公開鍵 (grant に渡す): ${w.publicKey}`);
    console.log(`  シード (エージェントに渡す): ${w.seed}\n`);
    console.log('  ※ このシードはエージェント用です。予算の持ち主のシードとは別物です。');
    console.log('  ※ エージェントは口座を持ちません。署名しかできません。');
  },

  async grant() {
    const { payee, cap, 'agent-pubkey': pub, expires } = args;
    if (!payee || !cap || !pub) {
      console.error('使い方: grant --payee <address> --cap <XRP> --agent-pubkey <hex> [--expires <秒>]');
      process.exit(1);
    }
    const owner = ownerOrDie();
    console.log(`${payee} に ${cap} XRP の予算枠を作成中…`);
    const b = await owner.grantBudget({
      payee, capXrp: String(cap), agentPublicKey: pub,
      expiresInSec: expires ? Number(expires) : undefined,
    });
    console.log(`\n  作成しました`);
    console.log(`  channel : ${b.channelId}`);
    console.log(`  上限    : ${b.capXrp} XRP（変更不可）`);
    console.log(`  支払先  : ${b.payee}（変更不可）`);
    console.log(`  tx      : ${b.txHash}`);
  },

  async list() {
    const owner = process.env.LEASH_OWNER_SEED
      ? ownerOrDie()
      : new LeashOwner({ address: args.address, sign: () => { throw new Error('鍵なし'); } });
    if (!process.env.LEASH_OWNER_SEED && !args.address) {
      console.error('LEASH_OWNER_SEED か --address のどちらかが必要です。');
      process.exit(1);
    }
    const budgets = await owner.listBudgets();
    if (!budgets.length) return console.log('予算枠はありません。');
    console.log(`予算枠 ${budgets.length} 件\n`);
    for (const b of budgets) {
      console.log(`  ${b.payee}`);
      console.log(`    ${b.spentXrp} / ${b.capXrp} XRP 使用（${b.usedPercent}%）　残 ${b.remainingXrp} XRP`);
      if (b.expiresAt) console.log(`    期限 ${b.expiresAt}`);
      console.log(`    channel ${b.channelId}\n`);
    }
  },

  async revoke() {
    if (!args.channel) {
      console.error('使い方: revoke --channel <channelId>');
      process.exit(1);
    }
    const owner = ownerOrDie();
    const r = await owner.revoke(args.channel);
    console.log(`閉鎖: ${r.result}　tx ${r.txHash}`);
  },
};

if (!cmd || !commands[cmd]) {
  console.log(`XRPL Leash — 予算の持ち主のための操作

  new-agent                             エージェント用の鍵を作る
  grant --payee <addr> --cap <XRP>      予算枠を作る
        --agent-pubkey <hex> [--expires <秒>]
  list  [--address <addr>]              予算枠と消化状況を見る
  revoke --channel <id>                 予算枠を閉じる

環境変数
  LEASH_OWNER_SEED   予算の持ち主のシード（grant / revoke に必要）
`);
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch((e) => { console.error('エラー:', e.message); process.exit(1); });
