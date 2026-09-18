# 00 — 戦略

最終更新: 2026-09-18

## ゴール

**XRPL Grants への採択。** 助成額 $10,000〜$200,000（非希薄化）。

## 意思決定の記録

### 2026-09-18: ハッカソン不参加を決定

XRPL Commons ハッカソン（10/24-25, ニューヨーク）は**不参加**。

理由:
- 現地開催であり、渡航が不可能
- Agentic Finance トラックのバウンティは $4,000。渡航費に見合わない
- **審査対象が「36時間内に作ったもの」に限定**されるため、事前の積み上げが効かない

出典:
- https://genfinity.io/2026/08/24/xrp-ledger-hackathon-nyc-october-2026-xrpl-commons-swell/
- https://hackathons.xrpl-commons.org/

ただし、ハッカソンのトラック構成（Protocol Innovation / **Agentic Finance** /
Lending & Borrowing / Why Not）は **エコシステムが今どこに金を出したいか**の
シグナルとして有効。Agentic Finance は重点領域とみなす。

## 確認済みの事実（助成金）

| 項目 | 内容 | 出典 |
|---|---|---|
| 助成額 | $10,000〜$200,000（非希薄化） | https://xrplgrants.org/faq |
| Accelerator | $50,000〜$200,000 | 同上 |
| 応募資格 | 18歳以上、OFAC制裁国以外。**個人・法人化前チーム・法人すべて可** | 同上 |
| 除外 | Ripple 社員は応募不可 | 同上 |
| 選考 | 応募 → 通過者に本申請 → ファイナリスト面接 → 採択 → マイルストーン資金供給 | https://xrplgrants.org/ |
| **マイルストーン構造** | プロダクト/統合 約30% ＋ **成長系（オンチェーン指標等）約70%** | https://xrplgrants.org/faq |
| ファンド | AI Fund、**Japan/Korea Fund**、Brazil Fund、Accelerator | https://xrplgrants.org/ |
| GitHub | 「preferred」。無い場合は設計図＋narrative で代替可 | https://xrplgrants.org/faq |
| 評価軸 | プロダクト / チーム / トラクション / スケーラビリティ。**調達希望額は評価に無関係** | https://xrplgrants.org/ 他 |

### 必要な提出物
- PoC または MVP
- コードまたはアーキテクチャの証明（GitHub リポジトリ / システム設計図）
- XRPL との技術統合計画
- **2分のプロジェクトデモ動画**
- ピッチデック

## この構造から導かれる制約（最重要）

**助成金の約70%が成長マイルストーンに紐づく** ため:

1. 「技術的に優れたライブラリ」だけでは構造的に通らない。
   **オンチェーンで測定可能な利用**が生まれる設計でなければならない
2. 企画段階で「成功指標は何か、それはどうやってオンチェーンで測るか」を
   定義しておく必要がある
3. ユーザーがゼロのまま申請するより、小さくても実利用がある状態のほうが強い

## 未確認事項

- [要確認] Japan/Korea Fund の要件・金額・締切。FAQ に記載なし。
  → `info@xrplgrants.org` に直接問い合わせる
- [要確認] AI Fund と Japan/Korea Fund の併願可否
- [要確認] 応募の締切／ウェーブ制かローリングか
- [要確認] オープンソース化は必須か（FAQ では必須と明記されていない）

---

## 2026-09-18（追記）: Sprint 1 の結果による戦略更新

### 判明した最重要事実

**応募窓口は現在クローズしている。**

> "There are presently no open calls for applications."
> — https://submit.xrplgrants.org/ （2026-09-18 Critic 直接確認）

トップページの「Applications now open for fall accelerator programs」は**古い表記**。
掲示の2枠は締切済み（Brinc HFIP 終了 / Tenity SFIIP は 2026-07-25 締切経過）。

**次のアクション: "Additional new programming to be announced in October 2026."**
（https://xrplgrants.org/ で確認）

### これをどう解釈するか

**障害ではなく猶予。** 急いで弱い申請を出す選択肢が消えたので、
10月の発表までに**動く MVP を作る**ことに時間を使う。

採点表のうち時間をかけるほど伸びるのは:
- 動く実物（15点）
- 成長指標の設計（15点）
- チームと実行力＝コミット履歴（10点）

合計40点。ここを取りにいく。

### 訂正: 「日本枠が有利」は成り立たない

- Japan/Korea Fund は独立制度ではなく、公式の実体は説明文**一行のみ**。共通フォームに統合
- **採択199件中、日本は1件のみ**（VWBL, $32,500）

→ 日本在住は**中立要因**として扱う。有利とも不利とも見なさない。
   別ルートとして Ripple × Web3 Salon（JETRO支援、最大$200K/件）は調査価値あり。[要確認]

### 最有力テーマには満額採択済みの競合がいる

**T54 が cohort-6 で上限満額 $200,000 を獲得**（AIエージェント決済インフラ）。
landscape 調査で空白2の唯一の実装として特定された **t54 x402 Secure は、この T54 の
クローズド商用サービス**である。

| 側面 | 意味 |
|---|---|
| 追い風 | このテーマに満額を出した実績がある＝**審査で通るテーマだと証明済み** |
| 向かい風 | 「T54 と何が違うのか」に答えられない企画は落ちる |

**差別化の軸を2点に絞る:**
1. **OSS であること**（T54 はクローズド商用）
2. **台帳が強制すること**（ソフトウェアの自己申告ではなく、XRPL が拒否する）

### その他の確認済み事実

| 項目 | 内容 |
|---|---|
| 個人採択 | **45件**、中央値 **$75,000**。法人化不要 |
| オープンソース | 非必須。ただしコード開示自体は必須 |
| ライセンス | Participant Materials に対し Ripple へ永久・サブライセンス可の広範なライセンス付与 |
| 税務 | W-9/W-8 提出義務、源泉徴収あり・**gross-up なし**、支払通貨は「XRP or fiat」 |
| 現行窓口 | `RippleXEcosystem@ripple.com`（`info@xrplgrants.org` ではない） |

### 未確認（推測で埋めないこと）

- [要確認] 「AI & Agentic Commerce」が優先領域として記載されているURL。
  Critic が xrplgrants.org で再現できなかったため、**申請書の根拠に使わない**
- [要確認] 10月発表の新プログラムの内容・締切
- [要確認] 成長マイルストーンの具体的数値例（公開情報に存在しない。個別交渉の可能性）
- [要確認] **日本の税務区分（雑所得/事業所得、消費税、日米租税条約）→ 税理士相談必須**


---

## 2026-09-18（追記）: 適格性の確認 — 対象である

**懸念**: 作ってから「対象外」と言われると時間が無駄になる。先に確認した。

**結論: 対象である。しかも重点領域に2つ同時に該当する。**

出典: `https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application`

| 重点領域 | 原文 | 本プロジェクトの該当部分 |
|---|---|---|
| **AI & Agentic Commerce** | "Agent-to-agent payments (x402), AI-native financial products, **autonomous transaction infrastructure**" | エージェント決済の制御層そのもの |
| **Infrastructure & Tooling** | "**Developer tools**, wallets, oracles, analytics, compliance/KYC infrastructure, bridges" | 開発者向けツールキットとして該当 |

**重要**: 「開発者向けツールだから対象外では」という懸念は**解消した**。
`Developer tools` が重点領域に明記されている。

また `compliance/KYC infrastructure` という記載もあり、
**「エージェントの支出を統制する」という性格はこの文脈にも乗る。**

### 申請時の条件
- 会社のステージに関わらず **"code access for technical review"（コード開示）が必要**
  → FAQ の「オープンソース化は非必須だがコード開示は必須」と整合

### まだ確認中
- [調査中] 開発者向けツールの過去採択実績（件数と具体例）
- [調査中] 開発者向けツールの場合、成長マイルストーン（助成金の70%）をどう設定するか
- [調査中] T54 がどういう位置づけで採択されたか
