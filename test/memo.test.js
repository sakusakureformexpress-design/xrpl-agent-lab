import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMemo, parseMemo, policyHash } from '../src/leash/memo.js';

test('policyHash: 同じ入力から同じハッシュ', () => {
  const a = policyHash('{"x":1}');
  assert.equal(a, policyHash('{"x":1}'));
  assert.notEqual(a, policyHash('{"x":2}'));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('buildMemo: 中身が無ければ undefined', () => {
  assert.equal(buildMemo(), undefined);
  assert.equal(buildMemo({}), undefined);
});

test('buildMemo → parseMemo で往復できる', () => {
  const memos = buildMemo({
    agent: 'research-bot',
    policy: 'a'.repeat(64),
    invoice: 'INV-001',
    resource: 'https://api.example.com/x',
  });
  const back = parseMemo(memos);
  assert.equal(back.agent, 'research-bot');
  assert.equal(back.policy, 'a'.repeat(32), 'ポリシーハッシュは32文字に切り詰める');
  assert.equal(back.invoice, 'INV-001');
  assert.equal(back.resource, 'https://api.example.com/x');
});

test('buildMemo: MemoType / MemoFormat / MemoData が16進', () => {
  const [m] = buildMemo({ agent: 'bot' });
  for (const f of ['MemoType', 'MemoFormat', 'MemoData']) {
    assert.match(m.Memo[f], /^[0-9A-F]+$/, `${f} が大文字16進でない`);
  }
});

test('buildMemo: 1KB を超えない', () => {
  const [m] = buildMemo({
    agent: 'a'.repeat(200),
    policy: 'b'.repeat(64),
    invoice: 'c'.repeat(200),
    resource: 'https://example.com/' + 'd'.repeat(2000),
  });
  const bytes = (m.Memo.MemoType.length + m.Memo.MemoFormat.length + m.Memo.MemoData.length) / 2;
  assert.ok(bytes <= 1024, `1KB を超えた: ${bytes}`);
});

test('parseMemo: 壊れた入力でも例外を投げない', () => {
  assert.equal(parseMemo(undefined), null);
  assert.equal(parseMemo([]), null);
  assert.equal(parseMemo([{ Memo: { MemoType: 'ZZZZ', MemoData: 'ZZZZ' } }]), null);
  assert.equal(parseMemo([{ Memo: {} }]), null);
  assert.equal(parseMemo([{}]), null);
});

test('parseMemo: 他人のメモは無視する', () => {
  const foreign = { Memo: { MemoType: Buffer.from('other/v1').toString('hex').toUpperCase(),
                            MemoData: Buffer.from('{"x":1}').toString('hex').toUpperCase() } };
  const [mine] = buildMemo({ agent: 'bot' });
  assert.equal(parseMemo([foreign]), null);
  assert.equal(parseMemo([foreign, mine]).agent, 'bot', '自分のメモは見つける');
});
