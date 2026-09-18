# 適格性の調査 — 開発者向けツールは XRPL Grants の対象になるか
調査日: 2026-09-18
調査担当: Scout

## 結論（3行以内）

**対象になる。** 公式 FAQ の審査ルーブリックに「**provide key infrastructure and/or developer tooling for the XRPL ecosystem**」が明文で評価項目として入っており（<https://xrplgrants.org/faq>）、開発者向けライブラリ/SDK/フレームワークの採択実績も多数ある（公式 Awardees 掲載199件中、`Usability/Developer Tooling` タグ付き **55件**、うち明確に開発者向けの中核ツールは **31件**／<https://xrplgrants.org/awardees>）。
セキュリティ・アクセス制御系も採択実績あり（VWBL、Alice's Ring、Anchain.AI 等）。
ただし**リスクは「適格性」ではなく「①応募窓口が現在クローズ（<https://submit.xrplgrants.org/submit>）」「②助成の約70%が成長指標に紐づくのに、開発者向けツールの成長指標の設定例が公開情報に一切ない」の2点にある。**

---

## 1. 開発者向けツールの採択実績

### 1-0. 集計の前提（捏造防止のため方法を明記）

- 対象データ: 公式 Awardees ページ <https://xrplgrants.org/awardees> （2026-09-18 取得）のサーバーサイドレンダリング済み HTML。
- 方法: **筆者がページの HTML を機械パースし、プロジェクトカード（`card-grantee`）を抽出して集計した。** カード総数 **199件**（= 採択"件数"。同一チームが複数回受賞している例あり: Xrpl-go、XRPScan、Evernode、Bithomp、Peerkat、NFTMaster、Feeturre、Center for Collaborative Economics、Trustline、Carbonland Trust）。
- タグ別件数（機械集計、上位）: Tokenization 79 / NFT 65 / **Usability/Developer Tooling 55** / Open Source 40 / DeFi 39 / **Infrastructure/Security 37** / E-Commerce/Finance 33 / Other 21 / Social Impact 14 / RWA 13 / Gaming 11 / Payments 5 / DAO 5 / **Artificial Intelligence 4** / Education 4。

### 1-1. 3分類での内訳（タグベース、機械集計）

| 分類 | 定義（使用タグ） | 件数 | 備考 |
|---|---|---|---|
| 一般ユーザー向けプロダクト | NFT / Tokenization / DeFi / E-Commerce/Finance / Gaming / Payments / RWA など | 多数（過半） | タグは複数付与されるため単純合計は不可 |
| **開発者向けツール・SDK・ライブラリ・インフラ** | `Usability/Developer Tooling` | **55 / 199** | うち後述の厳格基準で **31件** が中核的な開発者向け |
| 研究・ドキュメント・教育 | `Education and Technical Knowledge` | **4 / 199** | 最も少ないカテゴリ |

出典: <https://xrplgrants.org/awardees>（すべて同ページ掲載データの筆者集計）

### 1-2. 明確に「開発者向けツール／SDK／ライブラリ／インフラ」と言える採択（31件）

筆者の厳格基準 = 「成果物の一次利用者が開発者であるもの（ライブラリ / SDK / CLI / テスト・監視フレームワーク / 開発者向け API / 開発基盤）」。エクスプローラ・ウォレット・ダッシュボード等のエンドユーザー面を持つものは除外した。

| プロジェクト名 | 内容 | 分類 | 助成額 | 出典URL |
|---|---|---|---|---|
| Xrpl-go (Wave 2) | Go 開発者が XRPL 上に直接構築できるライブラリ | ライブラリ | $200,000 | <https://xrplgrants.org/awardees> |
| Xrpl-go (Wave 4) | Golang 向けオープンソースライブラリ（サーバ/デスクトップ/CLI 開発を容易に） | ライブラリ | $75,000 | <https://xrplgrants.org/awardees> |
| Xrpl-rust (Wave 4) | 100% Rust の XRPL ライブラリ | ライブラリ | $75,000 | <https://xrplgrants.org/awardees> |
| XRPL SDK for Rust (Wave 3) | JSONRPC/WebSocket 対応の Rust SDK + CLI + 低レベル crate | SDK | $25,000 | <https://xrplgrants.org/awardees> |
| Go4Zerps (Wave 1) | XRPL 統合のための Golang SDK | SDK | $100,000 | <https://xrplgrants.org/awardees> |
| XRPL Elixir (Wave 5) | Elixir ベースの RPC ライブラリ | ライブラリ | $10,000 | <https://xrplgrants.org/awardees> |
| Xrpl-cli (Wave 3) | XRPL 用オープンソース CLI | CLI | $75,000 | <https://xrplgrants.org/awardees> |
| XRPL Ecommerce Foundation (Wave 3) | PHP-XRPL ライブラリ経由の PHP インターフェース + 参照実装 | ライブラリ | $50,000 | <https://xrplgrants.org/awardees> |
| **XRPSpec (Wave 5)** | **Hooks と API の振る舞い駆動テストフレームワーク** | テスト基盤 | $100,000 | <https://xrplgrants.org/awardees> |
| XRPL Servers Observer (Wave 3) | XRPL サーバ群の安全・確実な運用を支援する監視ツール | 運用ツール | $25,000 | <https://xrplgrants.org/awardees> |
| XRPJuncties (Wave 3) | コミュニティ向けオープンソース開発者ツール群 | 開発者ツール | $100,000 | <https://xrplgrants.org/awardees> |
| XRPL Meta (Wave 5) | トークン発行者向けメタデータ API | API | $100,000 | <https://xrplgrants.org/awardees> |
| GateHub Data API (Wave 5) | XRPL トランザクション履歴・分析データへの API アクセス | API | $200,000 | <https://xrplgrants.org/awardees> |
| XRPScan (Wave 5) | XRPL トランザクションをインデックスするデータ処理パイプライン + API | インフラ | $200,000 | <https://xrplgrants.org/awardees> |
| XRPL Reporting (Wave 2) | XRPL メインネット/サイドチェーン向けオープンソースレポーティングエンジン | 開発者ツール | $100,000 | <https://xrplgrants.org/awardees> |
| Blockchain Benchmarking Framework (Wave 2) | 開発者・組織・学術向けのブロックチェーン評価フレームワーク | フレームワーク | $50,000 | <https://xrplgrants.org/awardees> |
| XRPL Node-RED (Wave 1) | ビジュアルプログラミングによる高速プロトタイピングツール | 開発者ツール | $75,000 | <https://xrplgrants.org/awardees> |
| **BEI API (Wave 3)** | **XRPL 開発者向けの AI/ML リスクエンジン（無料 API）。「day one からベストプラクティスのリスク管理を提供」** | セキュリティ API | $150,000 | <https://xrplgrants.org/awardees> |
| Dhali (Wave 5) | 開発者がコードを API として収益化できるトークン化 API マーケット（ストリーミング決済） | 開発者向け基盤 | $75,000 | <https://xrplgrants.org/awardees> |
| Evernode (Wave 2) | Hooks + HotPocket によるスマートコントラクト L2 プラットフォーム | 開発基盤 | $200,000 | <https://xrplgrants.org/awardees> |
| Evernode (Wave 5) | 同上（2回目の採択） | 開発基盤 | $200,000 | <https://xrplgrants.org/awardees> |
| xHooksControl (Wave 3) | Hooks の設計・デバッグ・テストを行うビジネスプロセスエンジン | 開発者ツール | $100,000 | <https://xrplgrants.org/awardees> |
| Nexus - Unity Toolkit (Wave 6) | Unity ゲームエンジンと XRPL を接続するオープンソースツールキット | SDK/ツールキット | $150,000 | <https://xrplgrants.org/awardees> |
| XRPL4GD (Wave 6) | Godot エンジン向け XRPL プラグイン | SDK/プラグイン | $50,000 | <https://xrplgrants.org/awardees> |
| Kaiju Labs (Cohort 2) | ブロックチェーンゲーム開発を簡素化するノーコードツールキット | ツールキット | $50,000 | <https://xrplgrants.org/awardees> |
| Transia (Wave 3) | XRPL 本体の構築・保守を行う開発グループ（C#/Swift リポジトリ管理など） | コア開発 | $50,000 | <https://xrplgrants.org/awardees> |
| Scratch2Hooks (Wave 1) | Scratch 拡張で Hooks をビジュアル開発 | 教育向け開発ツール | $20,000 | <https://xrplgrants.org/awardees> |
| UniversalNFT.dev (Wave 6) | 既存 NFT 規格を読み取り変換する XRPL 共通 NFT フォーマット | 規格/ライブラリ | $50,000 | <https://xrplgrants.org/awardees> |
| Cryptum (Wave 1) | XRPL を任意アプリに統合する API/SDK プラットフォーム（B2B SaaS） | SDK/API | $50,000 | <https://xrplgrants.org/awardees> |
| XRPLWin Analyzer (Wave 3) | XRPL アカウントデータ解析サービス。ダッシュボード用 API を提供 | API | $75,000 | <https://xrplgrants.org/awardees> |
| **T54 (Cohort 6)** | **AI エージェントが自律的に取引するための金融インフラ（統一 SDK/API スタック）** | エージェント基盤 | $200,000 | <https://xrplgrants.org/awardees> ／ <https://www.tenity.com/press-tenity-announces-9-game-changing-projects-as-part-of-xrpl-accelerator-cohort-6-bridging-web3-innovation-with-real-world-impact/> |

**（集計: 厳格基準での開発者向けツール 31件 / 全 199件。`Usability/Developer Tooling` タグ付き広義では 55件 / 199件）**

除外した境界事例（開発者向けタグは付くが一次利用者がエンドユーザー寄り）: XRPScan (Wave 2, エクスプローラ, $200,000)、Multiverse Wallet (Wave 3, ウォレット+フレームワーク, $100,000)、Bithomp、GemWallet、Alphaday、3Shop、Keystone、NFTMaster、Ledger Direct、XRPL.TO、OnTheDex.live、XDEX、Neefty、Peerkat、Myrkle、XRPL WordPress Toolbox、XRPL Portfolio Tracker、Poof Payments、Self、Phi Wallet、SAFEHaven、ChatXRP、Quidli、Shillverse、Indicator Success Rate、ZerpCraft、XRP Wallet Tools、XRPL Rosetta、DeployHub、VerifyEd、xURLpay、Alice's Ring（→ 2章へ）。

**判定: 開発者向けツールは 0件ではない。31件（広義55件）ある。企画の分類上のリスクは低い。**

### 1-3. 最重要の一次ソース（ルーブリック本文）

公式 FAQ の **Business Assessment Rubric** に、次の評価項目が明記されている:

> "**XRPL Utility and Onchain Activity Use Case Alignment**: the project supports growth for the XRPL ecosystem, and has the potential to **drive incremental on-chain transactions, and/or provide key infrastructure and/or developer tooling for the XRPL ecosystem**"

出典: <https://xrplgrants.org/faq>（2026-09-18 取得。筆者がページ HTML を取得し全文から該当箇所を抽出）

→ 「オンチェーン取引を増やす」**と並列の or 条件**として「XRPL エコシステムに重要なインフラ／開発者ツールを提供する」が明記されている。**開発者向けツールは審査基準上、明示的に適格。**

---

## 2. セキュリティ・制御系の採択実績

`Infrastructure/Security` タグ付きは **37 / 199件**（筆者による同ページデータの機械集計、<https://xrplgrants.org/awardees>）。うち「安全にする／制限する／監査する」系の具体例:

| プロジェクト名 | 内容 | 助成額 | 出典URL |
|---|---|---|---|
| **VWBL (Wave 7)** | **オンチェーンのアクセス制御・鍵管理プロトコル。**NFT で暗号化データをカプセル化（医療検査等の実世界シナリオ） | $32,500 | <https://xrplgrants.org/awardees> |
| **Alice's Ring (Wave 5)** | ウォレットアドレスや履歴を明かさずに支払能力を証明（リング署名） | $100,000 | <https://xrplgrants.org/awardees> |
| **BEI API (Wave 3)** | XRPL 開発者向け AI/ML リスクエンジン API。不審行動レポート機能を含む | $150,000 | <https://xrplgrants.org/awardees> |
| Anchain.AI (Wave 1) | AI ベースのブロックチェーンリスク・コンプライアンス・調査プラットフォーム | $50,000 | <https://xrplgrants.org/awardees> |
| Palisade (Wave 2 / Cohort 4) | 規制対応・保険付きのマルチチェーンカストディ基盤 | $200,000 | <https://xrplgrants.org/awardees> |
| HubSecure (Wave 2) | AML・セキュアストレージ・CRM を統合したモジュラー SaaS | $100,000 | <https://xrplgrants.org/awardees> |
| Ospree (Cohort 2) | 機関向けデジタル資産コンプライアンス基盤 | 金額非掲載 | <https://xrplgrants.org/awardees> |
| Keystone (Wave 5) | デジタル資産のトレジャリー管理（カストディ + ワークフロー自動化） | $200,000 | <https://xrplgrants.org/awardees> |
| Self (Wave 4 / Cohort 3) | 検証済みアクター間の通信を可能にする ID・信頼プラットフォーム | $100,000 | <https://xrplgrants.org/awardees> |
| REDIMI / XRP Passport (Wave 6) | 分散型デジタル ID。DeFi 向け検証を接続 | $100,000 | <https://xrplgrants.org/awardees> |
| conFIEL (Wave 5) | メキシコ税務当局発行の RSA 鍵で KYC Tier-1 決済を可能にする証明書マネージャ | $50,000 | <https://xrplgrants.org/awardees> |
| Filedgr (Wave 4 / Cohort 3) | 検証可能なデジタル製品パスポート | $100,000 | <https://xrplgrants.org/awardees> |
| Ledgr (Wave 1) | XRPL 構造のグラフ解析（調査・コンプライアンス・リスク管理用途） | $25,000 | <https://xrplgrants.org/awardees> |
| MC² Finance (Wave 7) | ファンド組成と規制コンプライアンスの自動化 | $100,000 | <https://xrplgrants.org/awardees> |
| Sorcel (Cohort 3) | ノーコードでの dApp 構築・トークンゲーティング | $100,000 | <https://xrplgrants.org/awardees> |
| XRPL Servers Observer (Wave 3) | XRPL サーバ群の安全・確実な運用の監視 | $25,000 | <https://xrplgrants.org/awardees> |

**判定: 「安全にする／制限する／監査する」系は採択実績が明確にある。**特に **VWBL（オンチェーンのアクセス制御プロトコル）** と **BEI API（開発者向けリスク管理 API）** は、我々の企画（プロトコルで支出先を制限する開発者向けツール）と性格が非常に近い。

---

## 3. AI Fund の重点領域（確定した記述）

**結論: 2つのリストは「旧（2024年版・AI Fund 専用）」と「現行（2026年版・統合ポータル）」の関係にある。現行は後者。**

| 記述 | 出典URL | 情報の日付 | 現行かどうか |
|---|---|---|---|
| **【旧】AI Fund の Areas of Focus（6項目）**: ① AI-Driven optimization（XRPL のコンセンサス機構・トランザクション処理・ネットワークトポロジーの最適化）② Predictive analytics（ネットワーク輻輳・セキュリティ脅威・市場トレンドの予測）③ Anomaly detection（不正の疑いのある取引パターン検出）④ AI-Powered risk assessment（DeFi の与信・担保・市場リスク評価）⑤ Algorithmic trading（XRPL 向け AI 取引戦略）⑥ AI personalized financial services | <https://dev.to/ripplexdev/unleashing-the-power-of-ai-on-the-xrp-ledger-3a9b>（RippleX Developers 公式アカウント、著者 Julia Heitner） | **2024-09-24** | **旧。** 同記事は「The XRPL Grants AI Fund Application opens on a rolling basis beginning on September 24, 2024」と記載。金額は "$10,000 - $200,000 for project timelines up to one year" |
| **【現行】Priority Focus Areas の1つ**: 「**AI & Agentic Commerce: Agent-to-agent payments (x402), AI-native financial products, autonomous transaction infrastructure**」 | <https://submit.xrplgrants.org/submit> | **2026-09-18 取得** | **現行。** 同ページに "There are presently no open calls for applications." も表示 |
| 【現行】その他の Priority Focus Areas | Payments & FX／Credit & Lending／Stablecoin Integration（RLUSD 等）／Tokenization & Capital Markets／**Infrastructure & Tooling: "Developer tools, wallets, oracles, analytics, compliance/KYC infrastructure"**／DeFi | <https://submit.xrplgrants.org/submit> | 2026-09-18 取得 | 現行 |
| 【現行】公式トップの優先ユースケース | "Decentralized Finance (DeFi), Real World Asset Tokenization (RWA), Payments, Trade Finance" | <https://xrplgrants.org/> | 2026-09-18 取得 | 現行 |
| AI Fund 専用フォームの現況 | 「XRPL Grants - AI Fund Application」の専用 URL は存在するが、アクセスすると統合ポータルの内容（no open calls + 現行の Priority Focus Areas）が返る | <https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application> | 2026-09-18 取得 | AI Fund 専用の重点領域リストは**現在は提示されていない** |
| 公式トップの AI Fund の説明文 | "For AI use cases, also leveraging the XRPL"（一行のみ） | <https://xrplgrants.org/> | 2026-09-18 取得 | 現行 |

**確定事項:**
1. 「AI-driven optimization / predictive analytics / anomaly detection / AI-powered risk assessment / algorithmic trading」は **2024年9月24日の RippleX 公式ブログ（dev.to）に掲載された AI Fund 立ち上げ時の記述**であり、**現在の応募ポータルには存在しない**。
2. 現行の記述は **「AI & Agentic Commerce: Agent-to-agent payments (x402), AI-native financial products, autonomous transaction infrastructure」**（<https://submit.xrplgrants.org/submit>）。
3. **我々の企画（AI エージェントの支出制御）は、旧リストには弱くしか一致しないが、現行リストの "autonomous transaction infrastructure" に直接一致する。** さらに現行リストには "Infrastructure & Tooling: Developer tools" も独立項目として存在する。

**補足（Ripple 本体の方向性、一次ソース）:**
- Ripple は 2026-06 に「XRP Ledger AI Starter Kit」を公開し、x402 ベースのエージェント決済（XRP / RLUSD）を推進している。出典: <https://ripple.com/insights/xrpl-ai-starter-kit/>
- XRPL 公式ドキュメントに x402 エージェント決済のページが存在し、merchant / payer agent / facilitator の3者モデルを説明している。出典: <https://xrpl.org/docs/agents/agentic-payments-x402>
- ただし **同ドキュメントには Payment Channel / Credentials / Permissioned Domains / 支出上限（spending limits）への言及はない**（2026-09-18 取得時点）。`agentic-transactions` ページも "escrow with time locks, SourceTag for agent attribution, and the Memo field for audit trails are all built in" と述べるのみ。出典: <https://xrpl.org/docs/agents/agentic-transactions>
  → **これは我々にとって追い風。公式が「エージェント決済」を推しているが「支出上限・支払先制限」は公式ドキュメント上まだ空白である**（※「空白＝需要がある」は筆者の**推測**）。

---

## 4. T54 の採択内容

| 項目 | 内容 | 出典URL |
|---|---|---|
| 採択枠 | **XRPL Accelerator Cohort 6**（Tenity 運営 / Ripple 支援、シンガポール） | <https://www.tenity.com/press-tenity-announces-9-game-changing-projects-as-part-of-xrpl-accelerator-cohort-6-bridging-web3-innovation-with-real-world-impact/> |
| 発表日 | **2025年6月25日**（"Singapore – June 25, 2025"） | 同上 |
| 助成額 | **$200,000**（公式 Awardees ページのカードに記載。タグは `Artificial Intelligence` / `Cohort 6`） | <https://xrplgrants.org/awardees> |
| **採択時点の応募内容（原文）** | "**T54 Labs is building infrastructure to support the emergence of intelligent, goal-directed AI agents that interact with XRPL to perform complex, multi-step workflows. By developing the tLedger platform, T54 enables agents to autonomously transact, manage assets, and interface with blockchains through a unified SDK and API stack.**" | <https://www.tenity.com/press-tenity-announces-9-game-changing-projects-as-part-of-xrpl-accelerator-cohort-6-bridging-web3-innovation-with-real-world-impact/> |
| Awardees ページ側の要約 | "Financial infrastructure for AI agents to transact autonomously, using XRP Ledger for bridging crypto and real-world fiat." | <https://xrplgrants.org/awardees> |
| **開発者向けインフラか、プロダクトか** | **開発者向けインフラ。** 採択時の記述が明示的に「**a unified SDK and API stack**」であり、一般消費者向け製品ではない。Cohort 6 全体の紹介文でも用途として "**AI agent infrastructure for payments**" が挙げられている | 同上 |
| Cohort 6 の他8社 | endl.io / Anodos / Archway Finance / Effect Studios (Zynara) / Agrify / Stablpay / Loula / Fortstock。T54 以外は全て決済・貿易金融・RWA 系の**事業者向けまたは消費者向けプロダクト** | 同上 |
| Accelerator の条件 | 「up to $200,000 in non-dilutive funding」「12週間」「Demo Day は8月中旬」 | 同上 ／ <https://xrplgrants.org/accelerator> |
| 採択後の動き（参考） | T54 は XRPL 上で x402 facilitator を稼働させ、XRPL 公式ドキュメントに "T54 also operates a hosted Mainnet facilitator, `xrpl-facilitator-mainnet.t54.ai`, listed as a production option in x402's official facilitator directory." と記載されている | <https://xrpl.org/docs/agents/agentic-payments-x402> |

**示唆:** Cohort 6 の9社のうち、**「開発者向け SDK/API スタック」で応募して最高額 $200,000 を得たのは T54 ただ1社**。つまり開発者向けインフラは「対象外」どころか**最高額の採択枠を取っている**。同時に、T54 は既に x402 レイヤの事実上の標準実装者であるため、**我々は T54 と正面衝突しない差別化（= 支出上限と支払先制限というガードレール層）が必要**（この差別化の必要性は筆者の**推測**を含む）。

---

## 5. 成長マイルストーンの事例

### 5-1. 一次ソースで確認できた制度の記述

| 記述 | 出典URL | 日付 |
|---|---|---|
| "Awards range between **$10,000 and $200,000** per project in **non-dilutive** grant funding based on attaining funding milestones. There are two milestone types: **Product & integration milestones (~30% of the award)** / **Growth-based milestones (~70% of the grant) for hitting on-chain metrics on the XRP Ledger or other key growth metrics**" | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| "Program grants range between $50,000 USD - $200,000 USD and will be allocated according to **development and adoption-based milestones**. **These will be discussed with the Ripple team after your acceptance to the program.**"（Accelerator の場合） | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| ルーブリック: "**Product Roadmap and Milestones**: The roadmap is realistic, and well-thought-out ... and **the XRPL integration prioritized as an early milestone**" | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| ルーブリック: "**Project Traction**: the project has demonstrated growth in terms of **user adoption, or revenue growth**" | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| ルーブリック: "XRPL Utility and Onchain Activity Use Case Alignment: ... drive incremental on-chain transactions, **and/or provide key infrastructure and/or developer tooling** for the XRPL ecosystem" | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

### 5-2. 開発者向けツールが実際にどんな成長指標を設定したか

**公開情報になし。**

- 公式 Awardees ページの各カードは「プロジェクト名・カテゴリ・説明・助成額・所在国・チームメンバー」のみで、**マイルストーンの内容は一切掲載されていない**（<https://xrplgrants.org/awardees>、199件すべてを機械パースして確認）。
- 公式 FAQ は「on-chain metrics on the XRP Ledger or other key growth metrics」以上に具体例を示していない（<https://xrplgrants.org/faq>）。
- [要確認] Terms / About / Accelerator の各ページは今回の調査では本文全文を再確認していない（<https://xrplgrants.org/terms> / <https://xrplgrants.org/about> / <https://xrplgrants.org/accelerator>）。少なくとも同日付の先行調査 `2026-09-18-grants-requirements.md` では個別マイルストーン事例の記載は報告されていない。
- 開発者向けライブラリ採択者（xrpl-go / xrpl-rust / XRPL Elixir 等）が自らのマイルストーンを公開した一次ソースは、検索で**発見できなかった**。

### 5-3. 制度文言から読み取れること（事実と推測の区別）

- **事実:** FAQ は "on-chain metrics on the XRP Ledger **or other key growth metrics**" と書いており、オンチェーン指標は**唯一の選択肢ではない**（<https://xrplgrants.org/faq>）。
- **事実:** ルーブリックの Project Traction は "user adoption, **or revenue growth**" と書いており、指標の型が複数許容されている（同上）。
- **事実:** Accelerator ではマイルストーンは「採択後に Ripple チームと協議して決める」と明記されている（同上）。
- **推測（要検証）:** 開発者向けツールは「SDK のインストール数／統合したプロジェクト数／そのSDK経由で発生したオンチェーン取引数」を成長指標として提案できる可能性が高い。ただし**これを裏付ける公式記述も過去事例も見つかっていない。**

---

## 6. 我々の企画の適格性評価

| 観点 | 判定 | 根拠 |
|---|---|---|
| 制度上の適格性（開発者向けツールであること） | **◎ 問題なし** | 公式ルーブリックに "provide key infrastructure and/or **developer tooling** for the XRPL ecosystem" が明記（<https://xrplgrants.org/faq>）。現行ポータルの重点領域にも "Infrastructure & Tooling: **Developer tools**, wallets, oracles, analytics, compliance/KYC infrastructure"（<https://submit.xrplgrants.org/submit>） |
| 採択実績（開発者向けツール） | **◎ 危険なし** | 199件中、`Usability/Developer Tooling` タグ 55件、厳格基準で 31件。ライブラリ単体（XRPL Elixir $10,000、XRPL SDK for Rust $25,000）から開発基盤（Evernode $200,000×2、GateHub Data API $200,000）まで幅広く採択（<https://xrplgrants.org/awardees>） |
| 採択実績（セキュリティ・制御系） | **◎** | VWBL（オンチェーンのアクセス制御・鍵管理プロトコル、$32,500）、Alice's Ring（$100,000）、BEI API（開発者向けリスク管理 API、$150,000）、Anchain.AI（$50,000）等（<https://xrplgrants.org/awardees>） |
| 現行の AI 重点領域との一致 | **◎ 直撃** | 現行記述は "AI & Agentic Commerce: **Agent-to-agent payments (x402), AI-native financial products, autonomous transaction infrastructure**"。我々は "autonomous transaction infrastructure" そのもの（<https://submit.xrplgrants.org/submit>） |
| 旧 AI Fund 重点領域との一致 | **△ 弱い** | 旧6項目（最適化・予測・異常検知・リスク評価・アルゴ取引・パーソナライズ金融）はいずれも「AI モデルを作る」系で、我々の「プロトコルで制御する」は該当しない（<https://dev.to/ripplexdev/unleashing-the-power-of-ai-on-the-xrp-ledger-3a9b>）。**ただしこのリストは 2024-09-24 付で現行ではない** |
| 先行者との競合 | **△ 要注意** | T54 が Cohort 6 で $200,000 を獲得し（<https://www.tenity.com/press-tenity-announces-9-game-changing-projects-as-part-of-xrpl-accelerator-cohort-6-bridging-web3-innovation-with-real-world-impact/>）、さらに XRPL 公式ドキュメントに本番 facilitator として掲載されている（<https://xrpl.org/docs/agents/agentic-payments-x402>）。同じ「エージェント決済インフラ」を名乗ると比較負けする |
| 技術的な空白の有無 | **○（追い風）** | XRPL 公式の agentic ドキュメント2ページに **Payment Channel / Credentials / Permissioned Domains / 支出上限 の記述がない**（<https://xrplgrants.org/>系ではなく <https://xrpl.org/docs/agents/agentic-payments-x402> と <https://xrpl.org/docs/agents/agentic-transactions>、2026-09-18 取得）。「ガードレール層」は公式ドキュメント上の空白 |
| 成長指標の設定可能性 | **△ 最大の不確実性** | 助成の約70%が "on-chain metrics ... or other key growth metrics" に紐づく（<https://xrplgrants.org/faq>）。開発者向けツールがどう設定したかの**事例は公開情報に存在しない**（5章参照）。申請書では自分で指標を定義し切る必要がある |
| 応募可否（タイミング） | **× 現時点では応募不可** | 公式ポータルに "There are presently no open calls for applications."（<https://submit.xrplgrants.org/submit>）。公式トップは "Additional new programming to be announced in **October 2026**"（<https://xrplgrants.org/>） |
| 同時複数応募 | **制約あり** | "We will only consider **a single project per organization/team/project lead**."（<https://xrplgrants.org/faq>） |
| 成熟度要件 | **要注意** | "you should **at least have a Minimum Viable Product (MVP)** that can capture sufficient market demand"（<https://xrplgrants.org/faq>）。ライブラリでも動くものが要る |

### 総合判定

**「作ってから『対象外です』と言われる」リスクは低い。** 制度文言（ルーブリック）と過去実績の両方が開発者向けツールを明示的に対象としている。
**実際のリスクは以下3点に移る:**
1. **窓口が閉じている**（次の告知は 2026年10月予定）。→ 作る時間はある。
2. **成長指標の設計**（助成の約70%を左右するのに公開事例なし）。→ 申請書で自前で定義し切る必要がある。
3. **T54 との差別化**。→ 「エージェント決済インフラ」ではなく「エージェント支出のガードレール／制限層」として位置づける必要がある。

---

## 確認できなかったこと

- [要確認] **開発者向けツールの成長マイルストーンの具体例**。公式サイト・FAQ・Terms・Accelerator ページ・採択者の公開発信のいずれにも見つからなかった（5章）。→ 応募再開時に info@xrplgrants.org に直接問い合わせるのが唯一の手段（連絡先の出典: <https://xrplgrants.org/>）。
- [要確認] **AI Fund が現在も独立した枠として存続しているか**。公式トップにはカードが残っているが（"For AI use cases, also leveraging the XRPL"、<https://xrplgrants.org/>）、専用応募フォームは統合ポータルにリダイレクトされる（<https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application>）。**現時点では「独立した重点領域リストを持つ枠」としては機能していない。**
- [要確認] **Japan/Korea Fund の現行の個別要件**。公式サイト上の記述は一行のみで、独立した要件・金額・締切は公表されていない。
- [要確認] **XLS-70 (Credentials) / XLS-80 (Permissioned Domains) が XRPL Grants 側の文書で言及されているか**。今回の調査範囲（grants 系ページ + xrpl.org の agents ドキュメント2本）では**一度も言及を確認できなかった**。企画の技術的前提として、これらの amendment が Mainnet で有効かどうかは Architect が別途 <https://xrpl.org> で検証する必要がある。
- [要確認] **199件という数字が「全採択件数」と一致するか**。Awardees ページに掲載されているカード数であり、非掲載の採択が存在しないことは確認できていない。また「XRPL Grants はこれまでに 140件以上／28カ国に助成した」という記述が検索結果の要約中に現れたが、**該当ページを直接開いて原文を確認できていないため、この数字は本調査では採用しない（未確認）**。
- [要確認] **T54 の $200,000 が Accelerator grant のみか、Ripple からの別出資を含むか**。Awardees ページのカードは $200,000 と表示するが、内訳の一次ソースは未確認。
