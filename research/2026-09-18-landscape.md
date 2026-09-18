# XRPL × AIエージェント 既存プロジェクト棚卸し
調査日: 2026-09-18

## 結論（3行以内）

1. **「エージェントが払う」レールは既に埋まっている。** Ripple公式の AI Starter Kit（v1.1, 2026-09）が x402 / MPP / OWS の3標準を押さえ、t54 が mainnet 稼働の x402 facilitator を運用中（[出典](https://ripple.com/insights/xrpl-ai-starter-kit/) / [出典](https://xrpl-x402.t54.ai/)）。ここで新規参入しても差別化できない。
2. **空いているのは「払わせない」側**＝支出上限のオンチェーン強制・支払先の事前許可・支出監査証跡。x402向け予算管理の OSS は存在するが（[AllowanceKit](https://github.com/fskroes/AllowanceKit)）Base / Solana のみで **XRPL 非対応**。
3. XRPL の Payment Channel / Credentials(XLS-70) / Permissioned Domains(XLS-80) / MPT は、この「制約と監査」レイヤに直接使える一方、それを使った公開実装が見つからなかった。

---

## 既存プロジェクト一覧（46件）

### A. Ripple / XRPLF 公式

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 1 | XRP Ledger AI Starter Kit | エージェント決済の公式ツール群。2026-06-09 に Phase 1 公開、2026-09 に v1.1 | Ripple (RippleX) | 2026-09（v1.1記事） | — | 活発 | https://ripple.com/insights/xrpl-ai-starter-kit/ |
| 2 | ripple/xrpl-mpp-sdk | MPP の XRPL 決済メソッド。charge（XRP / IOU / MPT のオンチェーン）と channel（PayChannel によるオフチェーン累積クレーム）の2モード。`mppx` を拡張 | Ripple | 2026-09-17 | 2 | 活発（58コミット, Apache-2.0） | https://github.com/ripple/xrpl-mpp-sdk |
| 3 | ripple/xrpl-up | ローカルサンドボックス CLI。即時クローズ・事前入金済みアカウント・スナップショット。Claude Code プラグイン同梱 | Ripple | 2026-08-28 | 4 | 活発（282コミット, MIT） | https://github.com/ripple/xrpl-up |
| 4 | XRPL Agent Wallet Skill | Claude 向け Skill。ウォレット作成 / 残高確認 / 取引追跡。v1.1 で OWS 対応 | XRPLF | 2026-09-17（親リポ） | 2168（親リポ） | 活発 | https://github.com/XRPLF/xrpl-dev-portal/tree/master/.claude/skills/xrpl-skills/xrpl-agent-wallet |
| 5 | XRPL Payments Skill | Claude 向け Skill。支払い実行と取引ハンドリング | XRPLF | 2026-09-17（親リポ） | 同上 | 活発 | https://github.com/XRPLF/xrpl-dev-portal/tree/master/.claude/skills/xrpl-skills/xrpl-payments |
| 6 | XRPL Trading (DEX) Skill | v1.1 追加。自律的な DEX 取引 | XRPLF | 2026-09-17（親リポ） | 同上 | 活発 | https://github.com/XRPLF/xrpl-dev-portal/tree/master/.claude/skills/xrpl-skills/xrpl-trading |
| 7 | XRPL Docs MCP Server | MCP クライアント（Claude Code / Desktop / Cursor）に XRPL ドキュメントを供給 | Ripple / Context7 | [要確認] | — | 稼働中 | https://context7.com/websites/xrpl |
| 8 | ripple/simpleXRPL | カストディアン対応の高レベル TypeScript SDK | Ripple | 2026-09-10 | 2 | 活発 | https://github.com/ripple/simpleXRPL |
| 9 | XRPLF/ai-automation | AI 自動化ツール集。中身は現状 `copilot-review-bot`（PR レビュー用）のみで、**エージェント決済とは無関係** | XRPLF | 2026-09-08 | 0 | 活発だが用途違い | https://github.com/XRPLF/ai-automation |
| 10 | XRPL 公式 Agents ドキュメント | Agentic Transactions / x402 / Agent Wallet Skill 等の解説群（`/docs/agents/` 直下のインデックスは 404） | XRPLF | 2026-09 | — | 活発 | https://xrpl.org/docs/agents/agentic-transactions |

### B. x402 / MPP の XRPL 実装・周辺

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 11 | t54 XRPL x402 Facilitator | XRPL 上の x402 facilitator。payer 署名済み Payment blob を `/verify` `/settle` で検証・決済。XRP / IOU（RLUSD, USDC）対応。mainnet + testnet 稼働 | t54.ai | 2026-09時点で稼働 | — | 稼働中（商用） | https://xrpl-x402.t54.ai/ |
| 12 | x402-xrpl SDK | 上記 facilitator 向け TypeScript / Python クライアント | t54.ai | [要確認]（npm/PyPI が 403 で直接確認できず） | — | 稼働中 | https://pypi.org/project/x402-xrpl/ |
| 13 | x402 Secure（KYA / delegation / risk gating） | 支払い意図の検証、KYA、委譲、リスクゲーティング。**クローズドな商用サービス** | t54.ai | [要確認] | — | 商用 | https://www.t54.ai/x402-secure |
| 14 | xrpl-ai.org | XRPL エージェント経済のコミュニティポータル（SDK・facilitator・サービス一覧） | コミュニティ | [要確認] | — | 稼働中 | https://xrpl-ai.org/build |
| 15 | xrpl.fi /x402 | XRPL 上の x402 決済をオンチェーン指紋から独立計測するダッシュボード。約 4,395 payments/hour と表示。Ripple / XRPLF 非関連を明記 | xrpl.fi | 毎分更新 | — | 稼働中 | https://xrpl.fi/x402 |
| 16 | ajitkulk/xrpl-b2c-agentic-payment-example | 買い手エージェントが天気 API に x402 で従量課金。XRPL testnet + Starter Kit skills + t54 facilitator | ajitkulk（個人） | 2026-08-27 | 0 | ほぼ停止（4コミット） | https://github.com/ajitkulk/xrpl-b2c-agentic-payment-example |
| 17 | polymitapay/mcp | PolyPay カタログのツールをエージェントが検索・XRPL で自動購入する MCP。**呼び出し毎/累計の XRP・RLUSD 上限を設定可能（ローカル設定変数, オンチェーン強制ではない）**。シードは平文ローカル保存 | PolyMita Pay | 2026-09-11 | 1 | 活発 | https://github.com/polymitapay/mcp |
| 18 | XRPL-Utilities/xrpl-utilities-mcp | XRPL-Utilities（Sentinel / Pulse / Telemetry / Trust）の MCP。x402 ヘッダは呼び出し側が用意するステートレス passthrough | XRPL-Utilities | 2026-09-06 | 0 | 低活動 | https://github.com/XRPL-Utilities/xrpl-utilities-mcp |

### C. XRPL × エージェント系 OSS（非公式）

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 19 | eamwhite1/xrpl-referee | **本ラボに最も近い既存物。** エージェント間決済の MCP + REST。crypto-condition escrow、Gemini 2.5 Pro による成果物審査で自動リリース、12シグナルの信用スコア、NFT 発行者レジストリ、ジョブ市場 | eamwhite1（個人） | 2026-09-15 | 0 | 活発だが個人・★0 | https://github.com/eamwhite1/xrpl-referee |
| 20 | jarod-vyent/xrpl-identity-mcp | XRPL の ID 特化 MCP。DID(XLS-40)、Credentials(XLS-70)、signer list。鍵を持たない | jarod-vyent（個人） | 2026-07-08 | 1 | 停滞 | https://github.com/jarod-vyent/xrpl-identity-mcp |
| 21 | lgcarrier/xrpl-mcp-server | XRPL 汎用 MCP サーバ（Python）。この分野で最もスター数が多い | lgcarrier（個人） | 2026-06-29 | 10 | 停滞 | https://github.com/lgcarrier/xrpl-mcp-server |
| 22 | tedlikeskix/xrpl-mcp-service | XRPL 操作の MCP 実装 | tedlikeskix（個人） | 2026-06-29 | 4 | 停滞 | https://github.com/tedlikeskix/xrpl-mcp-service |
| 23 | XRPL-Commons/xrpl-dev-skills | XRPL dApp 開発向け Claude Skill | XRPL Commons | 2026-09-01 | 5 | 活発 | https://github.com/XRPL-Commons/xrpl-dev-skills |
| 24 | XRPL-Commons/XCS (Xrp Credentials Service) | XRPL の Credentials サービス。**エージェント用途への言及は確認できず** | XRPL Commons | 2026-09-07 | 0 | 低活動 | https://github.com/XRPL-Commons/XCS |
| 25 | XRPDomains/xrpname-mcp-server | XRP ネームサービスの MCP | XRPDomains | 2026-09-18 | 1 | 活発 | https://github.com/XRPDomains/xrpname-mcp-server |
| 26 | ToolOracle/xrploracle | 「AI エージェント向け XRP Ledger インテリジェンス」MCP | ToolOracle | 2026-04-05 | 0 | 停止 | https://github.com/ToolOracle/xrploracle |
| 27 | xrplove/guardian-mcp | XRPL インフラ照会 MCP（アカウント / トークン / ブリッジ健全性） | xrplove | 2026-06-27 | 1 | 停滞 | https://github.com/xrplove/guardian-mcp |
| 28 | StaticBit-io/staticbit-xrpl-mcp | XRPL MCP サーバ + 署名機 + プラグインマーケット | StaticBit | 2026-09-16 | 0 | 活発 | https://github.com/StaticBit-io/staticbit-xrpl-mcp |
| 29 | AGENTROPOLIS-PAYRAIL | エージェント都市シミュレーションの少額決済レール。**wallet-guard による方針ゲート付き支出、タスク単位のレシート、dry-run**。USDC on Base + **XRPL(XRP/RLUSD)** + Stellar | AGENTROPOLIS-CITY-OF-AGENTS | 2026-09-18 | 0 | 活発だが★0・XRPL 部分は初期段階 | https://github.com/AGENTROPOLIS-CITY-OF-AGENTS/AGENTROPOLIS-PAYRAIL |

### D. XRPL Commons 過去ハッカソン作品（AI / エージェント / 決済系）

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 30 | Agent Octopus（2位） | エネルギーエージェント同士が発見・交渉・自動支払いするプロトコル（XRPL） | 4人チーム | ハッカソン終了時点 | — | ハッカソン作品（継続不明） | https://hackathons.xrpl-commons.org/projects |
| 31 | BumbleBee | 自律 AI スウォームが NGO キャンペーンを評価、**条件付きエスクロー管理・マイルストーン検証・信用スコアを XRPL に公開** | 4人チーム | 同上 | — | 同上 | https://hackathons.xrpl-commons.org/projects |
| 32 | AgentPay by Legasi | AI エージェント向けの安全な決済レイヤ。Claude 等の LLM を「支払える」ようにアップグレード | 2人チーム | 同上 | — | 同上 | https://hackathons.xrpl-commons.org/projects |
| 33 | XRPmodels | 分散 AI 推論マーケット。マイナーがセキュアエンクレーブで LLM を走らせ、クライアントはエスクロー経由でトークン従量課金 | 3人チーム | 同上 | — | 同上 | https://hackathons.xrpl-commons.org/projects |
| 34 | XRP402 / Obol | x402 による API 収益化。1行でのクリプト決済組み込み | 3-4人チーム | 同上 | — | 同上 | https://hackathons.xrpl-commons.org/projects |
| 35 | XRPL in Time | XRPL AMM 流動性管理・ポートフォリオリスク分析の対話型 AI アシスタント | 3人チーム | 同上 | — | 同上 | https://hackathons.xrpl-commons.org/projects |

### E. XRPL Grants 採択（AI / エージェント関連）

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 36 | T54 | 「AI エージェントが自律的に取引するための金融インフラ。XRPL でクリプトと実世界法定通貨を橋渡し」。$200,000 / Cohort 6 | t54.ai | 2026-09 時点で mainnet 稼働 | — | 活発（既に x402 facilitator を運用） | https://xrplgrants.org/awardees |
| 37 | ChatXRP | XRP Ledger と Web3 サービスを操作する AI チャットアプリ。$75,000 / Wave 6 | ChatXRP | [要確認] | — | [要確認] | https://xrplgrants.org/awardees |

### F. MPP / x402 エコシステム（他チェーン・競合把握用）

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 38 | x402-foundation/x402 | HTTP 402 ベースのインターネット決済プロトコル本体 | x402 Foundation | 2026-09-18 | 6622 | 非常に活発 | https://github.com/x402-foundation/x402 |
| 39 | wevm/mppx | MPP の TypeScript インターフェース。`xrpl-mpp-sdk` はこれを拡張 | wevm | 2026-09-17 | 176 | 非常に活発 | https://github.com/wevm/mppx |
| 40 | mpp.dev（公式 SDK 群） | MPP 公式仕様と TS / Python / Rust / Go(Tempo Labs) / Ruby(Stripe) SDK | Stripe / Tempo ほか | [要確認] | — | 活発 | https://mpp.dev/ |
| 41 | solana-foundation/pay | エージェント決済 CLI（x402, MPP, AP2） | Solana Foundation | 2026-09-18 | 1776 | 非常に活発 | https://github.com/solana-foundation/pay |
| 42 | solana-foundation/pay-kit | 9言語のエージェント決済ビルディングブロック | Solana Foundation | 2026-09-16 | 73 | 活発 | https://github.com/solana-foundation/pay-kit |
| 43 | google-agentic-commerce/a2a-x402 | A2A プロトコルへの x402 拡張 | Google | 2026-09-16 | 560 | 活発 | https://github.com/google-agentic-commerce/a2a-x402 |
| 44 | internet-court/internet-court-skill | **エージェント間商取引の信用レイヤ。** 自然言語 mandate、ERC-7710 委譲権限、x402 決済、エスクロー、紛争解決を1つの Agent Skill に | internet-court | 2026-09-18 | 5806 | 非常に活発（EVM系） | https://github.com/internet-court/internet-court-skill |
| 45 | BlockRunAI/ClawRouter | エージェント向け LLM ルータ。1ウォレットで全モデル、Base / Solana の USDC を x402 決済。t54 経由で XRPL にも決済流入 | BlockRunAI | 2026-09-18 | 6607 | 非常に活発 | https://github.com/BlockRunAI/ClawRouter |
| 46 | AIephant AI Agent Gateway | LLM 利用のルーティング・追跡・制御と、エージェント機能の x402 / MPP 有料エンドポイント化 | AlephantAI | 2026-09-14 | 113 | 活発 | https://github.com/AlephantAI/AIephant-AI-Agent-Gateway |
| 47 | cp0x-org/mppx（Go）/ ZenHive/mpp（Elixir）/ tomrowbo/mppx-hedera | MPP の各言語・各チェーン実装 | 各コミュニティ | 2026-05-29 / 2026-09-18 / 2026-06-09 | 11 / 2 / 0 | 活発〜停滞 | https://github.com/cp0x-org/mppx |
| 48 | Merit-Systems/x402scan | x402 エコシステムのエクスプローラ | Merit Systems | 2026-09-16 | 388 | 活発 | https://github.com/Merit-Systems/x402scan |
| 49 | xpaysh/awesome-agentic-commerce | ACP / UCP / AP2 / x402 / MPP の実装カタログ | xpaysh | 2026-09-14 | 82 | 活発 | https://github.com/xpaysh/awesome-agentic-commerce |

### G. エージェント予算管理・支出監査ツール（チェーン問わず）

| # | 名前 | 何をするか | 作者 | 最終更新 | Star | 状態 | URL |
|---|---|---|---|---|---|---|---|
| 50 | fskroes/AllowanceKit | **この領域で最も近い既存物。** x402 決済の支出上限 OSS。予算 / 1回あたり上限 / 承認ゲート / 監査証跡、CLI + ダッシュボード + SDK。**対応は Base(mainnet/Sepolia) と Solana(mainnet/devnet) のみ。XRPL 非対応** | fskroes（個人） | 2026-09-17 | 0 | 活発（75コミット, MIT）だが★0 | https://github.com/fskroes/AllowanceKit |
| 51 | aanayagrawal0-dev/PayKaro | AI 決済のガバナンス層。予算・加盟店ルール・承認閾値、全取引の評価/説明/記録、異議申立て、監査クエリ、支出予測 | 個人 | 2026-09-05 | 0 | 初期（作成 2026-09-04） | https://github.com/aanayagrawal0-dev/PayKaro |
| 52 | Hellotravisss/agentpay | クロスレールの支出ポリシーゲートウェイ。予算・1取引上限・受取人許可リスト。エージェントは資格情報を持たない | 個人 | 2026-07-04 | 0 | 停止 | https://github.com/Hellotravisss/agentpay |
| 53 | amurlaniakea/wallet-guard | ループ＆予算ガードレール。無進捗リトライを止め、支出上限を強制 | 個人 | 2026-08-04 | 1 | 停滞 | https://github.com/amurlaniakea/wallet-guard |
| 54 | HkSolDev/solagent-vault | Solana 上のエージェント用オンチェーンガードレール。プログラマブル支出上限、宛先ホワイトリスト、パニックロック（Rust/Anchor） | 個人 | 2026-06-25 | 0 | 停止 | https://github.com/HkSolDev/solagent-vault |
| 55 | 1clawAI/1claw-mcp / 1claw-sdk | エージェントへのジャストインタイムなシークレット供給（Vault） | 1clawAI | 2026-09-17 | 2 / 2 | 活発 | https://github.com/1clawAI/1claw-mcp |

---

## カテゴリ別の充足状況

| カテゴリ | 既存の有無 | 密度 | 根拠 |
|---|---|---|---|
| ウォレット操作（作成・残高・送金） | 有（公式） | **混雑** | XRPL Agent Wallet Skill + OWS 対応（[#4](https://github.com/XRPLF/xrpl-dev-portal/tree/master/.claude/skills/xrpl-skills/xrpl-agent-wallet)）、MCP サーバが最低6本（[#21](https://github.com/lgcarrier/xrpl-mcp-server) 他）。公式が標準を握っている |
| 支払いプロトコル（x402 / MPP） | 有（公式 + 商用） | **混雑** | `xrpl-mpp-sdk`（[#2](https://github.com/ripple/xrpl-mpp-sdk)）、t54 facilitator が mainnet 稼働（[#11](https://xrpl-x402.t54.ai/)）、実測 4,395 payments/hour（[#15](https://xrpl.fi/x402)）。後追いの価値なし |
| ローカル開発環境・SDK | 有（公式） | **混雑** | xrpl-up（[#3](https://github.com/ripple/xrpl-up)）、simpleXRPL（[#8](https://github.com/ripple/simpleXRPL)）、xrpl.js / xrpl-py |
| DEX 取引エージェント | 有（公式 + ハッカソン） | 普通 | XRPL Trading Skill（[#6](https://github.com/XRPLF/xrpl-dev-portal/tree/master/.claude/skills/xrpl-skills/xrpl-trading)）、XRPL in Time（[#35](https://hackathons.xrpl-commons.org/projects)） |
| エージェント間の信用・評判 | 有（少数・弱い） | 普通 | XRPL では xrpl-referee の12シグナル信用スコア（[#19](https://github.com/eamwhite1/xrpl-referee), ★0, 個人）と BumbleBee（ハッカソン作品）のみ。EVM 側は internet-court（★5806, [#44](https://github.com/internet-court/internet-court-skill)）が先行 |
| エスクロー活用（成果連動払い） | 有（少数） | 普通 | xrpl-referee の crypto-condition escrow（[#19](https://github.com/eamwhite1/xrpl-referee)）、BumbleBee / XRPmodels（ハッカソン）。**継続開発されている公開実装は実質1本** |
| **予算管理・支出上限のオンチェーン強制** | **XRPL には無し** | **空白** | AllowanceKit は Base / Solana のみ（[#50](https://github.com/fskroes/AllowanceKit)）。solagent-vault は Solana（[#54](https://github.com/HkSolDev/solagent-vault)）。XRPL 側は polymitapay/mcp のローカル設定変数（[#17](https://github.com/polymitapay/mcp)）どまりで、オンチェーン強制ではない |
| **支払先の事前許可（許可リスト / KYA）** | **OSS は無し。商用のみ** | **空白** | t54 の x402 Secure がクローズド商用（[#13](https://www.t54.ai/x402-secure)）。XLS-80 Permissioned Domains をエージェント支払先ホワイトリストに使う公開実装は GitHub 検索で発見できず |
| **支出レシート／人間による事後監査** | **XRPL ネイティブは無し** | **空白** | AGENTROPOLIS-PAYRAIL の task receipts が最も近いが★0・XRPL 部分は初期（[#29](https://github.com/AGENTROPOLIS-CITY-OF-AGENTS/AGENTROPOLIS-PAYRAIL)）。PayKaro は作成4日目・チェーン非依存（[#51](https://github.com/aanayagrawal0-dev/PayKaro)） |
| ID / Credentials（XLS-70）のエージェント利用 | 有（極少） | 薄い | xrpl-identity-mcp（[#20](https://github.com/jarod-vyent/xrpl-identity-mcp), ★1, 2026-07 以降停滞）、XRPL-Commons/XCS（[#24](https://github.com/XRPL-Commons/XCS), ★0） |
| 開発者ツール（エクスプローラ・計測） | 有 | 普通 | xrpl.fi/x402（[#15](https://xrpl.fi/x402)）、x402scan は EVM 中心（[#48](https://github.com/Merit-Systems/x402scan)） |

---

## 「空白」の候補

### 空白1: XRPL ネイティブな「エージェント支出上限のオンチェーン強制」

- **何が無いか**: 人間が事前に決めた予算（1回あたり上限 / 日次 / 総額 / 用途）を、**エージェントのソフトウェア設定ではなく XRPL の台帳ルールとして強制する**仕組み。現状の XRPL 系実装はすべて「エージェント自身が守る前提」の設定値であり、プロンプトインジェクションや実装バグで突破される。
- **根拠（探した場所と結果）**:
  - GitHub 検索 `agent budget spending limit wallet guardrails` → ヒット2件、いずれも非 XRPL（[wallet-guard](https://github.com/amurlaniakea/wallet-guard) ★1 / [solagent-vault](https://github.com/HkSolDev/solagent-vault) ★0・Solana）
  - GitHub 検索 `AI agent spending limit budget policy payments` → ヒット2件（[agentpay](https://github.com/Hellotravisss/agentpay) 2026-07 停止 / [PayKaro](https://github.com/aanayagrawal0-dev/PayKaro) 作成4日目）、どちらも XRPL 非対応
  - x402 向け予算管理の本命 [AllowanceKit](https://github.com/fskroes/AllowanceKit)（2026-09-17 更新, MIT）は README 上 Base / Solana のみ対応で XRPL の記載なし
  - XRPL 側で上限に触れるのは [polymitapay/mcp](https://github.com/polymitapay/mcp) のローカル設定4変数のみ（かつシードは平文保存）
  - [Ripple 公式 Starter Kit](https://ripple.com/insights/xrpl-ai-starter-kit/) と [v1.1 発表](https://dev.to/ripplexdev/the-xrp-ledger-ai-starter-kit-v11-open-standards-not-an-island-358k) に支出上限・予算管理の記述なし
- **なぜ誰もやっていないか（推測と明記）**: **推測。** ①エコシステムの関心が「まず払えるようにする」段階にあり、2026年6月に公式レールが出たばかりで制御層はまだ需要が顕在化していない。②他チェーンではスマートコントラクト（ERC-7710 委譲等）で解けるため、コントラクトを持たない XRPL でどう強制するかの設計が自明でない。
- **XRPL 固有機能で解けるか**:
  - **Payment Channel** が核心。`PaymentChannelCreate` の `Amount` が**上限のオンチェーン強制そのもの**。エージェントにはチャネルのオフレジャー・クレーム署名権のみ渡し、`Amount` を超える支払いは台帳が拒否する。`SettleDelay` と `CancelAfter` は「期限が来たら人間が取り消せる」時間的ガードになる。MPP の session intent（[xrpl-mpp-sdk](https://github.com/ripple/xrpl-mpp-sdk)）と同じ原語を使うので公式レールに乗れる。
  - **Credentials(XLS-70)** で「この予算枠を承認した人間」を証明。
  - **MPT** で用途限定トークン（例: API 費用専用）を発行し、汎用 XRP 残高と分離。
  - **注意: Payment Channel は XRP のみ**（[mpp.dev/payment-methods/xrpl](https://mpp.dev/payment-methods/xrpl)）。RLUSD / IOU の上限強制は別設計が必要 → ここが差別化点にも技術的リスクにもなる。

### 空白2: 支払先の事前許可リスト（「誰に払ってよいか」のオンチェーン判定）

- **何が無いか**: x402 / MPP は「HTTP 402 が返ってきたら払う」プロトコルで、**相手が正当なサービスかの検証をエージェントに委ねている**。「この Permissioned Domain に属する発行者/サービスにしか払わない」を台帳側で保証する OSS が存在しない。
- **根拠（探した場所と結果）**:
  - GitHub 検索 `XLS-70 credentials OR "permissioned domains" XLS-80 xrpl` → 40件中、エージェント決済に紐づくものは **0件**。ヒットは貸付（[XRPL-LendingDocs](https://github.com/VS1-Finance/XRPL-LendingDocs)、[orma](https://github.com/BuzzBallz/orma)）と ID（[xrpl-identity-mcp](https://github.com/jarod-vyent/xrpl-identity-mcp)）に偏る
  - GitHub 検索 `xrpl escrow credentials agent autonomous payment` → **0件**
  - 同等機能は t54 の [x402 Secure（KYA / delegation / risk gating）](https://www.t54.ai/x402-secure) にあるが**クローズドな商用サービス**で、OSS 代替がない
  - [XRPL-Commons/XCS](https://github.com/XRPL-Commons/XCS)（Credentials サービス）は★0・エージェント用途の記述なし
- **なぜ誰もやっていないか（推測と明記）**: **推測。** XLS-80 Permissioned Domains はもともと機関投資家の適格性判定（RWA / 許可型 DeFi）の文脈で設計されており、「エージェントの支払先ホワイトリスト」という転用が発想されていない。また x402 の思想が「アカウント不要・摩擦ゼロ」であるため、許可リストは逆行に見える。
- **XRPL 固有機能で解けるか**: **Permissioned Domains(XLS-80)** + **Credentials(XLS-70)**。サービス提供者に「監査済み API 提供者」Credential を発行し、エージェントは支払い実行前に台帳照会で検証。Payment Channel の宛先を許可ドメイン内アカウントに限定すれば、上限（空白1）と支払先（空白2）を1つの原語で同時に縛れる。

### 空白3: XRPL に残る「エージェント支出レシート」と人間側の事後監査・異議申立て

- **何が無いか**: エージェントが何に・いくら・なぜ払ったかを**機械可読なレシートとして台帳に紐づけ、後から人間が一覧・監査し、異議を申し立てて返金/エスクロー差し戻しまで持っていく**ワークフロー。x402 の決済は 1件あたり数千分の1セントの micropayment が毎時数千件発生しており（[xrpl.fi/x402](https://xrpl.fi/x402) 実測 約4,395 payments/hour）、**個々の取引は見えるが「何のための支出か」は台帳に残っていない**。
- **根拠（探した場所と結果）**:
  - GitHub 検索 `agent spend audit receipts ledger LLM cost tracking` → **0件**
  - task receipts に触れるのは [AGENTROPOLIS-PAYRAIL](https://github.com/AGENTROPOLIS-CITY-OF-AGENTS/AGENTROPOLIS-PAYRAIL) のみ（★0、XRPL は複数レールの1つ、Base が主）
  - [PayKaro](https://github.com/aanayagrawal0-dev/PayKaro) は監査クエリ・異議申立てを掲げるがチェーン非依存・作成4日目・★0
  - [xrpl.fi/x402](https://xrpl.fi/x402) は「取引件数のみが意味のある指標」と明記し、**用途別・エージェント別の内訳は提供していない**
  - [x402scan](https://github.com/Merit-Systems/x402scan)（★388）は EVM 中心で XRPL 対応の記述を確認できず
- **なぜ誰もやっていないか（推測と明記）**: **推測。** ①「エージェントに払わせる」ことが目的化していて、費用を持つ側（企業の経理・予算責任者）の視点で設計されたツールがまだ出ていない。②micropayment を1件ずつ台帳に書くとコストが見合わないため、集約設計（Payment Channel のクレーム束 + 1件のオンチェーン確定 + メタデータ）という一手間が要る。
- **XRPL 固有機能で解けるか**: **Payment Channel** のクレーム束を1つの `PaymentChannelClaim` に集約し、**MPT** のメタデータまたは **Memo** に期間・用途・エージェント ID を載せる。争いが起きた取引は **Escrow（crypto-condition）** に付け替えて条件付き返金にする。**Credentials(XLS-70)** で監査人（人間）の権限を表現する。

### 空白4（弱め）: RLUSD / IOU / MPT でのストリーミング少額決済

- **何が無いか**: MPP の session intent（Payment Channel）は **XRP 限定**で、RLUSD を含む IOU / MPT ではオフチェーンの累積クレームが使えない。
- **根拠**: [mpp.dev/payment-methods/xrpl](https://mpp.dev/payment-methods/xrpl) に「Payment Channels are XRP only」と明記。[xrpl-mpp-sdk README](https://github.com/ripple/xrpl-mpp-sdk) も charge = XRP/IOU/MPT、channel = PayChannel と区別している。
- **なぜ誰もやっていないか（推測と明記）**: **推測。** これは台帳のプロトコル制約であり、amendment（XLS 提案）レベルの変更が必要なため、アプリ層の実装者では解けない。
- **XRPL 固有機能で解けるか**: アプリ層では解けない。**本ラボでは扱わないことを推奨**（グラントの成果物として検証可能な形に落としにくい）。ただし「なぜ XRP 建てで設計したか」の説明材料としては使える。

---

## 確認できなかったこと

- [要確認] `https://xrpl.org/docs/agents/` のインデックスページが 404 を返す（個別ページ `agentic-transactions`, `agentic-payments-x402`, `xrpl-agent-wallet-skill` は存在）。公式サイトの構成変更中の可能性。
- [要確認] npm（`x402-xrpl`, `xrpl-mpp-sdk`）と PyPI のダウンロード数・最終公開日。npmjs.com が 403 を返し取得できず。**実際の採用度合いはスター数では測れないため、別経路で要確認。**
- [要確認] 各 GitHub リポジトリの正確な最終コミット日時。GitHub API（`api.github.com`）と `gh` CLI が本セッションで利用不可のため、表の「最終更新」は GitHub 検索 API の `updated_at`（= push を含むリポジトリ更新時刻）を記載。WebFetch のみで確認した項目（AllowanceKit のコミット数など）は日付を特定できていない。
- [要確認] XRPL Commons ハッカソン各作品（Agent Octopus / BumbleBee / AgentPay by Legasi / XRPmodels）の **GitHub リポジトリ URL とハッカソン後の継続状況**。projects ページに個別リンクが見当たらず、検索でも特定できなかった。空白の主張を確定させる前に、少なくとも BumbleBee（条件付きエスクロー + 信用スコア）と Agent Octopus（エージェント間交渉・自動支払い）のコードは要確認。
- [要確認] XRPL Grants の AI Fund で**現在どの提案が審査中／採択済みか**。[awardees ページ](https://xrplgrants.org/awardees)は過去 Cohort 中心で、2026年の AI Fund 採択一覧を確認できなかった。空白1〜3 と衝突する既採択案件がある可能性。
- [要確認] t54 の x402 Secure（KYA / delegation）が具体的に何を検証しているか。商用ページのみで技術詳細・API 仕様が非公開。空白2 の「OSS 代替がない」という主張はこの点に依存する。
- [要確認] `xrpl-referee`（空白1〜3 に最も近い個人プロジェクト）の実稼働状況。MCP エンドポイント `https://mcp.cryptovault.co.uk/mcp` が生きているか未検証。
- [要確認] Mastercard Agent Pay と XRPL AI Starter Kit の提携関係（The Defiant の報道あり）。一次ソース未確認のため本文には含めていない。
