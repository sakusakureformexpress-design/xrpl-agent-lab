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
  payee: 'rVendor...',          // 支払先。変更する取引型が存在しない
  capXrp: '10',                 // 上限。増額できるのは持ち主だけ
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
| **支払先** | `PaymentChannelCreate` の `Destination` | **台帳** |
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
| `demo/replay.html` | 実行記録の自動再生（字幕付き。録画してデモ動画に使える） |
| `demo/run-demo.js` | 録画用の英語デモ（実機で走らせる版） |

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

## 支払先をドメインで縛る

支払先アドレスは実行時（402 の中身）にはじめて分かるため、人間が事前に承認できない。
だが **「どのサービスから買ってよいか」はドメイン単位で承認できる。**

XRPL には、ドメインと口座の紐付けを双方向で証明する仕組みがある。

```
ドメイン側  api-a.com が /.well-known/xrp-ledger.toml の
            [[ACCOUNTS]] で rVendor... を宣言する

口座側      rVendor... が AccountRoot.Domain に
            "api-a.com" を設定する

→ 両方が一致したときだけ、同じ主体が両方を支配している証拠になる
```

ポリシーにこう書く:

```json
"domains": {
  "allowed": ["api-a.example.com", "api-b.example.com"],
  "requireVerified": true,
  "unverifiedMaxDrops": "1000"
}
```

すると、乗っ取られたエージェントが仕掛けられる攻撃は次のように落ちる。

| 攻撃 | 結果 |
|---|---|
| 402 に攻撃者のアドレスを仕込む | `DOMAIN_UNVERIFIED` — 承認済みドメインが claim していない |
| 攻撃者のサイトを叩かせる | `DOMAIN_NOT_ALLOWED` — 許可ドメインに無い |

`requireVerified: false` にすると、未検証の相手にも `unverifiedMaxDrops` までは
払える（新しい業者を試す運用向け）。

> 検証に使うホスト名は、**エージェントが実際に叩いた URL** から取る。
> 402 本文が自称する `resource` は merchant が自由に書ける値なので使わない。

---

## 計測と監査証跡

本ツール経由の全取引に `SourceTag = 1279607123`（`0x4C454153` = "LEAS"）を打つ。
採用状況を台帳から第三者が独立に検証できる。

さらにブローカー経由の支払いには、**何のための支出かをメモとして刻む**。

```json
{
  "a": "research-bot",                      // どのエージェントが
  "p": "a0c0b6841b7acbe8791107599d0e2795",  // その時点のポリシーの SHA-256
  "i": "INV-2026-0918-001",                 // どの請求に対して
  "r": "https://api.example.com/market-data" // 何を買ったか
}
```

**台帳はメモの内容を検証しない。** したがってこれは強制ではなく**記録**である。
ただし確定した取引のメモは二度と書き換わらないため、

- 事故時に「当時のポリシー」を証明できる
- ポリシーをこっそり緩めて戻す、が履歴に残る
- 支出の理由が台帳そのものに残り、経理・監査にそのまま使える

**防止はできないが、検知はできる。**

## セキュリティ上の前提

**多層で被害を限定する設計であり、単一の対策で守っているわけではない。**

| 層 | 守るもの | 破られたとき |
|---|---|---|
| **台帳** | Payment Channel の上限と支払先 | **破れない** |
| **ブローカー口座の残高** | それ以上の流出 | 本口座は無事 |
| ドメイン束縛 | 未承認の支払先 | ポリシーの金額上限まで |
| ポリシー | 金額・頻度・支払先 | ブローカー残高まで |

**ブローカーの機械を掌握された場合、ブローカー口座の残高までは失われる。**
ポリシーファイルも状態ファイルもその機械の上にあるため、書き換えられる。
これは構造的な限界であり、実装では消せない。

**したがって運用上、ブローカー口座には必要な分だけを入れること。
本口座の鍵をブローカーに渡さないこと。**

外部レビューの結果と全指摘への対応は [docs/91-security-review.md](docs/91-security-review.md)。

---

## ライセンス

MIT
