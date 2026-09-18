/**
 * 支払先アドレスとドメインの双方向検証。
 *
 * 人間は「実行時にはじめて分かるアドレス」を事前承認できない。
 * だが「どのサービスから買ってよいか」はドメイン単位で承認できる。
 *
 * XRPL には、ドメインと口座の紐付けを双方向で証明する仕組みがある:
 *   1. ドメイン側が `/.well-known/xrp-ledger.toml` の [[ACCOUNTS]] で口座を宣言する
 *   2. 口座側が AccountRoot.Domain にそのドメインを設定する
 *   → **両方が一致したときだけ**、同じ主体が両方を支配している証拠になる
 *     https://xrpl.org/docs/references/xrp-ledger-toml
 *
 * これにより、攻撃者が仕込んだアドレスは「承認済みドメインが claim していない」
 * ため弾ける。
 *
 * 注意: ここはネットワークに出るため、SSRF を避ける実装にしてある。
 *   - https のみ。リダイレクトは追わない
 *   - 取得先は「エージェントが実際に叩いた URL のホスト」だけ
 *   - タイムアウトとサイズ上限あり
 */
import { rpc } from '../lib/rpc.js';

const TOML_TIMEOUT_MS = 8000;
const TOML_MAX_BYTES = 256 * 1024;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map();   // host -> { at, accounts: Set<string> }

/** ホスト名として妥当か。IPアドレスや内部名は拒否する。 */
export function isPublicHostname(host) {
  if (typeof host !== 'string' || host.length === 0 || host.length > 253) return false;
  if (!/^[a-z0-9.-]+$/i.test(host)) return false;
  if (!host.includes('.')) return false;                 // localhost 等
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;   // 生のIPv4
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return false;
  return true;
}

/**
 * xrp-ledger.toml の [[ACCOUNTS]] だけを読む最小パーサ。
 * 依存を増やさないため自前。想定外の構文は単に無視する。
 */
export function parseTomlAccounts(text, network) {
  const accounts = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (line === '[[ACCOUNTS]]') { cur = {}; accounts.push(cur); continue; }
    if (/^\[\[?[A-Za-z_]+\]?\]$/.test(line)) { cur = null; continue; }  // 別セクション
    if (!cur) continue;
    const m = line.match(/^([A-Za-z_]+)\s*=\s*"([^"]*)"\s*$/);
    if (m) cur[m[1].toLowerCase()] = m[2];
  }
  return new Set(
    accounts
      .filter((a) => a.address && (!network || !a.network || a.network.toLowerCase() === network))
      .map((a) => a.address),
  );
}

async function fetchTomlAccounts(host, network) {
  const hit = cache.get(host);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.accounts;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TOML_TIMEOUT_MS);
  try {
    const res = await fetch(`https://${host}/.well-known/xrp-ledger.toml`, {
      redirect: 'error',            // 別ホストへ飛ばされない
      signal: ctrl.signal,
      headers: { accept: 'text/plain' },
    });
    if (!res.ok) throw new Error(`toml HTTP ${res.status}`);
    const text = (await res.text()).slice(0, TOML_MAX_BYTES);
    const accounts = parseTomlAccounts(text, network);
    cache.set(host, { at: Date.now(), accounts });
    return accounts;
  } finally {
    clearTimeout(timer);
  }
}

/** 口座が自分で宣言しているドメイン（AccountRoot.Domain、16進）。 */
async function fetchAccountDomain(address) {
  const r = await rpc('account_info', { account: address, ledger_index: 'validated' });
  const hexDomain = r.account_data?.Domain;
  if (!hexDomain) return null;
  return Buffer.from(hexDomain, 'hex').toString('utf8');
}

/**
 * 双方向検証を行う。
 *
 * @param {object} p
 * @param {string} p.host    エージェントが**実際に叩いた** URL のホスト。
 *                           402 の本文が自称する resource ではない
 * @param {string} p.payTo   支払先アドレス
 * @param {string} [p.network] 'main' | 'testnet' など。toml の network と突き合わせる
 * @returns {Promise<{verified:boolean, reason:string}>}
 */
export async function verifyPayeeDomain({ host, payTo, network }) {
  if (!isPublicHostname(host)) {
    return { verified: false, reason: `ホスト名が検証対象外: ${host}` };
  }
  try {
    const claimed = await fetchTomlAccounts(host, network);
    if (!claimed.has(payTo)) {
      return { verified: false, reason: `${host} は ${payTo} を claim していない` };
    }
    const domain = await fetchAccountDomain(payTo);
    if (!domain) {
      return { verified: false, reason: `${payTo} は Domain を設定していない` };
    }
    // 完全一致。サブドメインも含めて一致することが必要
    if (domain.toLowerCase() !== host.toLowerCase()) {
      return { verified: false, reason: `口座の Domain (${domain}) がホスト (${host}) と一致しない` };
    }
    return { verified: true, reason: `${host} と ${payTo} の双方向の紐付けを確認` };
  } catch (e) {
    return { verified: false, reason: `検証に失敗: ${e.message}` };
  }
}
