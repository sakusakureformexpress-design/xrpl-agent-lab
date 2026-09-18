# XRPL Grants 応募要件の調査
調査日: 2026-09-18

## 結論（3行以内）

1. **今この瞬間、XRPL Grants の応募窓口は閉じている。** 公式応募ポータルに「There are presently no open calls for applications.」と明記されており（<https://submit.xrplgrants.org/submit>）、Japan/Korea Fund・AI Fund の個別応募フォームも同様に閉じている。
2. **「Japan/Korea Fund」「AI Fund」は独立した応募要件・金額・締切を持つ制度ではない。** 公式サイト上の実体は一行の説明文のみで、応募は全ファンド共通の単一フォームに統合されている（<https://xrplgrants.org/>）。
3. **マイルストーン「プロダクト/統合 約30%・成長系 約70%」は一次ソースで裏が取れた**（<https://xrplgrants.org/faq>）。一方でオープンソース化は必須ではなく、GitHub の公開すら required ではない（同 FAQ）。

---

## 確認できた事実

### A. 現在の応募可否・締切の形式

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 応募窓口の現状 | 公式応募ポータル（Submittable）に「**There are presently no open calls for applications.**」と表示。ページ内に有効な応募フォームへのリンクは存在しない（確認したリンクは FAQ・ログイン・メールのみ） | <https://submit.xrplgrants.org/submit> | 2026-09-18 取得 |
| 締切の形式 | **ウェーブ制 → ローリング制へ移行済み。** 「Rolling applications to ensure timely support and decisions for projects **replacing the previous staggered Waves approach** that ran for multiple months with longer wait times.」 | <https://ripple.com/insights/unlocking-innovation-the-evolution-of-ripples-xrpl-community-support-programs/> | 2024-05-09 |
| 次の締切 | **公表された次回締切は存在しない。** 公式トップに「Additional new programming to be announced in **October 2026**. For questions, contact info@xrplgrants.org.」とあるのみ | <https://xrplgrants.org/> | 2026-09-18 取得 |
| 現在 "Apply now" とされている枠 | ①Brinc Hong Kong Financial Innovation Program（HFIP）②Tenity Singapore Financial Infrastructure Innovation Program の2つ（アクセラレータ系） | <https://xrplgrants.org/> | 2026-09-18 取得 |
| ただし①は締切済 | Brinc 側のページは「**The applications are closed.** Fill the form below for getting notified on future programs.」 | <https://brinc.io/xrpl-program> | 2026-09-18 取得 |
| ②も締切済 | Tenity SFIIP 2026 の応募締切は「**25 July 2026**」、プログラム期間は「**5 October – 13 November 2026**」。本日（2026-09-18）時点で締切を過ぎている | <https://www.tenity.com/program/sfiip-2026> | 2026-09-18 取得 |
| 事前審査の所要期間 | 「We aim to conclude pre-screenings **on a rolling basis and within 2-3 weeks of submission**.」（※これは Accelerator 応募に関する設問への回答） | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

> ⚠️ **重要な矛盾**: 公式トップは2つのプログラムを「Applications now open」として掲示しているが、リンク先の両方が実際には締切済み。トップページの記載が更新されていない。

### B. 選考プロセス

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 選考5段階 | STEP 1: Submit an Application Form → STEP 2: Qualified projects will be invited to submit a **full application** → STEP 3: Finalists are invited to **interview** → STEP 4: Awardees are selected → STEP 5: Awarded projects are onboarded and **the first milestones are funded** | <https://xrplgrants.org/> | 2026-09-18 取得 |
| 各段階の所要期間 | **未公表**（pre-screening の 2-3 週間以外、各段階の期間は公式に記載なし） | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 審査体制 | 「The judging panel includes renowned subject matter experts ...: CTOs, product managers, VCs and investors, and XRPL Community members, **including past awardees**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 審査ルーブリック | **Technical Assessment Rubric** と **Business Assessment Rubric** の2本立て。技術側は Technical Team Strength / Technical Design and XRPL Alignment / Code Walkthrough and Review Quality / Product Roadmap and Milestones。ビジネス側は Team Strength / Project Roadmap and Milestones / Market Opportunity / Project Traction / Financial Project Sustainability / XRPL Utility and Onchain Activity Use Case Alignment / Commitment to the XRPL | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| ロードマップ要件 | 「the XRPL integration **prioritized as an early milestone**」が明示的な評価項目 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 再応募 | 可。「Yes, we strongly encourage you to do so.」ただし前回からの進捗を強調すること | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 同時複数応募 | **不可。**「We will only consider **a single project per organization/team/project lead**.」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

### C. マイルストーン構造（※依頼の「30%/70%」の裏取り）

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| **30/70 の裏取り（確認済）** | 「Awards range between **$10,000 and $200,000** per project in **non-dilutive** grant funding based on attaining funding milestones.」+「**Product & integration milestones (~30% of the award)**」+「**Growth-based milestones (~70% of the grant)** for hitting **on-chain metrics on the XRP Ledger** or other key growth metrics」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| Accelerator の金額 | 「Program grants range between **$50,000 USD - $200,000 USD** and will be allocated according to **development and adoption-based milestones**. These will be discussed with the Ripple team **after your acceptance**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| Accelerator 上限（別記載） | 「The XRPL Accelerator Program offers **up to $200K** in funding which includes development and adoption-based milestones」 | <https://xrplgrants.org/accelerator> | 2026-09-18 取得 |
| プロジェクト期間 | 「for projects **up to 12 months** in duration」／応募時に「Product Roadmap & Milestones for **up to 12 months**」を提出 | <https://submit.xrplgrants.org/submit> ／ <https://xrplgrants.org/about> | 2026-09-18 取得 |
| 資金使途の制限 | 「We are looking to support **technical project development** and related expenses. Projects requesting funding for **general infrastructure (including validators) and overhead may not be funded**. Your budget **may include salaries, legal fees, external audits**, etc.」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 未使用分の返還義務 | 「The Developer Fee **in its entirety must be used for software development on the XRP Ledger**. At Ripple's request, **you will repay any unused portion** of the Developer Fee」 | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| 追加/継続グラント | 「it is **not a guarantee**. If you are a previous awardee and interested in applying for follow-on funding, please contact the funding program team」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

### D. オープンソース化は必須か → **必須ではない**

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| GitHub 共有 | 「It is **not required**, but it is **preferred** that teams share an active Github repository with project code for review.」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 公開リポジトリか | 「The Github repo, **does not have to be public**, but please ensure that it is can be shareable with application reviewers **at least temporarily**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| GitHub が無い場合 | 「you may share the **technical design** of your project, including **system design diagrams and narrative**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 現行ポータルの但し書き | 「**All applicants requesting grant funding of any size must provide code access for technical review. This requirement applies regardless of company stage.**」（※"code access"であって"公開"ではない） | <https://submit.xrplgrants.org/submit> | 2026-09-18 取得 |
| 規約上の義務 | **Terms and Conditions 全文に "open source" / "public repository" / "GitHub" の文字列は一度も出現しない**（ページ本文を機械的に全文検索して確認）。よってオープンソース化の契約上の義務は無い | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| 参考: 採択実績の内訳 | 公式 Awardees ページの掲載データ199件のうち "Open Source" タグ付きは **40件（約20%）**。つまり大半の採択案件はオープンソースとしてタグ付けされていない（※この数値は筆者がページ掲載データを集計したもの） | <https://xrplgrants.org/awardees> | 2026-09-18 取得 |
| ただしIPは広範なライセンス付与あり | 「You hereby grant to Ripple a **non-exclusive, irrevocable, perpetual, worldwide, royalty-free, sublicensable** right and license to use, reproduce, modify, distribute, display, publish, perform, transmit and access your **Participant Materials**」 | <https://xrplgrants.org/terms> | 2026-09-18 取得 |

### E. 応募資格（Eligibility）

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 年齢・制裁 | 「at least **18 years of age** and **not a citizen of, or located in, a country or territory on an OFAC Sanctions List**」（日本は非該当） | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 法人の要否 | **法人不要。**「We consider applications submitted by **small teams, pre-incorporation, or individuals**, as well as companies.」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| ただしAccelerator側の注意 | 「potential **venture funding after** concluding the Accelerator program is **only accessible to incorporated entities and not individuals**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| プロダクト成熟度 | 「you should **at least have a Minimum Viable Product (MVP)** that can capture sufficient market demand」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| XRPL経験 | 「Previous XRPL experience is **not required, but highly encouraged**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| Ripple社員 | 応募不可。「Employees at Ripple are **not eligible** to apply」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 提出物 | Proof of Concept or MVP／Proof of Code または Code Architecture と XRPL統合計画／**2分のプロジェクトデモ**／12ヶ月分のロードマップ＆マイルストーン／収益化・財務持続性の計画／トラクションと成長指標 | <https://xrplgrants.org/about> | 2026-09-18 取得 |
| 技術者要件（Accelerator） | 「**At least one experienced software developer** on the core project team」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

### F. Japan/Korea Fund

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 公式サイト上の実体 | ファンド一覧のカード1枚と説明文1行のみ：**「For projects and ventures based in Japan or Korea」**（※HTMLでは非表示のため、ページ配信元の JS バンドルから原文を抽出して確認） | <https://xrplgrants.org/> | 2026-09-18 取得 |
| 個別の応募要件・金額・締切 | **公式サイト上に一切記載なし。** 「By applying via a **single unified application form**, you will be considered for **all programs** under the XRPL Grants and XRPL Accelerator Programs.」＝共通フォーム経由 | <https://xrplgrants.org/> | 2026-09-18 取得 |
| ファンド発表 | 「XRPL Japan and Korea Fund」を発表。Ripple の **10億XRP コミットメント**の一部で、規模は「**tens of millions of dollars over time**」（具体的な確定額は非公表） | <https://ripple.com/insights/unveiling-new-ripple-fund-accelerating-innovation-on-the-xrp-ledger-in-japan-and-korea/> | **2024-06-11** |
| 同（プレスリリース） | 対象は①企業連携②開発者グラント③アーリーステージ投資④コミュニティ育成（イベント・ハッカソン・教育）の4本柱。パートナーは **SBI Holdings**、**HashKey DX** | <https://ripple.com/ripple-press/ripple-launches-dedicated-fund-to-accelerate-innovation-on-the-xrp-ledger-in-japan-and-korea/> | **2024-06-11** |
| 日本向け具体施策 | Ripple が **Web3 Salon**（**JETRO** 支援）と提携。「**up to $200,000 per project over the next year**」を提供。原資は **XRPL Japan and Korea Fund**。対象は「**early-stage startups based in Japan**」、重点は DeFi・トークン化RWA・デジタル決済。選考は「growth potential, technological sophistication, and alignment with Ripple's investment priorities」 | <https://ripple.com/insights/unlocking-innovation-in-japan/> | **2025-06-09** |
| 同上・イベント | 「**four major community events** between now and **March 2026**」（＝本調査時点で終了済みの期間） | <https://ripple.com/insights/unlocking-innovation-in-japan/> | 2025-06-09 |
| 応募方法 | 専用フォームは無く「Learn more about eligibility at XRPL Grants」として <https://xrplgrants.org/> に誘導されるのみ | <https://ripple.com/insights/unlocking-innovation-in-japan/> | 2025-06-09 |

> ⚠️ **注意（誇張の訂正）**: 複数の暗号資産ニュースが Japan/Korea Fund の設立を「June 2023」と書いているが、**Ripple 公式は 2024-06-11**。一次ソースを採用した。

### G. AI Fund

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 公式サイト上の実体 | 説明文1行のみ：**「For AI use cases, also leveraging the XRPL」**（同じく JS バンドルから原文抽出） | <https://xrplgrants.org/> | 2026-09-18 取得 |
| 専用応募フォーム | 「XRPL Grants - AI Fund Application」という専用フォームURLが存在するが、**アクセスすると共通ポータルにリダイレクトされ「There are presently no open calls for applications.」と表示される（＝現在クローズ）** | <https://submit.xrplgrants.org/submit/5fdbb7d9-57ee-4005-a309-8308c4ba2b46/xrpl-grants-ai-fund-application> | 2026-09-18 取得 |
| **現在の AI 重点領域（最重要）** | 現行ポータルの優先領域8つのうち1つが **「AI & Agentic Commerce: Agent-to-agent payments (x402), AI-native financial products, autonomous transaction infrastructure」** | <https://submit.xrplgrants.org/submit> | 2026-09-18 取得 |
| 他の優先領域 | Payments & FX／Credit & Lending／Stablecoin Integration（RLUSD等）／Tokenization & Capital Markets／Infrastructure & Tooling／DeFi／Other | <https://submit.xrplgrants.org/submit> | 2026-09-18 取得 |
| Brinc HFIP でも同様 | 重点領域に **「AI & Agentic Commerce」** が含まれる | <https://brinc.io/xrpl-program> | 2026-09-18 取得 |
| 全体の優先ユースケース | 「XRPL Grants and XRPL Accelerator are **currently prioritizing**: Decentralized Finance (DeFi) / Real World Asset Tokenization (RWA) / Payments / Trade Finance」 | <https://xrplgrants.org/> | 2026-09-18 取得 |

> **示唆になる観察**: 公式トップの「currently prioritizing」4項目に AI は入っていないが、実際の応募ポータルの優先領域には「AI & Agentic Commerce」が明記されている。**ポータル側のほうが新しく、かつ具体的**。

### H. その他のファンド（参考）

| ファンド名 | 公式の説明（原文） | 出典URL |
|---|---|---|
| Brazil Fund | 「For projects and ventures based in Brazil」 | <https://xrplgrants.org/> |
| Artificial Intelligence (AI) Fund | 「For AI use cases, also leveraging the XRPL」 | <https://xrplgrants.org/> |
| Onchain Finance | 「For any project team, this is a global fund open primarily to Decentralized Finance (DeFi), Real-World Assets (RWA), and payments use cases.」 | <https://xrplgrants.org/> |
| Japan/Korea Fund | 「For projects and ventures based in Japan or Korea」 | <https://xrplgrants.org/> |
| XRPL Accelerator Programs | 「Focused on entrepreneurs seeking to scale their projects into thriving web3 businesses that build on the strength of the XRPL.」 | <https://xrplgrants.org/> |

### I. 2026年の制度変更（重要な文脈）

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 分散型モデルへの移行 | 「Historically, much of the XRP Ledger ecosystem funding flowed through **Ripple-supported initiatives such as XRPL Grants**. While those programs remain important, **2026 marks a shift toward a more distributed model**.」 | <https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/> | **2026-02-26** |
| 新しい受け皿 | ①**FinTech Builder Program**（institutional-grade financial applications on XRPL）②**XAO DAO** ③**XRPL Commons**（GLOW 等）④**XRP Asia**（地域ハブ、準備中）⑤**UDAX**（大学向け、グローバル展開） | <https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/> | 2026-02-26 |
| 推奨アクション | 「Builders are encouraged to **stay connected** with the XRPL ecosystem through entities such as **XRPL Commons, XAO DAO, and the XRPL Foundation** for updates on funding opportunities.」 | <https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/> | 2026-02-26 |
| 公式の資金調達先一覧 | xrpl.org の公式ページが挙げるのは3つ：**RippleX Ecosystem Programs**（非希薄化・マイルストーン型グラント、6-12週のアクセラレータ）／**UBRI**（大学向け、UDAX・Student Builder Residency、60以上の大学）／**XRPL Commons**（XRPL Academy、grants、The Aquarium Residency = 12週パリ、GLOW rewards） | <https://xrpl.org/community/developer-funding> | 2026-09-18 取得 |

### J. 支払い・税務・契約（日本在住者に関わる部分）

| 項目 | 内容 | 出典URL | 情報の日付 |
|---|---|---|---|
| 契約相手 | **Ripple Labs Inc.**（米国法人）およびその子会社・関連会社。規約名は「XRP Ledger Developer Program Terms and Conditions」 | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| **支払通貨** | 「YOU MAY RECEIVE CERTAIN AMOUNTS OF **XRP OR FIAT CURRENCY** ("DEVELOPER FEES")」／定義でも「"Developer Fee" means the eligible amount of **XRP or fiat currency**」＝**XRP建てか法定通貨建てかは確定していない** | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| 金額表示 | 応募・審査上の金額は **USD** 建てで提示（$10,000〜$200,000） | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| **税務の負担** | 「Often, this funding is **treated as taxable income**, but **recipients are responsible for determining the tax implications** of receiving an award based in their **respective countries' tax laws** and compliance requirements. **You should factor in and include the estimated taxes in your submitted budget document.**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| **米国税務書類の提出義務** | 「If requested by Ripple, you shall promptly provide Ripple with a valid **IRS W-9 form, valid IRS series W-8 form**, or other similar **tax residency certification**」＝日本居住者は W-8BEN / W-8BEN-E 系の提出を求められる可能性 | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| 源泉徴収 | 「If and to the extent applicable law obligates Ripple to **deduct Taxes** from any Developer Fee paid to you **including from the transfer of XRP**, Ripple shall timely deduct and remit such Taxes」。かつ「Ripple shall have **no obligation to indemnify, gross-up, or otherwise reimburse** you for applicable Taxes」＝**税金は受領額から差し引かれ、その分の補填は無い** | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| XRP建ての場合の自己責任 | 「you **cannot cancel, reverse, or change** any XRP transaction that has been completed」／「you are **solely responsible** for maintaining adequate security and control of any and all IDs, passwords, ... secret keys」 | <https://xrplgrants.org/terms> | 2026-09-18 取得 |
| 予算書の要件 | 「Your application must contain **milestones/scope of work and a budget breakdown** detailing how you intend to spend any awarded funds.」「You are responsible for figuring out **tax rates and any estimated conversion** and including them in your budget estimations.」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| Ripple との関係 | 「solely participating in the program **does not by default make you an affiliate** of Ripple」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| Accelerator の現地参加 | **不要。**「No, the default format of the program is **hybrid and predominantly virtual**. You are welcome to join us on-site at all times, but **if you're unable to travel, you can still access all benefits**」。ただし「Each cohort features an **on-site demo week** at the end」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |
| 地域外コホートへの応募 | 可。ただし「**Mentor availability and curriculum delivery align with the timezone of the program location.**」 | <https://xrplgrants.org/faq> | 2026-09-18 取得 |

---

## 過去の採択プロジェクト

公式 Awardees ページ（<https://xrplgrants.org/awardees>）に掲載されているデータを機械的に抽出して集計した。掲載件数は **199件**。

### 公式が掲げる全体数値

| 項目 | 値 | 出典URL |
|---|---|---|
| 累計授与額 | **$15M+** | <https://xrplgrants.org/about> |
| 採択チーム数 | **140+ teams awarded globally** | <https://xrplgrants.org/about> |
| 国数 | **30+ countries represented** | <https://xrplgrants.org/about> |

> 注: 上記は公式掲示の数値。筆者が Awardees ページの掲載データを集計すると 199件・合計 $18,312,000（金額記載のある193件分）となり公式表記と差がある。Accelerator 分の混在等が理由と思われるが**確認できていない**。以下の表は「ページ掲載データからの抽出」であることを明記する。

### AI/エージェント関連（"Artificial Intelligence" タグ付き＝199件中わずか4件）

| プロジェクト名 | 内容 | AI/エージェント関連か | 出典URL |
|---|---|---|---|
| **T54** | 「Financial infrastructure for **AI agents to transact autonomously**, using XRP Ledger for bridging crypto and real-world fiat.」$200,000（＝上限満額）／USA／TEAM／cohort-6 | **◎ 最も近い。AIエージェント決済インフラそのもの** | <https://xrplgrants.org/awardees> ／ <https://t54.ai/> |
| **Agrify** | 「**AI-powered platform** for regenerative agriculture that provides traceability and trade through on-chain produce passports and a verified marketplace. Uses XRPL-based **RLUSD wallets** for payments, with smart escrows and carbon-linked rewards via the **MPT token standard**.」$100,000／UK／TEAM／cohort-6 | ○ AI応用＋XRPL決済 | <https://xrplgrants.org/awardees> ／ <https://agrifyafrica.xyz/> |
| **ChatXRP** | 「**AI-powered chat application** with a seamless, user-friendly interface for interacting with the XRP Ledger and Web3 services.」$75,000／USA／**INDIVIDUAL（個人）** | ○ LLM×XRPL操作UI | <https://xrplgrants.org/awardees> ／ <https://chatxrp.app> |
| **Liisa** | 「**AI-enabled platform** that supports NFT investors by aggregating and analyzing quantitative and qualitative data across collections.」$25,000／Portugal／COMPANY | △ AI分析ツール | <https://xrplgrants.org/awardees> ／ <https://www.liisa.io> |

### 日本・韓国の採択実績

| プロジェクト名 | 内容 | AI/エージェント関連か | 出典URL |
|---|---|---|---|
| **VWBL**（日本・唯一） | 「On-chain access control and key management protocol that uses NFTs to encapsulate encrypted data for real-world scenarios such as medical exams.」**$32,500**／Japan／TEAM | × | <https://xrplgrants.org/awardees> ／ <https://vwbl-protocol.org/> |
| **Moai Finance**（韓国） | 「multi-chain DEX and cross-chain DEX aggregator with an AMM-based protocol」**$175,000**／South Korea／TEAM／cohort-3 | × | <https://xrplgrants.org/awardees> ／ <https://moai-finance.xyz> |

> Ripple 公式も「The XRPL Grants program's **Wave 7** funded **VWBL**, based in Japan, and **Moai Finance**, based in Korea」と記載（<https://ripple.com/insights/unveiling-new-ripple-fund-accelerating-innovation-on-the-xrp-ledger-in-japan-and-korea/>、2024-06-11）。

### 掲載データからの集計（筆者による抽出。出典は同じ Awardees ページ）

| 指標 | 値 |
|---|---|
| 掲載件数 | 199件 |
| チーム種別 | COMPANY 90／TEAM 61／**INDIVIDUAL 45**／ACADEMIC 2／NON_PROFIT 1 |
| **個人（INDIVIDUAL）の授与額** | n=44、最小 **$10,000**、最大 **$200,000**、中央値 **$75,000** |
| 全体の授与額 | n=193、最小 $10,000、最大 $200,000 |
| 最頻の授与額 | $100,000（53件）、$50,000（32件）、$75,000（21件）、$150,000（21件）、$200,000（18件） |
| カテゴリ上位 | NFT 66／Tooling 55／**Open Source 40**／DeFi 39／Infrastructure-Security 37／EC 33 ／…／**AI 4** |
| 所在地上位 | USA 56（"USA"+"United States"）／UK 29／Australia 12／Singapore 11／Brazil 10／India 8／**Japan 1** |
| アジア圏の採択 | Singapore 11、India 8、South Korea 1、Hong Kong 1、Philippines 1、**Japan 1** |

**→ 日本からの採択は199件中1件のみ（VWBL, $32,500）。日本は Japan/Korea Fund の名前を冠しているにもかかわらず、公表実績は極端に少ない。**

---

## 確認できなかったこと

- **[要確認] Japan/Korea Fund の個別の応募要件・採択枠数・年間予算・締切**
  公式に存在するのは「For projects and ventures based in Japan or Korea」の一行のみ。金額は「tens of millions of dollars over time」という表現しかなく、確定額は非公表。
  → **聞き方**: `info@xrplgrants.org` または現行ポータル記載の `RippleXEcosystem@ripple.com` に日本語不可・英語でメール。ポータルに「schedule an informational meeting with a member of our team」とあるため、**面談枠の予約が最も確実**（<https://submit.xrplgrants.org/submit>）。あわせて **Web3 Salon**（JETRO支援、<https://ripple.com/insights/unlocking-innovation-in-japan/> 記載）に日本語で問い合わせるのが実務上は最短と思われる。

- **[要確認] AI Fund の締切・予算規模・採択枠**
  専用フォームURLは実在するが現在クローズ。金額レンジや締切は公式サイトに一切記載なし。
  → **聞き方**: 同上。特に「AI & Agentic Commerce（x402含む）」枠が次にいつ開くかを名指しで質問する。

- **[要確認] 次の応募窓口が開く時期**
  確認できたのは「Additional new programming to be announced in **October 2026**」（<https://xrplgrants.org/>）のみ。何が発表されるかは不明。
  → **聞き方**: トップページのメールマガジン（"Get Updates Delivered to Your Inbox"）に登録 ＋ 10月の発表を待つ。

- **[要確認] 選考プロセス各段階の所要期間**
  pre-screening の「2-3 weeks」以外、STEP2→STEP5 の所要期間は非公表。
  → **聞き方**: 過去採択者（例: ChatXRP は個人採択者）に直接聞くのが早い。判定員に「past awardees」が含まれるため、XRPL Developers Discord（<https://xrpldevs.org/>）で採択経験者に聞ける可能性が高い。

- **[要確認] 成長マイルストーンの「具体的な数値例」**
  **これは公開情報では見つからなかった。** 確認できたのは構造（~70%が growth-based、「on-chain metrics on the XRP Ledger or other key growth metrics」）だけで、「月間アクティブウォレット◯件」「月間トランザクション◯件」といった実際の目標値の事例は、Ripple 公式・採択者公式のいずれにも掲載されていない。XRPL Commons 側の Early Stage Grants も「money is released when teams meet **agreed** development or growth targets」（<https://news.bitcoin.com/xrpl-commons-unveils-new-grants-program-to-accelerate-xrp-ledger-builder-growth/>, 2026-07-23）とあり、**案件ごとの個別交渉**である可能性が高い。
  → **聞き方**: ①採択済プロジェクト（T54、Agrify、ChatXRP）に直接コンタクト ②XRPL Developers Discord で過去採択者に聞く ③面談時にプログラムチームへ「典型的な growth milestone のサンプルを見せてほしい」と依頼。

- **[要確認] XRPL Commons の各グラントの金額・締切・応募リンク**
  Commons 公式サイト（<https://www.xrpl-commons.org/>）には grants の専用ページが見つからず（`/grants` は404）、トラック名・金額はニュース記事経由の情報しか取れていない。Make Waves の1位賞金「25,000 XRP」「9月21日締切」は **news.bitcoin.com（2026-07-23）が出典で、Commons 公式での裏取りができていない**。
  → **聞き方**: XRPL Commons に直接問い合わせ、または <https://x.com/XRPLF> の告知を確認。

- **[要確認] 実際の支払通貨（XRP か USD か）と支払タイミング**
  規約上は「XRP or fiat currency」両方あり得るとしか書かれていない。日本在住者にとって XRP 建てだと受領時の時価評価・雑所得計上など扱いが大きく変わる。
  → **聞き方**: 採択後の契約交渉時に確定する事項と思われるが、応募前に面談で確認可能。

- **[要確認] 日本在住個人が受け取る場合の具体的な税務・送金実務**
  規約から確実に言えるのは「課税所得として扱われることが多い」「税は受領者負担でgross-upなし」「W-8系フォームの提出を求められ得る」まで。**日本側の具体的な申告区分（雑所得か事業所得か）、消費税の課否、日米租税条約の適用可否は、本調査では一切確認できていない。**
  → **聞き方**: **日本の税理士（暗号資産・国際取引に明るい者）に相談が必須。** Claude の調査で代替してはいけない領域。

- **[未確認] 公式の「140+ teams / $15M+」と Awardees ページ掲載199件・$18.3M の差の理由**

---

## 示唆

以下はすべて**筆者の推測**であり、出典のある事実ではない。

1. **【推測】今は「応募する」フェーズではなく「準備して待つ」フェーズ。**
   応募窓口が閉じており、トップページに掲示された2つの"Apply now"すら実際は締切済み。一方で「October 2026 に新プログラム発表」と明記されている。**10月の発表を待って、それに合わせて出せる状態を作っておくのが合理的**と推測する。

2. **【推測】「Japan/Korea Fund」を独立制度として狙うのは筋が悪い。**
   公式の実体が一行の説明文のみで、応募は共通フォームに統合されている。**「日本枠だから通りやすい」という期待は持たないほうがよい**と推測する。実際、公表採択実績は日本1件（$32,500）にとどまり、これは全体の中央値（$75,000〜$100,000）を大きく下回る。むしろ Ripple × Web3 Salon（JETRO支援）のルート（<https://ripple.com/insights/unlocking-innovation-in-japan/>）のほうが、日本の個人・小規模チームには現実的な接点だと推測する。

3. **【推測】AI エージェント案件は、追い風が強い。**
   現行ポータルの優先領域に「**AI & Agentic Commerce: Agent-to-agent payments (x402), AI-native financial products, autonomous transaction infrastructure**」が明記されており（<https://submit.xrplgrants.org/submit>）、直近 cohort-6 では AI エージェント決済インフラの **T54 が上限満額 $200,000** を獲得している。**x402（エージェント間決済）を明示的に絡める設計が、現在のプログラム側の関心と最も一致している**と推測する。

4. **【推測】「オープンソース必須」という前提で設計する必要はないが、コード開示は避けられない。**
   規約上オープンソース義務は無く、GitHub も非公開で構わない（ただしレビュー用に一時共有）。しかし現行ポータルは「規模を問わず、グラント申請者は全員 technical review のための code access を提供しなければならない」と明記。**「非公開リポジトリ＋審査員への一時招待」が最小構成**と推測する。ただし Participant Materials に対して Ripple へ広範・永久・サブライセンス可のライセンスを付与する点は、応募前に許容できるか判断が必要。

5. **【推測】70%が成長マイルストーンである以上、「作って終わり」の計画は通らない。**
   product/integration が約30%ということは、**開発完了時点で受け取れるのは最大でも申請額の3割程度**。残り7割は on-chain metrics に紐づく。**個人開発者にとっては「実際にユーザーとトランザクションを取りにいく体制」が資金繰り上の最大リスク**になると推測する。応募額を大きくするほど、後半7割の達成難度が上がる構造。中央値の $75,000 前後が個人には現実的なレンジだと推測する。

6. **【推測】個人開発者でも十分に射程内。**
   掲載199件のうち **45件が INDIVIDUAL**（個人）で、その中央値は $75,000、最大は $200,000。法人設立は応募要件ではない（<https://xrplgrants.org/faq>）。**日本在住の個人開発者にとっての障壁は「資格」ではなく、①窓口が開いていないこと ②英語での応募・面談 ③税務処理 ④成長マイルストーン7割の達成、の4点だと推測する。**

7. **【推測】2026年は Ripple 単独から分散モデルへの過渡期で、窓口が読みにくい。**
   Ripple 自身が2026年2月に「2026 marks a shift toward a more distributed model」と宣言し、XRPL Commons / XAO DAO / XRPL Foundation を代替の接点として案内している（<https://ripple.com/insights/supporting-innovation-on-the-xrp-ledger/>）。**XRPL Grants 一本に賭けず、XRPL Commons（Glow / Aquarium / Make Waves / Early Stage Grants）を並行して追うべき**だと推測する。ただし Commons 側の条件は本調査では一次ソースで確定できていない。
