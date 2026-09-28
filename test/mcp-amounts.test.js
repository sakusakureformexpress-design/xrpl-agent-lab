/**
 * MCP サーバの伝票金額の計算（src/mcp/amounts.js）。
 * 浮動小数点を通さないことを固定する（セキュリティレビュー MEDIUM-1 の回帰テスト）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { xrpToDropsBig, dropsToXrpStr, nextVoucher } from '../src/mcp/amounts.js';

test('XRP ⇔ drops の往復が正確', () => {
  assert.equal(xrpToDropsBig('0.1'), 100000n);
  assert.equal(xrpToDropsBig('10'), 10000000n);
  assert.equal(xrpToDropsBig('0.000001'), 1n);
  assert.equal(dropsToXrpStr(300000n), '0.3');
  assert.equal(dropsToXrpStr(10000000n), '10');
});

test('不正な金額の書式は受け付けない', () => {
  for (const bad of ['', 'abc', '-1', '1e3', '0.1234567', '01', '.5', ' 1', '1.']) {
    assert.equal(xrpToDropsBig(bad), null, bad);
  }
});

test('0.1 + 0.2 が 0.3 になる（Number なら 0.30000000000000004）', () => {
  const r = nextVoucher({ spentDrops: '100000', capDrops: '10000000', amountXrp: '0.2' });
  assert.equal(r.ok, true);
  assert.equal(r.cumulativeXrp, '0.3');
  assert.equal(r.cumulativeDrops, 300000n);
  assert.equal(r.remainingXrp, '9.7');
});

test('ちょうど上限までは通り、1 drop でも超えたら断る', () => {
  assert.equal(nextVoucher({ spentDrops: '9900000', capDrops: '10000000', amountXrp: '0.1' }).ok, true);
  const over = nextVoucher({ spentDrops: '9900000', capDrops: '10000000', amountXrp: '0.100001' });
  assert.equal(over.ok, false);
  assert.match(over.reason, /tecUNFUNDED_PAYMENT/);
});

test('未換金の伝票がある場合は、その額を基準に積み上げる', () => {
  // 台帳上は 1 XRP 換金済み、発行済みの最大は 3 XRP（未換金）
  const r = nextVoucher({ spentDrops: '1000000', capDrops: '10000000', issuedDrops: 3000000n, amountXrp: '0.5' });
  assert.equal(r.cumulativeXrp, '3.5');
});

test('0 以下や書式違いの金額は断る', () => {
  assert.equal(nextVoucher({ spentDrops: '0', capDrops: '10000000', amountXrp: '0' }).ok, false);
  assert.equal(nextVoucher({ spentDrops: '0', capDrops: '10000000', amountXrp: '-1' }).ok, false);
  assert.equal(nextVoucher({ spentDrops: '0', capDrops: '10000000', amountXrp: '0.1234567' }).ok, false);
});

test('台帳の値は drops のまま扱い、2^53 を超えても丸めない', () => {
  // 99999999999999999 drops は Number にすると 100000000000000000 に丸まる
  const r = nextVoucher({ spentDrops: '99999999999999998', capDrops: '99999999999999999', amountXrp: '0.000001' });
  assert.equal(r.ok, true);
  assert.equal(r.cumulativeDrops, 99999999999999999n);
  assert.equal(r.remainingXrp, '0');
});

test('台帳の値が読めなければ断る', () => {
  assert.equal(nextVoucher({ spentDrops: '1e6', capDrops: '10000000', amountXrp: '1' }).ok, false);
});
