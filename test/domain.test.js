import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/broker/policy.js';
import { parseTomlAccounts, isPublicHostname } from '../src/broker/domain.js';

const VENDOR = 'rLTTLGUvwWEthByCjQvKXtoYnKU4YjTpfv';
const ATTACKER = 'rHRXF7izTmAfrsYSwR5Zf52UWoohn4ueTb';
const state = () => ({ spentDrops: '0', payees: [] });

const policyWith = (domains) => ({
  brokerAccount: 'rBroker',
  agents: {
    bot: {
      limits: { perPaymentMaxDrops: '100000', dailyTotalMaxDrops: '1000000' },
      payees: { autoApprove: true, ...(domains ? { domains } : {}) },
    },
  },
});

const ask = (policy, { payTo = VENDOR, host, verified, reason, amountDrops = '20000' } = {}) =>
  decide({
    policy, agentName: 'bot', payTo, amountDrops, state: state(),
    domain: host === undefined ? undefined : { host, verified: !!verified, reason },
  });

test('ドメイン設定が無ければ、従来どおり通る（後方互換）', () => {
  assert.equal(ask(policyWith(null)).code, 'OK');
});

test('許可ドメインで双方向検証を通っていれば通る', () => {
  const p = policyWith({ allowed: ['api-a.com'], requireVerified: true });
  assert.equal(ask(p, { host: 'api-a.com', verified: true }).code, 'OK');
});

test('攻撃シナリオ: 承認済みドメインが claim していないアドレスは弾く', () => {
  const p = policyWith({ allowed: ['api-a.com'], requireVerified: true });
  // 攻撃者が 402 に自分のアドレスを仕込んだ。ドメインは claim していないので未検証になる
  const r = ask(p, {
    payTo: ATTACKER, host: 'api-a.com', verified: false,
    reason: 'api-a.com は rHRX… を claim していない',
  });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'DOMAIN_UNVERIFIED');
  assert.match(r.reason, /claim/);
});

test('攻撃シナリオ: 許可していないドメインを叩かせても弾く', () => {
  const p = policyWith({ allowed: ['api-a.com'], requireVerified: true });
  const r = ask(p, { payTo: ATTACKER, host: 'attacker.example', verified: true });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'DOMAIN_NOT_ALLOWED');
});

test('ホスト名が渡されない場合も、許可リストがあれば弾く', () => {
  const p = policyWith({ allowed: ['api-a.com'], requireVerified: true });
  assert.equal(ask(p, { host: null, verified: false }).code, 'DOMAIN_NOT_ALLOWED');
});

test('requireVerified が false なら、未検証でも少額だけ通す', () => {
  const p = policyWith({ requireVerified: false, unverifiedMaxDrops: '1000' });
  assert.equal(ask(p, { host: 'new-api.com', verified: false, amountDrops: '500' }).code, 'OK');
  const over = ask(p, { host: 'new-api.com', verified: false, amountDrops: '5000' });
  assert.equal(over.allow, false);
  assert.equal(over.code, 'OVER_UNVERIFIED_LIMIT');
});

test('検証済みなら unverifiedMaxDrops は適用されない', () => {
  const p = policyWith({ requireVerified: false, unverifiedMaxDrops: '1000' });
  assert.equal(ask(p, { host: 'api-a.com', verified: true, amountDrops: '50000' }).code, 'OK');
});

test('大文字小文字はドメイン比較で無視する', () => {
  const p = policyWith({ allowed: ['API-A.com'], requireVerified: true });
  assert.equal(ask(p, { host: 'api-a.COM', verified: true }).code, 'OK');
});

test('金額の判定はドメイン判定より先に効く', () => {
  const p = policyWith({ allowed: ['api-a.com'], requireVerified: true });
  const r = ask(p, { host: 'attacker.example', verified: false, amountDrops: '999999' });
  assert.equal(r.code, 'OVER_PER_PAYMENT');
});

test('parseTomlAccounts: network で絞り込む', () => {
  const toml = [
    '[[ACCOUNTS]]', 'address = "rA1"', 'network = "testnet"',
    '[[ACCOUNTS]]', 'address = "rM1"', 'network = "main"',
    '[[ACCOUNTS]]', 'address = "rN1"',
    '[[VALIDATORS]]', 'public_key = "nHU"',
  ].join('\n');
  assert.deepEqual([...parseTomlAccounts(toml, 'testnet')].sort(), ['rA1', 'rN1']);
  assert.deepEqual([...parseTomlAccounts(toml)].sort(), ['rA1', 'rM1', 'rN1']);
});

test('parseTomlAccounts: コメントと他セクションを無視する', () => {
  const toml = '# comment\n[[ACCOUNTS]]\naddress = "rA1" # trailing\n[METADATA]\naddress = "rEVIL"';
  assert.deepEqual([...parseTomlAccounts(toml)], ['rA1']);
});

test('isPublicHostname: 内部向けホストを拒否する', () => {
  for (const ok of ['api.example.com', 'a.b.co.jp', 'x-y.example.org']) {
    assert.ok(isPublicHostname(ok), `${ok} は通すべき`);
  }
  for (const ng of ['localhost', '127.0.0.1', '192.168.1.1', 'foo.local', 'svc.internal', '', 'no-dot', 'a b.com']) {
    assert.ok(!isPublicHostname(ng), `${ng} は拒否すべき`);
  }
});
