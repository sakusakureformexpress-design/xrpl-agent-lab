# 50 — 企画（Sprint 2 ドラフト）

最終更新: 2026-09-18
ステータス: **Architect / Judge 判定前のドラフト**

## プロジェクト名

**未定。** 候補:
- `xrpl-leash` — 綱。エージェントを繋ぐもの
- `xrpl-guardrail` — ガードレール。直球だが一般名詞的
- `LedgerLeash` — 「台帳が繋ぐ」を1語で

→ ユーザー判断待ち

---

## 一行で

> 人間が決めた**支出上限と支払先**を、アプリのコードではなく
> **XRP Ledger 自身に強制させる**オープンソースのツールキット。

---

## 課題

2026年、AIエージェントが自律的に支払う仕組みは実用段階に入った
（Ripple AI Starter Kit v1.1、x402、MPP。実測 約4,395 payments/hour）。

**しかし「払わせない」側が空白のまま残っている。**

既存の予算管理はすべて**ソフトウェアが自分で自分を制限する**構造である:

| 実装 | 上限の強制場所 | 突破可能か |
|---|---|---|
| AllowanceKit（Base/Solana） | state-dir ロック（アプリ内） | 実装バグで可 |
| polymitapay/mcp（XRPL） | ローカル設定値4つ（シードは平文保存） | 可 |
| xrpl-referee（XRPL） | 助言ツールの文字列のみ。決済経路に到達せず | **素通り** |

エージェントは**プロンプトインジェクションで乗っ取られうる**。
自分で自分を制限する仕組みは、乗っ取られた時点で無力になる。

## 解決策

XRPL の3つの機能を組み合わせ、**台帳が拒否する**構造にする。

| 機能 | 役割 |
|---|---|
| **Payment Channel** | `PaymentChannelCreate` の `Amount` が上限そのもの。<br>エージェントにはオフレジャーのクレーム署名権のみを渡す。<br>`Amount` を超える請求は**台帳が拒否する** |
| **Permissioned Domains (XLS-80)** | 支払先を人間が事前承認したドメイン内に限定 |
| **Credentials (XLS-70)** | 「この予算枠を承認した人間」と「承認済みサービス提供者」を証明 |
| （補助）**MPT** | 用途限定トークンで汎用残高と分離 |

**エージェントが乗っ取られても、上限超過と許可外への送金は物理的に不可能。**

## なぜ XRP Ledger でなければならないか

- これらはすべて**プロトコル層の機能**であり、スマートコントラクトを書かずに使える
- 他チェーンでは同等機能をコントラクトで実装する必要があり、
  **そのコントラクト自体が監査対象・攻撃対象**になる
- Payment Channel の `Amount` は台帳の検証ルールそのもの。バグが入る余地がない

## 競合との差分（検証済み）

| | T54 x402 Secure | xrpl-referee | 本プロジェクト |
|---|---|---|---|
| ライセンス | **クローズド商用** | MIT | **OSS** |
| 制御タイミング | 事前（KYA/delegation） | **事後**（レフェリー判定） | **事前** |
| 強制主体 | 中央サービス | 中央サービス（$0.10/監査） | **台帳** |
| 支払先制限 | あり（クローズド） | **なし**（grep 0件で確認） | **あり** |
| 上限強制 | 不明（非公開） | **助言のみ・素通り可**（referee.py 上限 raise 0件） | **Payment Channel の Amount** |
| Payment Channel | 不明 | **未使用**（grep 0件） | **中核** |

検証根拠: `research/2026-09-18-critic-review-competitor.md`

## 成功指標（オンチェーン測定可能）

助成金の約70%が成長マイルストーンに紐づくため、**測定可能な形で定義する。**

| # | 指標 | 測定方法 |
|---|---|---|
| 1 | 本ツールで作成された Payment Channel 数 | `PaymentChannelCreate` に固定 `SourceTag` を付与し台帳から集計 |
| 2 | 管理下の累計チャネル総額 | 同 tx の `Amount` 合計 |
| 3 | 本ツール経由の `PaymentChannelClaim` 件数 | 同 `SourceTag` で集計 |
| 4 | 発行された Credential 数（承認済み支払先） | `CredentialCreate` を台帳から集計 |
| 5 | 導入リポジトリ数 | GitHub dependents |

**`SourceTag` を使うことで、第三者が独立に検証できる**のが重要。
自己申告の数字ではない。

## 未解決の技術リスク

- **Payment Channel は XRP 限定。** RLUSD / IOU / MPT では使えない
  （出典: https://mpp.dev/payment-methods/xrpl）
  → RLUSD の上限強制は別設計が必要。**Sprint 3 の riskiest_unknown**
- RLUSD は発行体が `lsfAllowTrustLineLocking` 未設定のためエスクローも不可
  （xrpl-referee が 503 で明記）
- XLS-80 を「エージェントの支払先ホワイトリスト」に転用できるか未実証
  → **Sprint 3 で testnet 検証が必要**

## リスク

先方（xrpl-referee）の開発速度が速い（単日11コミット）。
Payment Channel / XLS-80 を後から実装される可能性は実在する。**推測。**

→ 速度で競わない。**設計思想を先に文書化して公開し、旗を先に立てる。**

---

## 対象範囲（誰が使えるか）

**特定のAIベンダーに依存しない。** これは設計上の選択であり、同時に助成金の要件でもある。

```
【頭脳】任意
  Claude / ChatGPT / Gemini / LangChain / n8n / 自作スクリプト / cron
        │  「この相手に N 円払いたい」
        ▼
【XRPL Leash】← 本プロジェクト
  上限内か？ 許可された宛先か？ → 署名する / 断る
        │
        ▼
【XRP Ledger】ゲート1（金額）／ゲート2（宛先）で最終判定
```

本プロジェクトは**財布側の層**であり、頭脳が何であるかを知らない。
「いくらを誰に」だけを受け取り、上限と許可リストに照らす。

**AI である必要すらない。** 自動で支払うプログラムであれば対象になる
（例: 毎晩 API クレジットを自動購入する cron ジョブ）。

### なぜベンダー中立でなければならないか

1. **助成金の構造上の要請。** 約70%が成長マイルストーンに紐づくため、
   特定ベンダー専用にすると母数が数分の一になり、**採択されても満額を達成できない**
2. **エコシステムの方針と一致させるため。** Ripple の AI Starter Kit v1.1 の
   発表記事タイトルは "Open Standards, Not an Island"。対応したのは MPP（Stripe/Tempo）と
   OWS（PayPal・Circle・Solana財団等が参加）という、いずれもチェーン・ベンダー中立の標準
   （出典: https://dev.to/ripplexdev/the-xrp-ledger-ai-starter-kit-v11-open-standards-not-an-island-358k ）

### 開発時と出荷物の区別

| | 何を使うか |
|---|---|
| **開発プロセス** | Claude Code のサブエージェント7体（`.claude/agents/`） |
| **出荷する製品** | ベンダー非依存。Claude は不要 |

**申請書には必ずこの区別を明記する。** 書かないと「Claude専用ツール」と誤解される
リスクがある。

---

## 【2026-09-18 訂正】支払先の制限方式を変更した

Sprint 3 の実証で、**当初の設計に誤りがあることが判明したため訂正する。**

### 誤っていた前提

> Permissioned Domains (XLS-80) で支払先を人間が事前承認したドメイン内に限定する

**これは成立しない。** 一次ソースで確認:

> "Permissioned domains **do not restrict ordinary payments**. ...
> features such as Permissioned DEXes and Lending Protocols can use domains to
> restrict and manage access. ... **General peer-to-peer transactions between
> accounts remain unrestricted.**"
> — https://xrpl.org/docs/concepts/tokens/decentralized-exchange/permissioned-domains

XLS-80 は**許可型DEXとレンディング向けの機能**であり、通常の `Payment` には効かない。
さらに同ページには「現時点で permissioned domains を使う XRP Ledger の機能は無い」
とも記載されている。

### 正しい方式（実証済み）

**`PaymentChannelCreate` の `Destination` が、そのまま支払先の強制になる。**

- `Destination` は作成時に固定され、**変更する取引型が存在しない**
- チャネルの資金は、その宛先以外には出ていかない
- つまり **「承認済みの支払先1つにつき、チャネル1本」** とすれば、
  エージェントは構造上その相手にしか払えない

実証: `docs/logs/2026-09-18.md`
チャネル `177AE43...` の `destination_account` は作成時のまま固定されていることを確認。

### この訂正の意味

**設計はむしろ単純になった。**

| | 当初案 | 訂正後 |
|---|---|---|
| 上限 | Payment Channel の `Amount` | 同じ（**実証済み**） |
| 支払先 | XLS-80 + XLS-70（**成立しない**） | Payment Channel の `Destination`（**実証済み**） |
| 必要な機能 | 3つ | **1つ** |

Payment Channel という**単一の原語だけ**で、上限と支払先の両方を台帳に強制できる。
依存する機能が減ったぶん、実装も説明も強くなった。

### XLS-70 / XLS-80 の位置づけ直し

強制の手段ではなくなったが、以下の用途では引き続き有用な可能性がある。**[要確認]**

- **Credentials (XLS-70)**: 「この支払先は人間が承認した」という事実をオンチェーンに
  残す。強制はしないが、監査証跡になる
- **Permissioned Domains (XLS-80)**: 承認済み支払先の一覧をオンチェーンで公開・共有する

**申請書では「強制する」と書かないこと。** 強制するのは Payment Channel だけである。
