#!/usr/bin/env node
/**
 * XRPL Leash — owner CLI
 *
 * 予算の持ち主（人間）のための操作。口座の鍵を扱うのはこちら側だけ。
 *
 *   LEASH_OWNER_SEED=s... node bin/leash.js <command>
 */
import fs from 'node:fs';
import { Wallet } from 'xrpl';
import { LeashOwner } from '../src/leash/index.js';
import { start } from '../src/dashboard/server.js';
import { snapshotHtml } from '../src/dashboard/snapshot.js';

const [cmd, ...rest] = process.argv.slice(2);
/** `--key value` と `--flag` を取り違えずに読む。 */
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith('--')) continue;
  const key = rest[i].slice(2);
  const next = rest[i + 1];
  if (next === undefined || next.startsWith('--')) { args[key] = true; }
  else { args[key] = next; i++; }
}

function ownerOrDie() {
  const seed = process.env.LEASH_OWNER_SEED;
  if (!seed) {
    console.error('LEASH_OWNER_SEED が未設定です。予算の持ち主のシードを指定してください。');
    process.exit(1);
  }
  return new LeashOwner(Wallet.fromSeed(seed));
}

/** 公開アドレスだけを解決する。シードは要求しない。 */
function addressOrDie() {
  if (args.address) return String(args.address);
  const seed = process.env.LEASH_OWNER_SEED;
  if (seed) return Wallet.fromSeed(seed).address;
  console.error('--address <アドレス> を指定してください（LEASH_OWNER_SEED からも解決できます）。');
  process.exit(1);
}

const commands = {
  async 'new-agent'() {
    const w = Wallet.generate();
    console.log('新しいエージェント鍵を作りました。\n');
    console.log(`  公開鍵 (grant に渡す): ${w.publicKey}\n`);
    if (args.out) {
      fs.writeFileSync(args.out, w.seed + '\n', { mode: 0o600 });
      console.log(`  シードを ${args.out} に書き出しました（本人のみ読み取り可）`);
    } else {
      console.log(`  シード (エージェントに渡す): ${w.seed}\n`);
      console.log('  ⚠ シードを画面に出しました。シェル履歴・端末ログ・画面共有に残ります。');
      console.log('    残したくない場合は --out <path> でファイルに書き出してください。');
    }
    console.log('\n  ※ このシードはエージェント用です。予算の持ち主のシードとは別物です。');
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
    console.log(`  上限    : ${b.capXrp} XRP（増額できるのはあなただけ）`);
    console.log(`  支払先  : ${b.payee}（変更する手段は無い）`);
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

  /**
   * 読み取り専用のダッシュボード。
   * **シードを要求しない。** 公開アドレスだけで動く（鍵を持たせない設計のため）。
   */
  async dashboard() {
    const ownerAddress = addressOrDie();
    const { url } = await start({
      ownerAddress,
      policyPath: args.policy,
      statePath: args.state,
      port: args.port ? Number(args.port) : 7788,
    });
    console.log(`ダッシュボード: ${url}`);
    console.log('  読み取り専用です。予算枠を閉じる操作は revoke コマンドに残しています。');
    console.log('  127.0.0.1 にのみ待ち受けています。認証は持たないため外部へ公開しないでください。');
    console.log('\n  Ctrl+C で終了');
  },

  /** その時点の状態を 1 枚の HTML に保存する。共有・提出用。 */
  async snapshot() {
    const ownerAddress = addressOrDie();
    const out = args.out ?? 'leash-dashboard.html';
    const { html, data } = await snapshotHtml({
      ownerAddress, policyPath: args.policy, statePath: args.state,
    });
    fs.writeFileSync(out, html);
    console.log(`保存しました: ${out}`);
    console.log(`  予算枠 ${data.budgets.length} 件・記録 ${data.activity.length} 件`);
    console.log(`  エージェント側が動かせる上限の合計: ${data.totals.reachableXrp} XRP`);
    for (const w of data.warnings) console.log(`  ⚠ ${w}`);
  },
};

if (!cmd || !commands[cmd]) {
  console.log(`XRPL Leash — 予算の持ち主のための操作

  new-agent [--out <path>]              エージェント用の鍵を作る
  grant --payee <addr> --cap <XRP>      予算枠を作る
        --agent-pubkey <hex> [--expires <秒>]
  list  [--address <addr>]              予算枠と消化状況を見る
  revoke --channel <id>                 予算枠を閉じる
  dashboard [--address <addr>]          読み取り専用のダッシュボードを開く
            [--policy <path>] [--state <path>] [--port 7788]
  snapshot  [--address <addr>] [--out <path>]
            [--policy <path>]           現状を1枚の HTML に保存する

環境変数
  LEASH_OWNER_SEED   予算の持ち主のシード（grant / revoke に必要）
`);
  process.exit(cmd ? 1 : 0);
}

commands[cmd]().catch((e) => { console.error('エラー:', e.message); process.exit(1); });
