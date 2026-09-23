import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  dropsToXrpString, usedPercent, severityOf, budgetRows, agentRows, activityRows, totals,
} from '../src/dashboard/data.js';
import { isLocalHost, createServer } from '../src/dashboard/server.js';
import { renderPage } from '../src/dashboard/render.js';
import { LEASH_SOURCE_TAG } from '../src/leash/constants.js';
import { buildMemo } from '../src/leash/memo.js';

const PAYEE = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
const OWNER = 'rNWHpzX6WUD8CU3vrrNJ4tuRnPFTV1X764';

describe('drops の表示', () => {
  test('整数の XRP', () => assert.equal(dropsToXrpString('10000000'), '10'));
  test('端数は落とさない', () => assert.equal(dropsToXrpString('10000001'), '10.000001'));
  test('末尾の0は詰める', () => assert.equal(dropsToXrpString('1500000'), '1.5'));
  test('0', () => assert.equal(dropsToXrpString('0'), '0'));
  test('1 drop', () => assert.equal(dropsToXrpString('1'), '0.000001'));
  test('Number の精度を超える額でも壊れない', () => {
    // 10^17 drops = 10^11 XRP。Number なら丸められる桁
    assert.equal(dropsToXrpString('100000000000000001'), '100000000000.000001');
  });
  test('負（残高より使用が多い異常値）も落ちない', () => {
    assert.equal(dropsToXrpString('-2500000'), '-2.5');
  });
});

describe('消化率', () => {
  test('半分', () => assert.equal(usedPercent('5000000', '10000000'), 50));
  test('上限 0 でも 0除算しない', () => assert.equal(usedPercent('0', '0'), 0));
  test('巨大な値でも Number に落とさない', () => {
    assert.equal(usedPercent('50000000000000000', '100000000000000000'), 50);
  });

  test('深刻度の境目', () => {
    assert.equal(severityOf(0), 'normal');
    assert.equal(severityOf(69.9), 'normal');
    assert.equal(severityOf(70), 'warning');
    assert.equal(severityOf(89.9), 'warning');
    assert.equal(severityOf(90), 'critical');
    assert.equal(severityOf(100), 'critical');
  });
  test('期限切れは消化率より優先する', () => {
    assert.equal(severityOf(0, { expired: true }), 'expired');
  });
});

describe('予算枠の組み立て', () => {
  const channels = [{
    channel_id: 'C1', destination_account: PAYEE, public_key_hex: 'ED00',
    amount: '10000000', balance: '3000000', settle_delay: 3600,
  }];

  test('上限・使用・残が揃う', () => {
    const [b] = budgetRows(channels);
    assert.equal(b.capXrp, '10');
    assert.equal(b.spentXrp, '3');
    assert.equal(b.remainingXrp, '7');
    assert.equal(b.percent, 30);
    assert.equal(b.severity, 'normal');
    assert.equal(b.expired, false);
  });

  test('cancel_after は 2000-01-01 起点として解釈する', () => {
    const [b] = budgetRows([{ ...channels[0], cancel_after: 800000000 }]);
    // 946684800 + 800000000 = 1746684800 → 2025-05-08
    assert.equal(b.expiresAt, new Date(1746684800000).toISOString());
  });

  test('過ぎた期限は expired になる', () => {
    const [b] = budgetRows([{ ...channels[0], cancel_after: 100 }], Date.now());
    assert.equal(b.expired, true);
    assert.equal(b.severity, 'expired');
  });

  test('expiration と cancel_after は早い方を採る', () => {
    const now = Date.UTC(2030, 0, 1);
    const early = Math.floor((Date.UTC(2031, 0, 1) - 946684800000) / 1000);
    const late = Math.floor((Date.UTC(2032, 0, 1) - 946684800000) / 1000);
    const [b] = budgetRows([{ ...channels[0], cancel_after: late, expiration: early }], now);
    assert.equal(b.expiresAt, new Date(Date.UTC(2031, 0, 1)).toISOString());
  });

  test('空でも落ちない', () => {
    assert.deepEqual(budgetRows(undefined), []);
    assert.deepEqual(budgetRows([]), []);
  });
});

describe('合計', () => {
  const budgets = budgetRows([
    { channel_id: 'A', destination_account: PAYEE, amount: '10000000', balance: '3000000' },
    { channel_id: 'B', destination_account: PAYEE, amount: '5000000', balance: '0' },
  ]);

  test('残枠を足す', () => {
    const t = totals({ budgets, brokerBalanceDrops: '2000000', ownerBalanceDrops: '900000000' });
    assert.equal(t.ledgerEnforcedXrp, '12');          // 7 + 5
    assert.equal(t.softwareEnforcedXrp, '2');
    assert.equal(t.reachableXrp, '14');
    assert.equal(t.budgetCount, 2);
  });

  test('期限切れの枠は残枠に数えない', () => {
    const expired = budgetRows([
      { channel_id: 'A', destination_account: PAYEE, amount: '10000000', balance: '0', cancel_after: 100 },
    ], Date.now());
    const t = totals({ budgets: expired, brokerBalanceDrops: null, ownerBalanceDrops: null });
    assert.equal(t.ledgerEnforcedXrp, '0');
    assert.equal(t.budgetCount, 0);
    assert.equal(t.expiredCount, 1);
  });

  test('ブローカー未稼働なら null のまま（0 と偽らない）', () => {
    const t = totals({ budgets, brokerBalanceDrops: null, ownerBalanceDrops: null });
    assert.equal(t.softwareEnforcedXrp, null);
    assert.equal(t.reachableXrp, '12');
  });
});

describe('エージェントの当日状況', () => {
  const policy = {
    agents: {
      shopper: {
        limits: { perPaymentMaxDrops: '1000000', dailyTotalMaxDrops: '5000000', newPayeesPerDay: 2 },
        payees: { alwaysAllow: [PAYEE], denyList: [], autoApprove: true, domains: { allowed: ['api.example.com'], requireVerified: true } },
      },
    },
  };

  test('当日の使用量を拾う', () => {
    const [a] = agentRows(policy, { 'shopper:2026-09-19': { spentDrops: '2500000', payees: [PAYEE] } }, '2026-09-19');
    assert.equal(a.spentXrp, '2.5');
    assert.equal(a.dailyCapXrp, '5');
    assert.equal(a.percent, 50);
    assert.equal(a.payeesToday.length, 1);
    // ポリシーの実際のキー名（alwaysAllow / domains.allowed）を読めていること
    assert.deepEqual(a.alwaysAllow, [PAYEE]);
    assert.deepEqual(a.allowedDomains, ['api.example.com']);
    assert.equal(a.requireVerifiedDomain, true);
    assert.equal(a.autoApprove, true);
  });

  test('別の日の記録は当日に混ぜない', () => {
    const [a] = agentRows(policy, { 'shopper:2026-09-18': { spentDrops: '5000000', payees: [] } }, '2026-09-19');
    assert.equal(a.spentXrp, '0');
  });

  test('ポリシーに無いエージェントは行にしない', () => {
    const rows = agentRows(policy, { 'ghost:2026-09-19': { spentDrops: '9', payees: [] } }, '2026-09-19');
    assert.deepEqual(rows.map((r) => r.name), ['shopper']);
  });

  test('プロトタイプ由来のキーを拾わない', () => {
    // Object.keys は継承プロパティを列挙しないことを固定しておく
    const poisoned = { agents: Object.create({ evil: { limits: {} } }) };
    poisoned.agents.shopper = policy.agents.shopper;
    assert.deepEqual(agentRows(poisoned, {}, '2026-09-19').map((r) => r.name), ['shopper']);
  });
});

describe('台帳の記録の抽出', () => {
  const entries = [
    { tx: { TransactionType: 'Payment', Account: OWNER, Destination: PAYEE, Amount: '3000000', SourceTag: LEASH_SOURCE_TAG, date: 800000000 },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'H1' },
    { tx: { TransactionType: 'Payment', Account: OWNER, Destination: PAYEE, Amount: '99000000', SourceTag: LEASH_SOURCE_TAG },
      meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' }, hash: 'H2' },
    // 別のツールの取引。混ぜてはいけない
    { tx: { TransactionType: 'Payment', Account: OWNER, Destination: PAYEE, Amount: '1000000', SourceTag: 42 },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'H3' },
    // SourceTag 無し
    { tx: { TransactionType: 'Payment', Account: OWNER, Amount: '1' }, meta: {}, hash: 'H4' },
  ];

  test('SourceTag が一致するものだけ残す', () => {
    const rows = activityRows(entries, { account: OWNER });
    assert.deepEqual(rows.map((r) => r.hash), ['H1', 'H2']);
  });

  test('tec は拒否として印を付ける', () => {
    const [ok, no] = activityRows(entries, { account: OWNER });
    assert.equal(ok.rejected, false);
    assert.equal(no.rejected, true);
    assert.equal(no.result, 'tecUNFUNDED_PAYMENT');
  });

  test('API v2 の tx_json でも読める', () => {
    const rows = activityRows([{
      tx_json: { TransactionType: 'Payment', Account: OWNER, Destination: PAYEE, Amount: '1000000', SourceTag: LEASH_SOURCE_TAG },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'V2',
    }], { account: OWNER });
    assert.deepEqual(rows.map((r) => r.hash), ['V2']);
  });

  test('自分が出したものと受け取ったものを見分ける', () => {
    const [a] = activityRows(entries, { account: OWNER });
    assert.equal(a.direction, 'out');
    const [b] = activityRows(entries, { account: PAYEE });
    assert.equal(b.direction, 'in');
  });

  test('自分たちのメモだけを構造化して取り、他人のメモは描画対象にしない', () => {
    const [ours] = buildMemo({ agent: 'shopper', policy: 'a'.repeat(64), invoice: 'inv-1' });
    const rows = activityRows([{
      tx: {
        TransactionType: 'Payment', Account: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG,
        Memos: [
          ours,
          // 第三者が書いたメモ。画面には出さず、件数だけ数える
          { Memo: { MemoType: Buffer.from('other/v1', 'utf8').toString('hex'),
                    MemoData: Buffer.from('<img src=x onerror=alert(1)>', 'utf8').toString('hex') } },
        ],
      },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'M',
    }], { account: OWNER });
    assert.equal(rows[0].leash.agent, 'shopper');
    assert.equal(rows[0].leash.invoice, 'inv-1');
    assert.equal(rows[0].foreignMemos, 1);
    assert.ok(!JSON.stringify(rows[0]).includes('onerror'));
  });

  test('壊れたメモでも落ちない', () => {
    const rows = activityRows([{
      tx: { TransactionType: 'Payment', Account: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG,
            Memos: [{ Memo: { MemoData: 'zzzz' } }, { Memo: { MemoData: 'abc' } }] },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'M2',
    }], { account: OWNER });
    assert.equal(rows[0].leash, null);
    assert.equal(rows[0].foreignMemos, 2);
  });

  test('PaymentChannelClaim は Channel を持つ', () => {
    const rows = activityRows([{
      tx: { TransactionType: 'PaymentChannelClaim', Account: OWNER, Channel: 'CH1', Amount: '1', SourceTag: LEASH_SOURCE_TAG },
      meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' }, hash: 'C',
    }], { account: OWNER });
    assert.equal(rows[0].channel, 'CH1');
    assert.equal(rows[0].rejected, true);
  });

  test('複数の口座から集めても新しい順に並ぶ', () => {
    const mk = (hash, date) => ({
      tx: { TransactionType: 'Payment', Account: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG, date },
      meta: { TransactionResult: 'tesSUCCESS' }, hash,
    });
    // 所有者の履歴とブローカーの履歴を素朴に連結した並び
    const rows = activityRows([mk('OLD', 700000000), mk('NEW', 800000000), mk('MID', 750000000)]);
    assert.deepEqual(rows.map((r) => r.hash), ['NEW', 'MID', 'OLD']);
  });

  test('並べ替えてから件数を切る（古い方が残らない）', () => {
    const mk = (hash, date) => ({
      tx: { TransactionType: 'Payment', Account: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG, date },
      meta: { TransactionResult: 'tesSUCCESS' }, hash,
    });
    const rows = activityRows([mk('OLD', 700000000), mk('NEW', 800000000)], { limit: 1 });
    assert.deepEqual(rows.map((r) => r.hash), ['NEW']);
  });

  test('自分側の口座を複数渡せる（所有者とブローカー）', () => {
    const rows = activityRows([{
      tx: { TransactionType: 'Payment', Account: PAYEE, Destination: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: 'A',
    }], { accounts: [OWNER, PAYEE] });
    assert.equal(rows[0].direction, 'out');
  });

  test('件数の上限を守る', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      tx: { TransactionType: 'Payment', Account: OWNER, Amount: '1', SourceTag: LEASH_SOURCE_TAG },
      meta: { TransactionResult: 'tesSUCCESS' }, hash: `X${i}`,
    }));
    assert.equal(activityRows(many, { limit: 5 }).length, 5);
  });
});

describe('描画', () => {
  const snap = {
    generatedAt: '2026-09-19T00:00:00.000Z', network: 'xrpl:1', sourceTag: LEASH_SOURCE_TAG,
    owner: { address: OWNER, balanceXrp: '100' }, broker: null,
    budgets: [], agents: [], activity: [],
    totals: { reachableXrp: '0', ledgerEnforcedXrp: '0', softwareEnforcedXrp: null, ownerBalanceXrp: '100', budgetCount: 0, expiredCount: 0 },
    warnings: [],
  };

  test('埋め込む JSON から </script> を脱出できない', () => {
    // Memo は外部が書ける。ここを抜けられると任意のスクリプトが走る
    const evil = { ...snap, warnings: ['</script><script>alert(1)</script>'] };
    const html = renderPage(evil);
    const embedded = html.slice(html.indexOf('id="snapshot"'));
    assert.ok(!embedded.includes('</script><script>alert(1)'));
    assert.ok(embedded.includes('\\u003c/script'));
  });

  test('保存版には再取得ボタンを出さない', () => {
    assert.ok(renderPage(snap, { live: true }).includes('id="reload"'));
    assert.ok(!renderPage(snap, { live: false }).includes('id="reload"'));
    assert.ok(renderPage(snap, { live: false }).includes('SNAPSHOT'));
  });

  test('ダークモードは OS 設定とトグルの両方で効く', () => {
    const html = renderPage(snap);
    assert.ok(html.includes('@media (prefers-color-scheme:dark)'));
    assert.ok(html.includes(':root[data-theme="dark"]'));
  });
});

describe('サーバの入口', () => {
  test('localhost を指す Host だけ通す', () => {
    for (const h of ['localhost', 'localhost:7788', '127.0.0.1:7788', '[::1]:7788']) {
      assert.equal(isLocalHost(h), true, h);
    }
    // DNS リバインディング: 攻撃者のドメインが 127.0.0.1 に解決されても Host は自分のまま
    for (const h of ['evil.com', 'evil.com:7788', '127.0.0.1.evil.com', 'localhost.evil.com', '', undefined, null, 1]) {
      assert.equal(isLocalHost(h), false, String(h));
    }
  });

  // fetch() は Host ヘッダの上書きを禁じている（禁止ヘッダ）。
  // Host 検証そのものを試したいので生の http.request を使う。
  const request = (server, { method = 'GET', path = '/', host } = {}) =>
    new Promise((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const req = http.request(
          { host: '127.0.0.1', port, path, method, headers: { host: host ? `${host}:${port}` : `127.0.0.1:${port}` } },
          (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (c) => { body += c; });
            res.on('end', () => { server.close(); resolve({ status: res.statusCode, body }); });
          },
        );
        req.on('error', (e) => { server.close(); reject(e); });
        req.end();
      });
    });

  test('GET 以外は受けない（書き込む口を持たない）', async () => {
    const r = await request(createServer({ ownerAddress: OWNER }), { method: 'POST' });
    assert.equal(r.status, 405);
  });

  test('外部ドメインの Host は拒否する', async () => {
    const r = await request(createServer({ ownerAddress: OWNER }), { host: 'evil.com' });
    assert.equal(r.status, 403);
  });

  test('未知のパスは 404', async () => {
    const r = await request(createServer({ ownerAddress: OWNER }), { path: '/../../etc/passwd' });
    assert.equal(r.status, 404);
  });
});
