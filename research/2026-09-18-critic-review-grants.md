# Critic レビュー: 助成金要件調査の検証結果

検証日: 2026-09-18
対象: `research/2026-09-18-grants-requirements.md`

## verdict

```json
{
  "verdict": "PASS_WITH_ONE_UNVERIFIED",
  "blocking": [],
  "unverified": [
    { "item": "「現行ポータルの優先領域に AI & Agentic Commerce が明記」の再現に失敗", "severity": "medium" }
  ]
}
```

出典URL 93本。捏造なし。推測の明示あり。公式数値と自前集計の分離あり。**調査規律は良好。**

---

## 独立検証: 応募窓口のクローズ（最重要・確認済み）

Scout の主張を Critic が直接確認した。**事実である。**

| 確認先 | 実際の表示 | 判定 |
|---|---|---|
| https://submit.xrplgrants.org/ | **"There are presently no open calls for applications."**（原文） | ✅ 一致 |
| https://xrplgrants.org/ | "Applications now open for fall accelerator programs"（2枠掲示） | ⚠️ **矛盾** |
| https://xrplgrants.org/ | **"Additional new programming to be announced in October 2026."** | ✅ 新規確認 |

### 矛盾の解消
トップページの「now open」表記は**古い**。掲示された2枠はいずれも締切済み:
- **Brinc HFIP**（香港）: 応募終了
- **Tenity SFIIP**: 締切 **2026-07-25** に経過済み

出典: https://www.tenity.com/programs/xrpl-accelerator/ / https://xrplgrants.org/accelerator

**結論: 2026-09-18 時点で応募可能な窓口は存在しない。次は 2026年10月の新プログラム発表。**

---

## 【2026-09-18 追記・訂正】Scout の主張は正しかった

下記「再現できなかった主張」は、**その後の再調査で確認された。Scout が正しい。**

出典（一次ソース）:
`https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application`

このページ（統合申請フォーム）に、RippleX Ecosystem Programs の重点領域として
以下が明記されている:

| 重点領域 | 原文 |
|---|---|
| **AI & Agentic Commerce** | "Agent-to-agent payments (x402), AI-native financial products, **autonomous transaction infrastructure**" |
| **Infrastructure & Tooling** | "**Developer tools**, wallets, oracles, analytics, compliance/KYC infrastructure, bridges" |

`xrplgrants.org` のトップページには「DeFi / RWA / Payments / Trade Finance」しか
載っておらず、**重点領域の詳細は申請フォーム側にある**という構成だった。
Critic が xrplgrants.org だけを見て「再現できず」と判定したのは**調査範囲の誤り**。

また同ページには、応募者は会社のステージに関わらず
**"code access for technical review"（技術審査のためのコード開示）が必要**と記載。
これは FAQ の「オープンソース化は非必須だがコード開示は必須」と整合する。

→ **この記述は申請書の根拠として使用してよい。**

---

## （以下は訂正前の記録。経緯として残す）

## 再現できなかった主張（当時）

Scout は「現行ポータルの優先領域に **AI & Agentic Commerce: Agent-to-agent payments (x402),
AI-native financial products, autonomous transaction infrastructure** が明記」と報告した。

Critic が https://xrplgrants.org/ を直接取得したところ、**確認できたのは
「DeFi / RWA / Payments / Trade Finance」のみ**で、AI & Agentic Commerce の記述は
再現できなかった。

- Scout は別ページ（Submittable の opportunity ページ等）から取得した可能性がある
- **[要確認]** どのURLに記載されているかを特定するまで、この主張は**申請書の根拠に使わない**

---

## 検証済みの重要事実

| 項目 | 内容 | 出典 |
|---|---|---|
| マイルストーン 30/70 | FAQ に「Product & integration (~30%)」「Growth-based (~70%) for hitting on-chain metrics」と明記 | https://xrplgrants.org/faq |
| 金額 | $10,000〜$200,000、非希薄化、最長12ヶ月 | 同上 |
| オープンソース | **非必須。** Terms 全文に "open source"/"GitHub"/"public repository" の出現ゼロ。ただし**コード開示自体は必須** | Terms 全文検索 |
| ライセンス条項 | **Participant Materials に対し Ripple へ永久・サブライセンス可の広範なライセンスを付与** | Terms |
| 税務 | W-9/W-8 提出義務、源泉徴収あり・**gross-up なし**、支払通貨は「XRP or fiat」で未確定 | Terms |

---

## 戦略に直結する3つの事実

### 1. 「日本枠が有利」という見立ては成り立たない

- **Japan/Korea Fund は独立した制度ではない。** 公式の実体は
  「For projects and ventures based in Japan or Korea」の**一行のみ**（JSバンドルから原文抽出）
- 応募は共通フォームに統合されている
- **採択199件中、日本は1件のみ**（VWBL, $32,500）
- 規模は "tens of millions over time" で確定額非公表

→ **専用枠として期待するのは誤り。** 日本在住は中立要因として扱う。
   ただし実務ルートとして Ripple × Web3 Salon（JETRO支援、最大$200K/件）は別途調査価値あり。

### 2. 最有力の空白には、既に満額採択された競合がいる

- **T54 が cohort-6 で上限満額 $200,000 を獲得**（AIエージェント決済インフラ）
- landscape 調査で、空白2（支払先の許可リスト）の唯一の実装として特定された
  **t54 x402 Secure（KYA / delegation / risk gating）は、この T54 のクローズド商用サービス**

→ **同一テーマで、資金を得た先行者が既にいる。**
   これは両刃である:
   - **追い風**: このテーマに満額を出す実績がある＝審査で通るテーマだと証明されている
   - **向かい風**: 「T54 と何が違うのか」に答えられない企画は落ちる

   **差別化の軸は「OSS であること」と「台帳が強制すること」の2点に絞るべき。**

### 3. 個人での採択は現実的

- 個人採択 **45件**、中央値 **$75,000**
- 法人化は不要（FAQ で確認済み）

---

## 数値の扱いについて（Scout の申告を評価）

Scout は「公式表記 140+ teams / $15M+」と「自前集計 199件 / $18.3M」の差を
**隠さず分離して報告**した。これは正しい扱い。申請書では**公式数値のみ**を使う。

---

## 次アクションへの影響

**窓口クローズは障害ではなく、猶予である。**

急いで弱い申請を出す選択肢が消えた。10月の発表まで **MVP を作る時間が確保された**
と解釈すべき。審査基準の「動く実物 15点」「成長指標 15点」は、時間をかけたほうが伸びる。

- [ ] 10月の発表を監視する仕組みを作る（見逃すと数ヶ月待ち）
- [ ] `RippleXEcosystem@ripple.com` への問い合わせに切り替える
      （`info@xrplgrants.org` ではなくこちらが現行窓口）
- [ ] `docs/40-inquiry-email.md` を「窓口クローズ前提」に書き換える
- [ ] [要確認] 日本の税務区分（雑所得/事業所得、消費税、日米租税条約）
      → **税理士相談が必須。推測で進めない**
