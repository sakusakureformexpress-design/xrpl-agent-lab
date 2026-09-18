/**
 * src/broker/policy.js の単体テスト。
 * ネットワークには一切触れない（decide / validatePolicy は純粋関数）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { decide, validatePolicy } from '../src/broker/policy.js';

// --- テスト用の固定値 -------------------------------------------------------

const PAYEE_A = 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe';
const PAYEE_B = 'rP6YR9uvE5wULGRB2Fgj6Efa8s7XembrVr';
const PAYEE_C = 'rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH';
const PAYEE_D = 'rLHzPsX6oXkzU2qL12kHCH8G8cnZv1rBJh';
const DENIED = 'rfxCbEYYdFxnskypDpBhFWyyk4USZY2pxD';

const PER_PAYMENT_MAX = 100000n; // drops
const DAILY_MAX = 5000000n; // drops

/** 例示ポリシーと同じ形。テストごとに新しい実体を返す。 */
function basePolicy(overrides = {}) {
  const p = {
    version: 1,
    brokerAccount: 'rBrokerAccountAddressHereXXXXX',
    agents: {
      'research-bot': {
        limits: {
          perPaymentMaxDrops: String(PER_PAYMENT_MAX),
          dailyTotalMaxDrops: String(DAILY_MAX),
          newPayeesPerDay: 3,
        },
        payees: { alwaysAllow: [], denyList: [DENIED], autoApprove: true },
      },
    },
  };
  return { ...p, ...overrides };
}

function baseState(overrides = {}) {
  return { spentDrops: '0', payees: [], ...overrides };
}

/**
 * decide の呼び出しを短く書くための薄いラッパ。
 * 既定値はキーの有無で判断する。`undefined` を明示的に渡すテストがあるため、
 * 分割代入の既定値（undefined を既定値で置き換えてしまう）は使えない。
 */
function run(opts = {}) {
  const pick = (k, fallback) => (k in opts ? opts[k] : fallback);
  return decide({
    policy: pick('policy', basePolicy()),
    agentName: pick('agentName', 'research-bot'),
    payTo: pick('payTo', PAYEE_A),
    amountDrops: pick('amountDrops', '1000'),
    state: pick('state', baseState()),
  });
}

// --- 前提そのもののテスト ---------------------------------------------------

test('テスト用の支払先アドレスはすべて形式として妥当', () => {
  for (const a of [PAYEE_A, PAYEE_B, PAYEE_C, PAYEE_D, DENIED]) {
    assert.equal(run({ payTo: a }).code === 'BAD_PAYEE', false, `${a} が BAD_PAYEE 判定された`);
  }
});

// --- 正常系 -----------------------------------------------------------------

test('正常系: ポリシー内の金額・既知の支払先は allow', () => {
  const r = run({ payTo: PAYEE_A, amountDrops: '1000', state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, true);
  assert.equal(r.code, 'OK');
  assert.equal(r.reason, '承認済みの支払先');
});

test('正常系: alwaysAllow の支払先は allow', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.alwaysAllow = [PAYEE_A];
  const r = run({ policy, payTo: PAYEE_A });
  assert.equal(r.allow, true);
  assert.equal(r.code, 'OK');
});

test('正常系: 未知でも autoApprove: true かつ新規枠が残っていれば allow', () => {
  const r = run({ payTo: PAYEE_B });
  assert.equal(r.allow, true);
  assert.equal(r.code, 'OK');
  assert.match(r.reason, /自動承認/);
});

// --- UNKNOWN_AGENT ----------------------------------------------------------

test('UNKNOWN_AGENT: ポリシーに無いエージェント名', () => {
  const r = run({ agentName: 'ghost-bot' });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'UNKNOWN_AGENT');
});

test('UNKNOWN_AGENT: エージェント名が空文字・undefined でも拒否', () => {
  for (const name of ['', undefined, null]) {
    const r = run({ agentName: name });
    assert.equal(r.allow, false);
    assert.equal(r.code, 'UNKNOWN_AGENT');
  }
});

// !!! 既知の不具合を記録するテスト（意図的に失敗させたまま残している）!!!
// policy.agents?.[agentName] はプロトタイプ鎖まで辿るため、'constructor' や
// 'toString' などの名前が「存在するエージェント」と誤認され、UNKNOWN_AGENT に
// ならずに src/broker/policy.js:61 の BigInt(undefined) で TypeError になる。
// agentName は Broker.requestPayment の外部入力なので、拒否ではなく例外で落ちる。
test('UNKNOWN_AGENT: プロトタイプ由来のキーをエージェントとして扱わない', () => {
  for (const name of ['constructor', 'toString', '__proto__']) {
    const r = run({ agentName: name });
    assert.equal(r.allow, false, `${name} が allow された`);
    assert.equal(r.code, 'UNKNOWN_AGENT', `${name} の code が ${r.code}`);
  }
});

// --- BAD_PAYEE --------------------------------------------------------------

test('BAD_PAYEE: アドレス形式が不正なものはすべて拒否', () => {
  const bad = [
    ['空文字', ''],
    ['短すぎる', 'r123'],
    ['r のみ', 'r'],
    ['0x 始まり', '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'],
    ['r 以外で始まる', 'xPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['大文字 R 始まり', 'RPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['日本語混入', 'rPT1Sjq2YGrBMTtt支払先GZHjKu9dyfzbpAYe'],
    ['長すぎる', 'r' + 'A'.repeat(40)],
    ['base58 で禁止の 0', 'r0T1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['base58 で禁止の O', 'rOT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['base58 で禁止の I', 'rIT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['base58 で禁止の l', 'rlT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe'],
    ['前後に空白', ' rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe '],
    ['改行混入', 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe\n'],
    ['undefined', undefined],
    ['null', null],
  ];
  for (const [label, payTo] of bad) {
    const r = run({ payTo });
    assert.equal(r.allow, false, `${label} が allow された`);
    assert.equal(r.code, 'BAD_PAYEE', `${label} の code が ${r.code}`);
  }
});

// --- BAD_AMOUNT -------------------------------------------------------------

test('BAD_AMOUNT: 金額が正の整数 drops でないものはすべて拒否', () => {
  const bad = [
    ['負数', '-100'],
    ['ゼロ', '0'],
    ['ゼロ（複数桁）', '000'],
    ['小数', '1.5'],
    ['小数（.0）', '100.0'],
    ['空文字', ''],
    ['指数表記', '1e5'],
    ['前後に空白', ' 100 '],
    ['非数値', 'abc'],
    ['プラス符号つき', '+100'],
    ['16進', '0x64'],
    ['undefined', undefined],
    ['null', null],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['負の数値型', -1],
    ['数値型のゼロ', 0],
  ];
  for (const [label, amountDrops] of bad) {
    const r = run({ amountDrops });
    assert.equal(r.allow, false, `${label} が allow された`);
    assert.equal(r.code, 'BAD_AMOUNT', `${label} の code が ${r.code}`);
  }
});

test('BAD_AMOUNT: 判定は BAD_PAYEE の後に行われる（両方不正ならアドレス優先）', () => {
  const r = run({ payTo: 'nope', amountDrops: '-1' });
  assert.equal(r.code, 'BAD_PAYEE');
});

// --- DENYLISTED -------------------------------------------------------------

test('DENYLISTED: 拒否リストの支払先は、他が全て正常でも拒否', () => {
  const r = run({ payTo: DENIED, amountDrops: '1' });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'DENYLISTED');
});

test('DENYLISTED: alwaysAllow と両方に載っていても拒否が勝つ', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.alwaysAllow = [DENIED];
  const r = run({ policy, payTo: DENIED });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'DENYLISTED');
});

test('DENYLISTED: 既に当日支払い済みの支払先でも、拒否リスト入りなら拒否', () => {
  const r = run({ payTo: DENIED, state: baseState({ payees: [DENIED] }) });
  assert.equal(r.code, 'DENYLISTED');
});

// --- UNKNOWN_PAYEE ----------------------------------------------------------

test('UNKNOWN_PAYEE: 未知かつ autoApprove: false は拒否', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.autoApprove = false;
  const r = run({ policy, payTo: PAYEE_B });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'UNKNOWN_PAYEE');
});

test('UNKNOWN_PAYEE: autoApprove 未指定（undefined）でも拒否', () => {
  const policy = basePolicy();
  delete policy.agents['research-bot'].payees.autoApprove;
  const r = run({ policy, payTo: PAYEE_B });
  assert.equal(r.code, 'UNKNOWN_PAYEE');
});

test('autoApprove: false でも alwaysAllow / 支払い済みの支払先は allow', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.autoApprove = false;
  policy.agents['research-bot'].payees.alwaysAllow = [PAYEE_A];
  assert.equal(run({ policy, payTo: PAYEE_A }).allow, true);
  assert.equal(run({ policy, payTo: PAYEE_B, state: baseState({ payees: [PAYEE_B] }) }).allow, true);
});

// --- NEW_PAYEE_QUOTA --------------------------------------------------------

test('NEW_PAYEE_QUOTA: 新規支払先が当日の上限に達していれば拒否', () => {
  const state = baseState({ payees: [PAYEE_A, PAYEE_B, PAYEE_C] }); // 新規3件 = 上限
  const r = run({ payTo: PAYEE_D, state });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'NEW_PAYEE_QUOTA');
});

test('NEW_PAYEE_QUOTA: 上限の1つ手前なら通る（境界）', () => {
  const state = baseState({ payees: [PAYEE_A, PAYEE_B] }); // 新規2件 < 3
  const r = run({ payTo: PAYEE_D, state });
  assert.equal(r.allow, true);
  assert.equal(r.code, 'OK');
});

test('NEW_PAYEE_QUOTA: 上限を超えていても、既知の支払先への支払いは通る', () => {
  const state = baseState({ payees: [PAYEE_A, PAYEE_B, PAYEE_C, PAYEE_D] });
  const r = run({ payTo: PAYEE_A, state });
  assert.equal(r.allow, true);
});

test('NEW_PAYEE_QUOTA: newPayeesPerDay 未設定なら新規枠の制限は掛からない', () => {
  const policy = basePolicy();
  delete policy.agents['research-bot'].limits.newPayeesPerDay;
  const state = baseState({ payees: [PAYEE_A, PAYEE_B, PAYEE_C, PAYEE_D] });
  assert.equal(run({ policy, payTo: 'rsA2LpzuawewSBQXkiju3YQTMzW13pAAdW', state }).allow, true);
});

test('NEW_PAYEE_QUOTA: newPayeesPerDay が 0 なら新規はすべて拒否', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].limits.newPayeesPerDay = 0;
  const r = run({ policy, payTo: PAYEE_B });
  assert.equal(r.code, 'NEW_PAYEE_QUOTA');
});

test('alwaysAllow の支払先は新規枠を消費しない', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.alwaysAllow = [PAYEE_A, PAYEE_B, PAYEE_C];
  // 当日 alwaysAllow の3件に支払い済み。新規枠は1件も消費されていないはず。
  const state = baseState({ payees: [PAYEE_A, PAYEE_B, PAYEE_C] });
  const r = run({ policy, payTo: PAYEE_D, state });
  assert.equal(r.allow, true, `alwaysAllow が新規枠を消費している: ${r.code}`);
  assert.equal(r.code, 'OK');
});

test('alwaysAllow の支払先自身は、新規枠が尽きていても通る', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].payees.alwaysAllow = [PAYEE_D];
  const state = baseState({ payees: [PAYEE_A, PAYEE_B, PAYEE_C] });
  const r = run({ policy, payTo: PAYEE_D, state });
  assert.equal(r.allow, true);
});

// --- OVER_PER_PAYMENT -------------------------------------------------------

test('OVER_PER_PAYMENT: 1回の上限を超えると拒否', () => {
  const r = run({ amountDrops: String(PER_PAYMENT_MAX + 1n), state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'OVER_PER_PAYMENT');
});

test('OVER_PER_PAYMENT: ちょうど上限と等しい場合は通る（境界）', () => {
  const r = run({ amountDrops: String(PER_PAYMENT_MAX), state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, true, `上限ちょうどが拒否された: ${r.code}`);
  assert.equal(r.code, 'OK');
});

test('OVER_PER_PAYMENT: 上限 -1 drop も通る（境界）', () => {
  const r = run({ amountDrops: String(PER_PAYMENT_MAX - 1n), state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, true);
});

test('OVER_PER_PAYMENT: 金額判定は支払先の事情より先（未知の支払先でも金額超過が優先）', () => {
  const r = run({ payTo: PAYEE_B, amountDrops: String(PER_PAYMENT_MAX + 1n) });
  assert.equal(r.code, 'OVER_PER_PAYMENT');
});

// --- OVER_DAILY -------------------------------------------------------------

test('OVER_DAILY: 当日合計が上限を超えると拒否', () => {
  const state = baseState({ spentDrops: String(DAILY_MAX - PER_PAYMENT_MAX + 1n), payees: [PAYEE_A] });
  const r = run({ amountDrops: String(PER_PAYMENT_MAX), state });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'OVER_DAILY');
});

test('OVER_DAILY: 合計がちょうど上限と等しい場合は通る（境界）', () => {
  const state = baseState({ spentDrops: String(DAILY_MAX - PER_PAYMENT_MAX), payees: [PAYEE_A] });
  const r = run({ amountDrops: String(PER_PAYMENT_MAX), state });
  assert.equal(r.allow, true, `合計が上限ちょうどで拒否された: ${r.code}`);
  assert.equal(r.code, 'OK');
});

test('OVER_DAILY: 合計が上限 +1 drop だと拒否（境界）', () => {
  const state = baseState({ spentDrops: String(DAILY_MAX - PER_PAYMENT_MAX + 1n), payees: [PAYEE_A] });
  const r = run({ amountDrops: String(PER_PAYMENT_MAX), state });
  assert.equal(r.code, 'OVER_DAILY');
});

test('OVER_DAILY: 既に上限を使い切っていれば 1 drop でも拒否', () => {
  const state = baseState({ spentDrops: String(DAILY_MAX), payees: [PAYEE_A] });
  assert.equal(run({ amountDrops: '1', state }).code, 'OVER_DAILY');
});

test('OVER_DAILY: spentDrops 未指定は 0 として扱われる', () => {
  const state = { payees: [PAYEE_A] };
  const r = run({ amountDrops: '1000', state });
  assert.equal(r.allow, true);
});

test('OVER_DAILY: 1回上限の判定が日次上限より先', () => {
  const state = baseState({ spentDrops: String(DAILY_MAX), payees: [PAYEE_A] });
  const r = run({ amountDrops: String(PER_PAYMENT_MAX + 1n), state });
  assert.equal(r.code, 'OVER_PER_PAYMENT');
});

// --- 巨大な値 ---------------------------------------------------------------

test('巨大な金額（BigInt 範囲・Number 精度外）でも壊れずに拒否できる', () => {
  const huge = '99999999999999999999999';
  const r = run({ amountDrops: huge, state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'OVER_PER_PAYMENT');
});

test('巨大な spentDrops でも壊れずに拒否できる', () => {
  const state = baseState({ spentDrops: '99999999999999999999999', payees: [PAYEE_A] });
  const r = run({ amountDrops: '1', state });
  assert.equal(r.allow, false);
  assert.equal(r.code, 'OVER_DAILY');
});

test('巨大な上限を設定すれば、巨大な金額も通る（Number では表せない領域）', () => {
  const policy = basePolicy();
  policy.agents['research-bot'].limits.perPaymentMaxDrops = '99999999999999999999999';
  policy.agents['research-bot'].limits.dailyTotalMaxDrops = '99999999999999999999999';
  const r = run({ policy, amountDrops: '99999999999999999999998', state: baseState({ payees: [PAYEE_A] }) });
  assert.equal(r.allow, true, `code=${r.code}`);
});

test('Number の安全整数を超える境界が drops 単位で正しく効く', () => {
  const limit = '9007199254740993'; // 2^53 + 1。Number では 2^53 と区別できない
  const policy = basePolicy();
  policy.agents['research-bot'].limits.perPaymentMaxDrops = limit;
  policy.agents['research-bot'].limits.dailyTotalMaxDrops = limit;
  const state = baseState({ payees: [PAYEE_A] });
  assert.equal(run({ policy, amountDrops: limit, state }).allow, true);
  assert.equal(run({ policy, amountDrops: '9007199254740994', state }).code, 'OVER_PER_PAYMENT');
});

// --- 戻り値の形 -------------------------------------------------------------

test('戻り値は常に allow / code / reason を持つ', () => {
  const results = [
    run(),
    run({ agentName: 'ghost' }),
    run({ payTo: 'bad' }),
    run({ amountDrops: '0' }),
    run({ payTo: DENIED }),
  ];
  for (const r of results) {
    assert.equal(typeof r.allow, 'boolean');
    assert.equal(typeof r.code, 'string');
    assert.equal(typeof r.reason, 'string');
    assert.ok(r.reason.length > 0);
  }
});

test('decide は渡されたポリシーと状態を書き換えない', () => {
  const policy = basePolicy();
  const state = baseState({ payees: [PAYEE_A] });
  const snapshot = JSON.stringify({ policy, state });
  run({ policy, payTo: PAYEE_B, state });
  assert.equal(JSON.stringify({ policy, state }), snapshot);
});

// --- validatePolicy ---------------------------------------------------------

test('validatePolicy: 正常なポリシーはエラー0件', () => {
  assert.deepEqual(validatePolicy(basePolicy()), []);
});

test('validatePolicy: 例示ポリシーと同じ形（agents が空）でもエラー0件', () => {
  assert.deepEqual(validatePolicy({ brokerAccount: 'rX', agents: {} }), []);
});

test('validatePolicy: policy が object でない', () => {
  for (const v of [null, undefined, 'policy', 42]) {
    const errs = validatePolicy(v);
    assert.deepEqual(errs, ['policy が object ではない'], `入力: ${String(v)}`);
  }
});

test('validatePolicy: brokerAccount 欠落', () => {
  const p = basePolicy();
  delete p.brokerAccount;
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('brokerAccount')), errs.join(' / '));
});

test('validatePolicy: agents 欠落', () => {
  const p = basePolicy();
  delete p.agents;
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('agents')), errs.join(' / '));
});

test('validatePolicy: agents が object でない', () => {
  const errs = validatePolicy({ brokerAccount: 'rX', agents: 'nope' });
  assert.ok(errs.some((e) => e.includes('agents')), errs.join(' / '));
});

test('validatePolicy: limits の値が数値文字列でない', () => {
  for (const bad of ['abc', '-1', '1.5', '1e5', ' 100 ', '', null]) {
    const p = basePolicy();
    p.agents['research-bot'].limits.perPaymentMaxDrops = bad;
    const errs = validatePolicy(p);
    assert.ok(
      errs.some((e) => e.includes('perPaymentMaxDrops')),
      `perPaymentMaxDrops=${JSON.stringify(bad)} が検出されなかった`,
    );
  }
});

test('validatePolicy: limits そのものが欠落していれば両方エラー', () => {
  const p = basePolicy();
  delete p.agents['research-bot'].limits;
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('perPaymentMaxDrops')), errs.join(' / '));
  assert.ok(errs.some((e) => e.includes('dailyTotalMaxDrops')), errs.join(' / '));
});

test('validatePolicy: dailyTotalMaxDrops が数値文字列でない', () => {
  const p = basePolicy();
  p.agents['research-bot'].limits.dailyTotalMaxDrops = 'たくさん';
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('dailyTotalMaxDrops')), errs.join(' / '));
});

test('validatePolicy: newPayeesPerDay が小数', () => {
  const p = basePolicy();
  p.agents['research-bot'].limits.newPayeesPerDay = 1.5;
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('newPayeesPerDay')), errs.join(' / '));
});

test('validatePolicy: newPayeesPerDay が文字列', () => {
  const p = basePolicy();
  p.agents['research-bot'].limits.newPayeesPerDay = '3';
  const errs = validatePolicy(p);
  assert.ok(errs.some((e) => e.includes('newPayeesPerDay')), errs.join(' / '));
});

test('validatePolicy: newPayeesPerDay 未指定は許容', () => {
  const p = basePolicy();
  delete p.agents['research-bot'].limits.newPayeesPerDay;
  assert.deepEqual(validatePolicy(p), []);
});

test('validatePolicy: エラーメッセージにエージェント名が含まれる', () => {
  const p = basePolicy();
  p.agents['research-bot'].limits.perPaymentMaxDrops = 'abc';
  assert.ok(validatePolicy(p).some((e) => e.includes('research-bot')));
});
