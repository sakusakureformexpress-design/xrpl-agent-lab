# 70 — 2分デモ動画の台本

最終更新: 2026-09-18
用途: XRPL Grants 申請の必須提出物「2-minute project demo」
言語: **英語**（審査員は英語話者）

---

## 録画の準備

| 項目 | 設定 |
|---|---|
| コマンド | `DEMO_PACE=1400 node demo/run-demo.js` |
| ターミナル | 100×32 程度。フォント 16pt 以上。ダーク背景 |
| 事前に開く | ブラウザのタブに `https://testnet.xrpl.org/` を1枚 |
| 注意 | 実行のたびに新しい口座と tx になる。**録画後、台本の hash を実際の値に差し替える** |
| 音声 | ナレーションを別録りして重ねるほうが、言い直しが効いて楽 |

`DEMO_PACE` は各ステップの間隔（ミリ秒）。録画は 1400 前後が読みやすい。

---

## 構成（2分00秒）

### 0:00 – 0:15 ｜ 課題

**画面**: タイトルカード。黒地に白文字。

```
Agents can pay now.
Nothing stops them from overpaying.
```

**ナレーション**
> In 2026, AI agents can pay for services on their own. On the XRP Ledger,
> x402 traffic already runs at about four thousand four hundred payments an hour.
> The controls did not ship with it.

---

### 0:15 – 0:30 ｜ なぜ既存の対策が効かないか

**画面**: 2行のテキストを順に出す。

```
Today, every spending limit lives inside the agent's own process.

Prompt injection compromises that process.
```

**ナレーション**
> Every spending limit available today lives inside the agent's own process.
> When prompt injection takes over that process, it takes over the limit with it.
> The guard is the suspect.

---

### 0:30 – 0:42 ｜ 解決策を一文で

**画面**: タイトルカード。

```
XRPL Leash
Put the limit in the ledger, not in the agent.
```

**ナレーション**
> XRPL Leash moves the ceiling out of the application and into the ledger.
> A budget is a payment channel. The cap and the payee are written on-chain
> The payee cannot be changed at all; the cap can only be raised by the owner.

---

### 0:42 – 1:40 ｜ 実機（ここが本体）

**画面**: **ターミナルの実行をそのまま流す。** 編集で間を詰めてよいが、
出力そのものは加工しない。

`DEMO_PACE=1400 node demo/run-demo.js`

ナレーションを出力の各段に合わせる:

| 画面に出るもの | ナレーション |
|---|---|
| SETUP の4者 | The agent has no account. It holds a signing key and nothing else. |
| 1. budget opened / `tesSUCCESS` | The human opens a budget. Cap: ten XRP. Payee: fixed — and only the owner can raise the cap. |
| 2. claim 2 XRP / `tesSUCCESS` | The agent pays two XRP. Within the cap, so it settles. |
| `2 / 10 XRP used (20%)` | The owner can see exactly what has been spent. |
| 3. compromised | Now the agent is compromised. |
| Attempt A / **`tecUNFUNDED_PAYMENT`** | It claims one hundred XRP against a ten XRP cap. **The signature is valid. The ledger refuses it anyway.** |
| Attempt B / `none` | It tries to pay the attacker. There is no channel to that address, so there is nothing to sign against. |
| RESULT / `0 XRP` | Loss to the treasury: zero. |

> **間を取る箇所**: `tecUNFUNDED_PAYMENT` が出た瞬間。ここで1.5秒止める。
> この動画で一番大事な1フレーム。

---

### 1:40 – 1:52 ｜ 第三者が確認できる

**画面**: ブラウザに切り替え、`testnet.xrpl.org` で拒否された tx の hash を貼って開く。
結果コードが表示されるところまで見せる。

**ナレーション**
> This is not a simulation. Every transaction is on the public testnet.
> Anyone can verify it, and anyone can reproduce the run from the repository.

---

### 1:52 – 2:00 ｜ 計測と入口

**画面**: 静止テキスト。

```
Every transaction carries SourceTag 1279414611.
Adoption is measurable from the ledger — not self-reported.

github.com/sakusakureformexpress-design/xrpl-agent-lab
```

**ナレーション**
> Every transaction we send carries our source tag, so adoption can be counted
> from the ledger itself rather than reported by us.

---

## 言わないこと

- **メインネット対応済みと言わない。** テストネットである
- **RLUSD に対応済みと言わない。** 発行体のフラグ待ちである
- 「revolutionary」「world's first」の類は使わない
- 競合の名前を出して貶さない。**言うのは「その空白が存在する」ことだけ**

## 録画後にやること

- [ ] 台本中の tx hash を、実際の録画で出た値に差し替える
- [ ] `docs/30-grant-draft.md` の Links に動画URLを入れる
- [ ] 字幕（英語）を付ける。音声が聞き取れない環境でも通じるように
