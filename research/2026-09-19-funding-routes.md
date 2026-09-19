# 資金調達ルートの再調査 — 「10月待ち」は正しくない

調査日: 2026-09-19
きっかけ: ユーザーの指摘「待ちの姿勢はきらい」

## 結論

**XRPL Grants の応募窓口は今日も閉じている。しかしそれは「唯一の窓口」ではなくなった。**
Ripple 自身が 2026 年を「分散モデルへの移行」と書いている。
そして**公式ドメイン上に、今日開いている入口がひとつある。**

---

## 1. XRPL Grants 本体 — 閉じている（今日確認）

https://submit.xrplgrants.org/

> "There are presently no open calls for applications."

AI Fund の直リンク
（`/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application`）も
同じページに落ちる。**AI Fund は現在クローズ。**

### ただし、閉じたページに書いてあること

同ページは、閉じている状態でも次を明記している:

> 優先領域: payments, lending, stablecoins, **AI commerce**, tokenization,
> infrastructure, DeFi
>
> 用意すべきもの: pitch deck / product demo または prototype のリンク /
> GitHub リポジトリまたは技術文書。
> **grant 応募者は、企業ステージに関わらず「技術レビューのためのコードアクセス」が必須。**

**「AI commerce」が優先領域に名指しされている。** これは我々そのものである。
そして要求物は 4 つとも既にある（ピッチデック・デモ動画・公開リポジトリ・MIT で全履歴公開）。

### 今日できること（待たない）

同ページには**閉じている間も出せるフォーム**がある:

> "you can still submit information about your project for future consideration.
> The application form allows RippleX to review your project and connect you with
> relevant programs, funding, or partnership opportunities when they become available."

窓口が開くのを待つのではなく、**先に見てもらって、開いたときに声がかかる側に回る。**

---

## 2. Ripple 公式「2026 年に何が変わるか」

https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/

> "While those programs remain important, 2026 marks a shift toward a more
> distributed model."

新しい受け皿として挙がっているもの:

| 受け皿 | 内容 | 我々に対する適性 |
|---|---|---|
| **XAO DAO** | コミュニティ投票による microgrant。委員会承認なし | 窓口を待たない。ただし下記の危険あり |
| **XRPL Commons** | 独立組織。proactive grants と提携資金。パリで 9〜12週の incubator "The Aquarium" | 資金の詳細が未公開。要問い合わせ |
| **FinTech Builder Program** | 機関向け金融アプリ。アクセラレータ提携・地域コンペ・builder awards | 我々は機関向けではない |
| **XRP Asia** | APAC の地域ハブ。**初期段階、詳細は 2026 年後半** | **日本在住。最も相性が良い可能性** |
| **UDAX** | 大学（FGV / Oxford / UC Berkeley） | 対象外 |

---

## 3. アクセラレータ — 今の状態

### SFIIP 2026（Tenity・シンガポール）— **応募済み締切。かつ現地必須**

https://www.tenity.com/program/sfiip-2026/

> 応募締切: **"25 July 2026"** — **既に過ぎている**
> 開催: "5 October – 13 November 2026"（6週間）
> 形式: "hybrid and predominantly virtual"
> ただし **"each cohort features an on-site demo week at the end of the program;
> which is required."**

対象領域は "Payments, FX, Credit, Finance, Tokenization of RWAs, and Trade Finance"。
**現地デモ週が必須**である以上、渡航できない前提では対象外。

### XRPL Accelerator（Tenity）— 形式は有利

https://xrplgrants.org/accelerator

> "up to $200K in funding which includes development and adoption-based milestones"
> "a hybrid approach with the majority of the curriculum being available virtually;
> with the opportunity to attend an onsite demo day"

こちらの表現は "opportunity to attend"（任意）。SFIIP の "required" とは違う。
**次のコホートの募集要項で、現地要件がどちらの書き方になるかを必ず確認する。**

### Brinc HFIP（香港）— 12週間

2026-06-08 応募開始。非希薄化（non-dilutive）の grant あり。
2026 コホートは 10 社、テーマは機関向け RWA とオンチェーン金融。
**[要確認] 締切と現地要件。** 一次ソースで未確認。

---

## 4. XAO DAO — 窓口は無いが、**提出先が確定できない**

Ripple の公式記事が名前を挙げているので、組織の実在そのものは一次ソースで裏が取れる。
仕組みとして報じられているもの:

- 2026-02-27 発足。独自トークンを発行せず **XRP の保有量で投票**
- 誰でも提案を出せる（スパム防止の最低 XRP ステークあり）
- 提案項目: タイトル／説明／カテゴリ／要求する **RLUSD** 額／マイルストーン
- **14日間の投票期間**で quorum に届けば、委員会承認なしにマイルストーン分割で自動支払い

### ⚠ ここで止まる理由

提出先として出てくるドメインが**複数あり、どれも一次ソースで確定できない**:

| ドメイン | 状態 |
|---|---|
| `xaodao.org` | HTTP 503 |
| `xaodao.io` | 見出しだけで中身が無い |
| `xrpdao.vercel.app` | 無料の vercel サブドメイン。"Connect wallet to submit proposal" と表示 |
| `xaodaodistro.com` | 「RLUSD Priority Allocation Program」を称する |

**無料サブドメイン上で、$85,000〜$500,000 の提案一覧を見せながらウォレット接続を促す構成は、
暗号資産のフィッシングの典型形である。**
実在するプロジェクトの周りに偽サイトが立つのはよくある。

**結論: 正式な提出先が Ripple 公式か XAO DAO の認証済みアカウントから確認できるまで、
いかなるサイトにもウォレットを接続しない。** 提案の中身を先に書いておき、
提出先が確定してから出す。

---

## 5. やること（待たない順）

1. **RippleX への "future consideration" 提出** — 今日開いている。公式ドメイン
2. **問い合わせメール** — 内容を 2026 年の分散モデルに合わせて書き直す。
   聞くべきは「成長マイルストーンの水準」だけでなく、
   **XAO DAO の正式な提出先 / XRP Asia の時期 / AI Fund の再開見込み / 渡航要件**
3. **XAO DAO 提案の下書き** — 提出先が確定したら即出せる状態にしておく
4. **XRPL Commons への問い合わせ** — 資金の詳細が公開されていないため直接聞く
5. Brinc HFIP の締切と現地要件を一次ソースで確認

## 出典

- https://submit.xrplgrants.org/
- https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application
- https://xrplgrants.org/
- https://xrplgrants.org/accelerator
- https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/
- https://www.tenity.com/program/sfiip-2026/
- https://www.tenity.com/programs/
