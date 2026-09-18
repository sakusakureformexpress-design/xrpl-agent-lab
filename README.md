# XRPL Leash

**AIエージェントの支出上限と支払先を、アプリケーションコードではなく
XRP Ledger 自身に強制させるツールキット。**

エージェントはプロンプトインジェクションで乗っ取られる。
既存の予算管理はどれもエージェント自身のコードの中にあるため、
乗っ取られた時点で制限も一緒に無効化される。

XRPL Leash は上限と支払先を**台帳の検証ルール**に置く。
エージェントが乗っ取られても、上限超過と未承認先への送金は成立しない。

---

## 動作確認済み（XRPL Testnet 実機）

```
2. エージェントが正常に使う
  A へ 2 XRP   → tesSUCCESS  ✓ 支払い成立
  B へ 1.5 XRP → tesSUCCESS  ✓ 支払い成立

4. ⚠ エージェントが乗っ取られた
  攻撃4-a: 上限を超えて請求する（100 XRP > 10 XRP）
    → tecUNFUNDED_PAYMENT  ✓ 台帳が拒否
  攻撃4-b: 未承認の攻撃者へ払おうとする
    攻撃者宛の予算枠: なし
    → ✓ 枠が存在しないため、署名する対象そのものが無い

結果
  上限超過          : 台帳が拒否
  未承認先への支払い: 枠が無く不可能
  人間の口座の被害  : 0 XRP
```

再現: `node src/verify/03-e2e.js`
実行記録と tx hash: [docs/logs/](docs/logs/)

---

## 使い方

```js
import { Wallet } from 'xrpl';
import { LeashOwner, LeashAgent, LeashPayee } from './src/leash/index.js';

// 1. エージェント用の鍵ペアを作る（口座は不要）
const agent = LeashAgent.create();

// 2. 人間が、承認済みの支払先に上限付きの予算枠を作る
const owner  = new LeashOwner(humanWallet);
const budget = await owner.grantBudget({
  payee: 'rVendor...',          // 支払先。以後変更不可
  capXrp: '10',                 // 上限。以後変更不可
  agentPublicKey: agent.publicKey,
  expiresInSec: 86400,          // 任意: 有効期限
});

// 3. エージェントは伝票に署名するだけ。人間の口座鍵は持たない
const voucher = agent.authorize({ channelId: budget.channelId, cumulativeXrp: '2' });

// 4. 支払先が換金する。上限を超えていれば台帳が拒否する
const payee = new LeashPayee(vendorWallet);
await payee.redeem(voucher);    // → { accepted: true, result: 'tesSUCCESS' }

// 5. 人間はいつでも消化状況を見られる／枠を閉じられる
await owner.listBudgets();      // [{ payee, capXrp, spentXrp, remainingXrp, usedPercent }]
await owner.revoke(budget.channelId);
```

---

## エージェントから使う（MCP）

MCP サーバを同梱している。Claude Code / Claude Desktop / Cursor など
**MCP に対応したどのエージェント基盤からでも**使える。特定のベンダーに依存しない。

```json
{
  "mcpServers": {
    "xrpl-leash": {
      "command": "node",
      "args": ["/path/to/xrpl-agent-lab/src/mcp/server.js"],
      "env": {
        "LEASH_OWNER_ADDRESS": "rOwner...",
        "LEASH_AGENT_SEED": "sEd..."
      }
    }
  }
}
```

**`LEASH_AGENT_SEED` はエージェント専用の鍵。予算の持ち主の鍵ではない。**
このプロセスは予算を作ることも、上限を広げることも、支払先を変えることもできない。

提供するツール:

| ツール | 内容 |
|---|---|
| `list_budgets` | 誰にいくらまで払えるか、残りいくらか |
| `authorize_payment` | 支払いの伝票に署名する。枠が無い相手・上限超過は断る |
| `budget_status` | 特定の支払先の消化状況 |

実際に MCP 越しに叩いた結果:

```
■ authorize_payment  2 XRP → 承認済みの支払先
   Authorized 2 XRP. Remaining after redemption: 8 XRP
   エラー扱い: いいえ

■ authorize_payment  100 XRP → 上限超過
   Refused: 100 XRP exceeds the 10 XRP left in this budget.
   エラー扱い: はい ✓

■ authorize_payment  1 XRP → 未承認の攻撃者
   No budget exists for that address — there is no payment channel to sign against.
   エラー扱い: はい ✓
```

再現: `node src/verify/04-mcp.js`

> サーバ側のチェックは**早く失敗させるための親切**であって、本当の強制ではない。
> このプロセスを改造しても、上限超過は台帳が `tecUNFUNDED_PAYMENT` で拒否する。

---

## 人間から使う（CLI）

```bash
# エージェント用の鍵を作る
node bin/leash.js new-agent

# 承認済みの支払先に、上限付きの枠を作る
LEASH_OWNER_SEED=s... node bin/leash.js grant \
  --payee rVendor... --cap 10 --agent-pubkey ED... --expires 86400

# 消化状況を見る（鍵は不要。公開情報のみ）
node bin/leash.js list --address rOwner...

# 枠を閉じる。残額は持ち主に戻る
LEASH_OWNER_SEED=s... node bin/leash.js revoke --channel <id>
```

---

## 仕組み

| 守るもの | 手段 | 強制する主体 |
|---|---|---|
| **上限** | `PaymentChannelCreate` の `Amount` | **台帳** |
| **支払先** | `PaymentChannelCreate` の `Destination`（変更不可） | **台帳** |
| **口座鍵** | チャネルの `PublicKey` に署名鍵だけを登録 | 構造 |

**承認済みの支払先1つにつき、枠を1本張る。**
エージェントは枠のある相手にしか払えず、枠の上限を超えられない。

### ドル建て（RLUSD 等）について

Payment Channel は **XRP 限定**。ドル建ての上限強制には Escrow を使う。
検証の結果、**トークンのロック自体は XRPL で可能**であることを確認した
（発行体が `asfAllowTrustLineLocking` を立てている場合）。

RLUSD が現時点で使えないのは技術的制約ではなく、
**発行体がそのフラグを立てていないため**である。

ただし Escrow は分割払い出しができない（全額かゼロか）。
継続的な少額決済は XRP の Payment Channel が必要。
詳細: [docs/logs/2026-09-18-b.md](docs/logs/2026-09-18-b.md)

---

## 構成

| パス | 内容 |
|---|---|
| `src/leash/` | 本体。owner（人間）/ agent（AI）/ payee（支払先） |
| `src/mcp/` | MCP サーバ（エージェント側。署名鍵しか持たない） |
| `bin/leash.js` | 人間側の CLI |
| `src/verify/` | testnet 実機での検証スクリプト |
| `src/lib/rpc.js` | JSON-RPC クライアント |
| `docs/` | 戦略・設計・申請準備 |
| `research/` | 調査記録（出典URL付き） |
| `demo/explainer.html` | 非エンジニア向けの説明ページ |

## 検証スクリプト

| ファイル | 確かめること |
|---|---|
| `src/verify/01-channel-cap.js` | 上限超過が台帳に拒否されるか |
| `src/verify/02-token-cap.js` | ドル建てトークンで上限を強制できるか |
| `src/verify/03-e2e.js` | 通しの動作（予算付与→利用→乗っ取り→防御→閉鎖） |
| `src/verify/04-mcp.js` | MCP サーバがプロトコル越しに正しく動くか |

```bash
npm install
node src/verify/03-e2e.js   # テストネットのため実際の資金は動かない
```

## 計測

本ツール経由の全取引に `SourceTag = 1279414611`（`0x4C454153` = "LEAS"）を打つ。
採用状況を台帳から第三者が独立に検証できる。

## ライセンス

MIT
