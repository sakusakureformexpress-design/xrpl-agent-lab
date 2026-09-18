/**
 * 検証4: MCP サーバが実際に動くか
 *
 * testnet に予算枠を作り、MCP サーバを別プロセスで起動して
 * JSON-RPC over stdio で叩く。エージェント基盤から見えるとおりの経路。
 */
import { spawn } from 'node:child_process';
import { Wallet } from 'xrpl';
import { LeashOwner } from '../leash/index.js';
import { fundFromFaucet, waitForAccount } from '../lib/rpc.js';

const SERVER = new URL('../mcp/server.js', import.meta.url).pathname;

/** MCP サーバを stdio で駆動する最小クライアント */
class McpStdioClient {
  constructor(env) {
    this.proc = spawn('node', [SERVER], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    this.pending = new Map();
    this.buf = '';
    this.proc.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id != null && this.pending.has(msg.id)) {
            this.pending.get(msg.id)(msg);
            this.pending.delete(msg.id);
          }
        } catch { /* 非JSONは無視 */ }
      }
    });
    this.proc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
    this.id = 0;
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      setTimeout(() => reject(new Error(`timeout: ${method}`)), 60000);
    });
  }
  notify(method, params) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n');
  }
  close() { this.proc.kill(); }
}

const text = (res) => res.result?.content?.map((c) => c.text).join('\n') ?? JSON.stringify(res);

async function main() {
  // ── testnet に予算枠を用意 ───────────────────────────
  const humanW = Wallet.generate();
  const vendorW = Wallet.generate();
  const attacker = Wallet.generate();
  const agentW = Wallet.generate();   // エージェントの鍵。seed を MCP サーバに渡す

  await Promise.all([humanW, vendorW].map((w) => fundFromFaucet(w.address)));
  await Promise.all([humanW, vendorW].map((w) => waitForAccount(w.address)));

  const owner = new LeashOwner(humanW);
  await owner.grantBudget({ payee: vendorW.address, capXrp: '10', agentPublicKey: agentW.publicKey });
  console.log(`予算枠を作成: ${vendorW.address} に 10 XRP\n`);

  // ── MCP サーバを起動 ─────────────────────────────────
  const mcp = new McpStdioClient({
    LEASH_OWNER_ADDRESS: humanW.address,
    LEASH_AGENT_SEED: agentW.seed,
  });

  const init = await mcp.send('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'leash-test', version: '1.0.0' },
  });
  console.log(`■ initialize → ${init.result?.serverInfo?.name} v${init.result?.serverInfo?.version}`);
  mcp.notify('notifications/initialized');

  const tools = await mcp.send('tools/list', {});
  console.log(`\n■ tools/list → ${tools.result.tools.length} 個`);
  for (const t of tools.result.tools) console.log(`   ・${t.name} — ${t.title}`);

  const call = (name, args = {}) => mcp.send('tools/call', { name, arguments: args });

  console.log('\n■ list_budgets');
  console.log(text(await call('list_budgets')).split('\n').map((l) => '   ' + l).join('\n'));

  console.log('\n■ authorize_payment  2 XRP → 承認済みの支払先');
  const ok = await call('authorize_payment', { payee: vendorW.address, amountXrp: '2' });
  console.log(text(ok).split('\n').slice(0, 3).map((l) => '   ' + l).join('\n'));
  console.log(`   エラー扱い: ${ok.result?.isError ? 'はい' : 'いいえ'}`);

  console.log('\n■ authorize_payment  100 XRP → 上限超過');
  const over = await call('authorize_payment', { payee: vendorW.address, amountXrp: '100' });
  console.log(text(over).split('\n').map((l) => '   ' + l).join('\n'));
  console.log(`   エラー扱い: ${over.result?.isError ? 'はい ✓' : 'いいえ ✗'}`);

  console.log('\n■ authorize_payment  1 XRP → 未承認の攻撃者');
  const bad = await call('authorize_payment', { payee: attacker.address, amountXrp: '1' });
  console.log(text(bad).split('\n').map((l) => '   ' + l).join('\n'));
  console.log(`   エラー扱い: ${bad.result?.isError ? 'はい ✓' : 'いいえ ✗'}`);

  mcp.close();

  const passed = !ok.result?.isError && over.result?.isError && bad.result?.isError;
  console.log(`\n${'='.repeat(60)}`);
  console.log(passed ? '✅ MCP サーバは想定どおり動作' : '❌ 想定外');
  console.log('='.repeat(60));
  return passed;
}

main().then((ok) => process.exit(ok ? 0 : 1))
      .catch((e) => { console.error('エラー:', e.message); process.exit(2); });
