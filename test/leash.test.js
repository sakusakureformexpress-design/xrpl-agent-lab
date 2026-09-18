/**
 * 決済経路（src/leash/）のうち、ネットワークを必要としない部分の単体テスト。
 * 鍵の生成と、Payment Channel クレームへの署名だけを対象にする。
 * 台帳へ送信する経路（owner/payee）は src/verify/ の testnet 検証が担当する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPaymentChannelClaim } from 'xrpl';
import { LeashAgent } from '../src/leash/agent.js';
import { LEASH_SOURCE_TAG } from '../src/leash/constants.js';

/** 署名は台帳の状態に依存しないので、チャネルIDは固定の 64 桁 hex でよい。 */
const CHANNEL = '5DB01B7FFED6B67E6B0414DED11E051D2EE2B7619CE0EAA6286D67A3A4D5BBC1';
const OTHER_CHANNEL = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';

// --- 鍵ペア -----------------------------------------------------------------

test('LeashAgent.create() は鍵ペアを返し、秘密鍵と公開鍵は異なる', () => {
  const agent = LeashAgent.create();
  assert.equal(typeof agent.privateKey, 'string');
  assert.equal(typeof agent.publicKey, 'string');
  assert.ok(agent.privateKey.length > 0);
  assert.ok(agent.publicKey.length > 0);
  assert.notEqual(agent.privateKey, agent.publicKey);
  assert.match(agent.privateKey, /^[0-9A-F]+$/);
  assert.match(agent.publicKey, /^[0-9A-F]+$/);
});

test('LeashAgent.create() は毎回異なる鍵ペアを返す', () => {
  const a = LeashAgent.create();
  const b = LeashAgent.create();
  assert.notEqual(a.privateKey, b.privateKey);
  assert.notEqual(a.publicKey, b.publicKey);
});

test('LeashAgent は口座アドレスを持たない（鍵だけを持つ）', () => {
  const agent = LeashAgent.create();
  assert.equal(agent.address, undefined);
  assert.equal(agent.wallet, undefined);
  assert.equal(agent.seed, undefined);
});

test('コンストラクタに渡した鍵をそのまま保持する', () => {
  const src = LeashAgent.create();
  const agent = new LeashAgent({ privateKey: src.privateKey, publicKey: src.publicKey });
  assert.equal(agent.privateKey, src.privateKey);
  assert.equal(agent.publicKey, src.publicKey);
});

// --- 署名 -------------------------------------------------------------------

test('authorize() は同じ入力に対して決定的な署名を返す', () => {
  const agent = LeashAgent.create();
  const a = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1.5' });
  const b = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1.5' });
  assert.equal(a.signature, b.signature);
  assert.deepEqual(a, b);
});

test('authorize() は異なる金額に対して異なる署名を返す', () => {
  const agent = LeashAgent.create();
  const a = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  const b = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '2' });
  assert.notEqual(a.signature, b.signature);
});

test('authorize() は異なるチャネルに対して異なる署名を返す', () => {
  const agent = LeashAgent.create();
  const a = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  const b = agent.authorize({ channelId: OTHER_CHANNEL, cumulativeXrp: '1' });
  assert.notEqual(a.signature, b.signature);
});

test('別のエージェントは同じ伝票に対して異なる署名を返す', () => {
  const a = LeashAgent.create().authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  const b = LeashAgent.create().authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  assert.notEqual(a.signature, b.signature);
});

test('authorize() の戻り値は伝票として必要な4項目を持ち、cumulativeXrp は文字列', () => {
  const agent = LeashAgent.create();
  const v = agent.authorize({ channelId: CHANNEL, cumulativeXrp: 2 });
  assert.deepEqual(Object.keys(v).sort(), ['channelId', 'cumulativeXrp', 'publicKey', 'signature']);
  assert.equal(v.channelId, CHANNEL);
  assert.equal(v.cumulativeXrp, '2');
  assert.equal(v.publicKey, agent.publicKey);
  assert.match(v.signature, /^[0-9A-F]+$/);
});

// --- 署名の正当性（xrpl の検証器で確認する）--------------------------------

test('生成した署名は xrpl の verifyPaymentChannelClaim を通る', () => {
  const agent = LeashAgent.create();
  const v = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1.5' });
  assert.equal(verifyPaymentChannelClaim(v.channelId, v.cumulativeXrp, v.signature, v.publicKey), true);
});

test('いろいろな金額の署名がすべて検証を通る', () => {
  const agent = LeashAgent.create();
  for (const amount of ['0.000001', '1', '10.5', '1000', '100000']) {
    const v = agent.authorize({ channelId: CHANNEL, cumulativeXrp: amount });
    assert.equal(
      verifyPaymentChannelClaim(v.channelId, v.cumulativeXrp, v.signature, v.publicKey),
      true,
      `${amount} XRP の署名が検証を通らない`,
    );
  }
});

test('金額を改竄した伝票は検証を通らない', () => {
  const agent = LeashAgent.create();
  const v = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  assert.equal(verifyPaymentChannelClaim(v.channelId, '1000', v.signature, v.publicKey), false);
});

test('チャネルを差し替えた伝票は検証を通らない', () => {
  const agent = LeashAgent.create();
  const v = agent.authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  assert.equal(verifyPaymentChannelClaim(OTHER_CHANNEL, v.cumulativeXrp, v.signature, v.publicKey), false);
});

test('別のエージェントの公開鍵では検証を通らない', () => {
  const v = LeashAgent.create().authorize({ channelId: CHANNEL, cumulativeXrp: '1' });
  const other = LeashAgent.create();
  assert.equal(verifyPaymentChannelClaim(v.channelId, v.cumulativeXrp, v.signature, other.publicKey), false);
});

// --- 定数 -------------------------------------------------------------------

test('LEASH_SOURCE_TAG は uint32 の範囲に収まる整数', () => {
  assert.equal(typeof LEASH_SOURCE_TAG, 'number');
  assert.ok(Number.isInteger(LEASH_SOURCE_TAG), 'SourceTag が整数でない');
  assert.ok(LEASH_SOURCE_TAG >= 0, 'SourceTag が負');
  assert.ok(LEASH_SOURCE_TAG <= 4294967295, 'SourceTag が uint32 の上限を超えている');
});

// !!! 既知の不具合を記録するテスト（意図的に失敗させたまま残している）!!!
// src/leash/constants.js:2 は `1279414611; // 0x4C454153 = "LEAS"` と書かれているが、
// 1279414611 は 0x4C425153（ASCII "LBQS"）であり、0x4C454153 は 1279607123。
// 十進リテラルと注釈が食い違っている。README が謳う「台帳から採用状況を集計できる」
// タグの値そのものなので、どちらが正なのかを決めて直す必要がある。
test('LEASH_SOURCE_TAG は ASCII "LEAS" に対応する', () => {
  assert.equal(LEASH_SOURCE_TAG, 0x4c454153);
  const hex = LEASH_SOURCE_TAG.toString(16).toUpperCase();
  assert.equal(Buffer.from(hex, 'hex').toString('ascii'), 'LEAS');
});
