// XRP Ledger への JSON-RPC クライアント。
// WebSocket はこの実行環境のプロキシを通らないため、JSON-RPC over HTTPS を使う。

export const TESTNET_RPC = 'https://testnet.xrpl-labs.com/';
export const FAUCET = 'https://faucet.altnet.rippletest.net/accounts';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 公開エンドポイントはレート制限をかけてくる（418 / 429）。
 * その場合は指数バックオフで待ってから再試行する。
 */
export async function rpc(method, params = {}, { retries = 6 } = {}) {
  let wait = 2000;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(TESTNET_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params: [params] }),
    });

    if ((res.status === 418 || res.status === 429 || res.status >= 500) && attempt < retries) {
      await sleep(wait);
      wait = Math.min(wait * 2, 30000);
      continue;
    }
    if (!res.ok) throw new Error(`RPC HTTP ${res.status} (${method})`);

    const json = await res.json();
    if (json.result?.error) {
      throw new Error(`RPC error (${method}): ${json.result.error} ${json.result.error_message ?? ''}`);
    }
    return json.result;
  }
}

/** テストネットの蛇口から資金を受け取る。失敗したら例外。 */
export async function fundFromFaucet(address) {
  const res = await fetch(FAUCET, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: address }),
  });
  if (!res.ok) throw new Error(`faucet HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

/** アカウントが台帳に現れるまで待つ（蛇口の反映待ち）。 */
export async function waitForAccount(address, { tries = 25, intervalMs = 4000 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await rpc('account_info', { account: address, ledger_index: 'validated' });
      return r.account_data;
    } catch {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  throw new Error(`アカウントが台帳に現れない: ${address}`);
}

/** 署名済み tx_blob を投げ、確定するまで待って結果を返す。 */
export async function submitAndWait(txBlob, { tries = 25, intervalMs = 4000 } = {}) {
  const submitted = await rpc('submit', { tx_blob: txBlob });
  const hash = submitted.tx_json?.hash;
  const preliminary = submitted.engine_result;

  // tem* / tef* などは台帳に載らないので、その場で確定扱いにする
  if (preliminary && !/^(tes|tec)/.test(preliminary)) {
    return { validated: false, hash, result: preliminary, message: submitted.engine_result_message };
  }

  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const tx = await rpc('tx', { transaction: hash });
      if (tx.validated) {
        return {
          validated: true,
          hash,
          result: tx.meta?.TransactionResult ?? tx.metaData?.TransactionResult,
          ledger_index: tx.ledger_index,
        };
      }
    } catch { /* まだ見つからない */ }
  }
  // 台帳で確定していないものを成功として返さない。
  // preliminary の tesSUCCESS は「今のところ通りそう」以上の意味を持たない。
  return { validated: false, hash, result: 'UNVALIDATED', preliminary, message: '確定待ちでタイムアウト' };
}

/**
 * 現在の手数料水準を drops で返す。
 * 固定値だと混雑時に取り込まれない（open_ledger_fee は負荷で跳ね上がる）。
 */
export async function currentFeeDrops({ multiplier = 1.2, min = 12n, max = 10000n } = {}) {
  try {
    const f = await rpc('fee', {});
    const open = BigInt(f.drops?.open_ledger_fee ?? '10');
    const base = BigInt(f.drops?.minimum_fee ?? '10');
    let want = (open > base ? open : base) * BigInt(Math.round(multiplier * 100)) / 100n;
    if (want < min) want = min;
    if (want > max) want = max;           // 異常値で口座を空にしない
    return want.toString();
  } catch {
    return '20';                          // 取得に失敗しても止まらない
  }
}

/**
 * 署名に必要なフィールドを埋める。
 *
 * Sequence は呼び出し側が明示できる。署名しただけで未送信の tx がある場合、
 * 台帳の Sequence はまだ進んでいないため、続けて署名すると同じ番号になり
 * 片方しか通らない。連続して署名する側が自分で採番する必要がある。
 */
export async function autofill(tx) {
  const info = await rpc('account_info', { account: tx.Account, ledger_index: 'current' });
  const ledger = await rpc('ledger_current', {});
  return {
    ...tx,
    Fee: tx.Fee ?? await currentFeeDrops(),
    Sequence: tx.Sequence ?? info.account_data.Sequence,
    LastLedgerSequence: tx.LastLedgerSequence ?? ledger.ledger_current_index + 40,
  };
}

/** 台帳上の次の Sequence。 */
export async function ledgerSequence(account) {
  const info = await rpc('account_info', { account, ledger_index: 'current' });
  return info.account_data.Sequence;
}
