# 競合検証: eamwhite1/xrpl-referee

検証日: 2026-09-18
検証者: Builder

検証方法: リポジトリを実際に clone（383コミット全取得）、稼働エンドポイントに実際に HTTP リクエストを送信、
XRPL メインネットの public JSON-RPC で実トランザクションを照会。すべて読み取り専用操作のみ。
金銭が動く操作・書き込み操作は一切実行していない。

---

## 結論（3行以内）

- **実在し、実際に稼働している。** MCP サーバ / REST API / playground / health すべて 200 応答、MCP は実際に 40 個のツールを返す。XRPL **メインネット**上に実際の EscrowCreate / EscrowFinish が存在する。
- しかし **支払先の許可リスト（allowlist / XLS-80 Permissioned Domains / XLS-70 Credentials）は一切実装されていない。** Payment Channel も未使用（grep でヒット 0）。
- 支出上限は**台帳では強制されておらず**、MCP の助言ツール `assess_counterparty_and_job` が返す**忠告テキスト**にすぎない。エスクロー作成 API 側に上限チェックは存在しない。→ **我々の差別化余地は大きい。**

---

## 稼働確認

すべて 2026-09-18 09:12-09:15 UTC に実行。

| エンドポイント | 実行コマンド | HTTPステータス | 応答の要約 | 判定 |
|---|---|---|---|---|
| `/status` | `curl -sS -m 20 https://mcp.cryptovault.co.uk/status` | **200** | `{"status":"online","version":"7.0","protocol_version":"agenttrust/0.1.0","mcp_endpoint":"https://mcp.cryptovault.co.uk/mcp","timestamp":"2026-09-18T09:12:02..."}` | 稼働 |
| `/health` | `curl -sS -m 20 .../health` | **200** | `/status` と同一の JSON | 稼働 |
| `/docs` | `curl -sS -m 20 .../docs` | **200** | Swagger UI HTML（title: `AgentTrust Protocol Core - Swagger UI`）1023 bytes | 稼働 |
| `/openapi.json` | `curl -sS -m 25 .../openapi.json` | **200** | OpenAPI 3.1.0、55,219 bytes、**63 パス**定義 | 稼働 |
| `/playground` | `curl -sS -m 20 .../playground` | **200** | `Referee Playground — AgentTrust` HTML、23,244 bytes（リポジトリ内 `playground.html` と同サイズ） | 稼働 |
| `/mcp` (JSON-RPC `tools/list`) | `curl -sSL -m 40 -X POST .../mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'` | **200**（`-L` 必須。`-L` なしだと **307**） | SSE 形式で 55,723 bytes、**tools 配列の要素数 = 40** | 稼働 |
| `/marketplace/jobs` | `curl -sS -m 25 .../marketplace/jobs` | **200** | 実ジョブ 7,268 bytes。例: `JOB-37B6-5BD5` "Minimal CLAUDE.md for agent hire..." bounty 11.0 XRP, `is_demo:false`, `bid_count:1` | 稼働（実データあり） |
| `/nft/issuers` | `curl -sS -m 25 .../nft/issuers` | **200** | 発行体レジストリ 2,821 bytes。Bitstamp / BPM Wallet (Twotixx) / CSC 等 | 稼働 |
| `/fees` | `curl -sS -m 25 .../fees` | **200** | `audit_fee.usd=0.1`、XRP 0.07566 / RLUSD / Base USDC。`network:"xrpl:0"`（= **mainnet**） | 稼働 |
| `/wallet/score/{address}` | `curl -sS -m 30 .../wallet/score/rmcSrkpZ2i2kuvtCPeTVetee9SixP4djR` | **200** | `score:28`、`score_breakdown` に **12 個**のシグナル（account_age, balance, on_chain_activity, domain_verified, nfts_held, escrow_completion, peer_rating, wallet_sig_verified, sanctions_clear, entity_reputation, xaman_kyc, agentrust_kyc）、`total_escrows:4` | 稼働（12シグナルは実在） |
| `/xrp/price` | `curl -sS -m 30 .../xrp/price` | **200** | `{"usd":1.3364,"gbp":1.0558}` | 稼働 |
| `/marketplace/skills` | `curl -sS -m 30 .../marketplace/skills` | **200** | スキル一覧。ただし返ってきた項目は `is_demo:true`（SVC-001〜、`rDevAgentXXXXXXXX...` のダミーアドレス） | 稼働（中身はデモ） |
| `/.well-known/agent.json` | `curl -sS -m 20 .../.well-known/agent.json` | **200** | `agentVersion:"9.0.0"`, `capabilities.escrow:true`, 認証 `x402`/`x-payment-hash` | 稼働 |
| `/.well-known/xrpl-issuer-registry` | `curl -sS -m 25 .../.well-known/xrpl-issuer-registry` | **200** | レジストリ discovery、`version:"1.0.0"`, `published:"2026-06-06"` | 稼働 |
| `/escrow/{id}`（存在しないID） | `curl -sS -m 20 .../escrow/AT-DOESNOTEXIST` | **404** | `{"detail":"Receipt code 'AT-DOESNOTEXIST' not found."}` | 正常動作 |
| `/wallet/{address}/trust-score` | `curl -sS -m 25 .../wallet/rmcSrkp.../trust-score` | **404** | `{"detail":"Not Found"}` | 実パスは `/wallet/score/{address}`。そちらは稼働 |

### 叩かなかったエンドポイント（意図的）
`/audit`, `/escrow/generate`, `/escrow/{id}/submit`, `/evaluate`, `POST /jobs`, `/jobs/{id}/bid`, `/jobs/{id}/award`, `/jobs/{id}/claim` などの副作用のある POST は**一切実行していない**。
課金要件は副作用なしで `GET /.well-known/payment-required` から確認した（HTTP 200）:
- `paidEndpoints`: `/audit`, `/escrow/generate`, `/marketplace/skills`
- `freeEndpoints`: `/marketplace/jobs`, `/wallet/score/{address}`, `/wallet/sanctions/{address}`, `/jobs (GET)`, `/status`, `/.well-known/*`
- 課金方式: x402。0.074828 XRP（約 $0.10）を `rmcSrkpZ2i2kuvtCPeTVetee9SixP4djR` に **XRPL Mainnet** で送金し、tx hash を `X-PAYMENT` ヘッダまたは `fee_hash` に入れる
- 無料枠: trust score >= 25 のウォレットは 3 回まで無料

---

## 実装の確認

ソースは `git clone https://github.com/eamwhite1/xrpl-referee.git` → `git fetch --unshallow` で全 383 コミットを取得して確認。
主要ファイル: `referee.py`（350,549 bytes）, `mcp_server.py`（114,115 bytes）。

| 確認項目 | 結果 | 根拠（ファイル名・行・コード断片・URL） |
|---|---|---|
| **支出上限の強制場所** | **台帳ではなくアプリ側、しかも「助言」レベル。エスクロー作成 API には上限チェックが存在しない。** | `grep -rn "escrow_cap" --include=*.py .` のヒットは **`mcp_server.py` の 2297/2299/2301/2339/2377/2378 行のみ**。この行はすべて `mcp_server.py:2234` の `async def assess_counterparty_and_job(...)`（`@mcp.tool` の**事前チェック助言ツール**）の内部。上限導出は `mcp_server.py:2297-2301`: `if sanctioned: escrow_cap_xrp = 0 / elif kyc_verified: 10000 / max(xrp_price_usd,0.01) / else: 3000 / max(...)`。判定は `mcp_server.py:2339`: `if amount_xrp > 0 and amount_xrp > escrow_cap_xrp: blockers.append(f"Intended amount ... exceeds escrow cap ...")` → 戻り値の `do_not_proceed_if` 配列に**文字列として入るだけ**。実際のエスクロー生成 `/escrow/generate`（`referee.py:4290-4330`）の金額バリデーションは **下限のみ**: `if not amount_xrp or amount_xrp < MIN_ESCROW_XRP: raise HTTPException(400, ...)`（`MIN_ESCROW_XRP = 0.000001` = 1 drop、`referee.py:1548`）。**上限の raise は存在しない。** 金額超過で拒否する分岐は `referee.py` 内に無い |
| | 台帳が保証するのは「1件のエスクローの Amount と Destination が作成時に固定される」ことのみ | `EscrowCreate` の `amount` / `destination` は買い手が送信時に指定（README Step 3、`referee.py:4440` `escrow_amount = str(int(amount_xrp * 1_000_000))`）。これは XRPL エスクローの標準性質であり、**複数トランザクションにまたがる「支出上限」ではない** |
| | 別途 Travel Rule 的な閾値があるが、これも**警告のみ** | `referee.py:1085` `THRESHOLD_WARN_USD = 1_000 # Travel Rule trigger — issue compliance_warning`。`referee.py:4454` `if threshold.get("level") == "warn": response_body["compliance_warning"] = threshold["compliance_warning"]` → **ブロックせずレスポンスに文字列を足すだけ** |
| | （紛らわしいが無関係）`max_budget` は上限ではない | `referee.py:5840` の `max_budget` は `@app.get("/jobs")` の**求人検索フィルタ**（`referee.py:5862` `if max_budget > 0 and budget > max_budget: continue`）。支出制御とは無関係 |
| **支払先の許可リスト** | **実装されていない。** ← 最重要 | `grep -rn -i "allowlist\|allow_list\|whitelist\|white_list\|allowed_destination\|permitted_payee\|approved_recipient" --include=*.py --include=*.json --include=*.md --include=*.html .` → **ヒット 0**。さらに広い語で `grep -rn -iE "trusted_destination\|allowed_(payee\|recipient\|address\|destination)\|destination_(allow\|whitelist\|list)\|payee_list\|restrict.{0,15}destination\|approved_(payee\|vendor\|counterpart)"` → **ヒット 0**。支払先 `worker_address` は買い手が都度自由に指定するだけで、事前登録された許可先集合という概念が存在しない |
| | 近いが別物: `required_domain` は「支払先の制限」ではなく「**解放条件**」 | `referee.py:4860-4868`: `if vault.required_domain: expected = None if vault.required_domain == "ANY" else vault.required_domain; domain_result = await verify_domain_ownership(vault.worker_address, expected)` → 失敗しても `proof_results` に False が入るだけで、**資金は既に指定済みの worker_address 宛にロックされている**。台帳が支払先を制限しているのではなく、レフェリーが解放鍵を出すか否かを決めているだけ。また判定は**事後（作業提出時）**であり、事前の許可リストではない |
| | `DepositPreauth`（台帳ネイティブの受取許可制）も未使用 | `grep` で `DepositPreauth\|deposit_preauth` → ヒット 0。なお `/wallet/score` の応答には `xrpscan_flags.deposit_auth` という**他人のウォレットの状態を読むだけ**のフィールドがあるが、自ら設定・強制はしていない |
| **Payment Channel の使用** | **使用していない。Escrow と通常 Payment のみ。** | `grep -rn -i "PaymentChannel\|payment_channel\|paychan\|XLS-?3[34]\|channel_authorize\|channel_verify" --include=*.py --include=*.json --include=*.md --include=*.html --include=*.yaml .` → **ヒット 0**。使用トランザクション型の実測（`grep -oE` で集計）: `EscrowCreate 41 / Payment 35 / EscrowFinish 17 / AccountSet 12 / NFTokenCreateOffer 8 / NFTokenAcceptOffer 1`。`PaymentChannelCreate` / `PaymentChannelClaim` / `PaymentChannelFund` は **0 件**。メインネットの実 tx 履歴でも Payment Channel 系は 0 件（下記） |
| **XLS-80 / XLS-70 の使用** | **どちらも未使用。** | `grep -rn -i "PermissionedDomain\|permissioned_domain\|XLS-80\|XLS80\|XLS-70\|XLS70\|CredentialCreate\|CredentialAccept"`（.git 除く全ファイル）→ **ヒット 0** |
| | 「Verifiable Credentials」は**W3C VC（オフチェーン JWT）**であって XLS-70 ではない | `referee.py:4872-4881`: `vc_result = await verify_w3c_credential(req.vc_jwt, vault.required_vc_issuer_did, vault.required_vc_type)`。`vc_jwt` を HTTP で受け取って検証する方式（エンドポイント `POST /vc/verify`）。台帳上の Credential オブジェクトではない |
| | 言及のある XLS は別物（XLS-26 / XLS-85） | XLS-26 = `xrp-ledger.toml` によるドメイン検証（README「XLS-26 compatible」）。XLS-85 = RLUSD トークンエスクロー（`referee.py:4318-4330`、なお発行体が `lsfAllowTrustLineLocking` 未設定のため **RLUSD エスクローは 503 で利用不可**と自ら記載） |
| **mainnet / testnet** | **mainnet のみ。testnet 設定は存在しない。** | `referee.py:1520` `XRPL_URL = os.getenv("XRPL_URL", "https://xrplcluster.com")`（メインネット公開クラスタ）。`referee.py:1686` `XRPL_CAIP2_NETWORK = "xrpl:0" # mainnet, per x402 CAIP-2 convention`。`referee.py:1539` `BASE_RPC_URL = ... "https://mainnet.base.org"`。grep で `altnet` / `testnet` / `devnet` / `rippletest` の URL は **ヒット 0**（`s1.ripple.com` / `s2.ripple.com` / `data.ripple.com` はいずれもメインネット系） |
| | **実際にメインネットで動いている証拠あり** | `curl -X POST https://xrplcluster.com -d '{"method":"account_info","params":[{"account":"rmcSrkpZ2i2kuvtCPeTVetee9SixP4djR","ledger_index":"validated"}]}'` → HTTP 200, `status: success`, Balance **11,623,106 drops（約 11.62 XRP）**, Sequence 102198248, validated ledger 107066257。`/wallet/score` が返した `balance_xrp: 11.62` と一致 |
| | 実 tx 履歴（account_tx, limit 400、全履歴 82件） | 期間 **2026-02-12 〜 2026-09-12**。内訳: `Payment 61 / EscrowFinish 5 / EscrowCreate 5 / EscrowCancel 5 / CheckCreate 3 / CheckCancel 3`。**PaymentChannel 系は 0 件**。→ エスクローは実在するが**完了 5 件と低ボリューム**。`/wallet/score` も `total_escrows:4, passed_escrows:0` を返す |
| **ライセンス** | **MIT** | `LICENSE`: `MIT License / Copyright (c) 2026 Ed White` |
| **最終更新日** | **2026-09-15（検証日の3日前）。非常にアクティブ。** | `git log -1 --format='%H %ad %an %s' --date=iso` → `c1d68e28ac1dfc4c70d89a9cc4405165fbc343eb 2026-09-15 22:22:24 +0000 Claude feat: criteria_met/criteria_failed as first-class verdict fields (v2.2.0)`。`git rev-list --count HEAD` = **383**（コミット383はREADME通り）。初回コミット 2026-02-12。直近は 2026-09-15 に 11 コミット集中。作者名が `Claude` のコミットが多数 = AI 支援で高速開発されている |

### 規模の実測（README より大きい）
- README は「**36-tool**」と記載 → 実際の `tools/list` は **40 個**。README の記載より機能が多い
- ドキュメントと実装にいくつか細かな差異を観測したが、本プロジェクトの判断に影響しないため
  記録しない（先方は活発に開発中であり、追随している途中と見られる）

---

## 我々の企画との重複

### 重複する部分
- **XRPL 上でエージェント間決済を扱う OSS** という土俵そのもの（ライセンスも MIT 同士）
- **エージェントが勝手に払いすぎないようにする**という問題意識。`assess_counterparty_and_job` の escrow cap（KYC 済 $10,000 / 未 $3,000）、`THRESHOLD_WARN_USD = 1000` は、我々の「支出上限」と**狙いが同じ**
- **支払先が信用できるかを判定する**という問題意識。12シグナルのトラストスコア、OFAC スクリーニング、NFT 発行体レジストリ、`required_domain`（XLS-26 ドメイン検証）は、我々の「支払先の許可リスト」と**動機が重なる**
- MCP ツールとしてエージェントホストに露出させる形態
- エスクローによる条件付き資金ロック（crypto-condition）

### 重複しない部分（＝我々の差別化余地）
1. **強制レイヤーが根本的に違う（最大の差別化点）**
   先方の上限も許可判定も、最終的には**レフェリーサーバが解放鍵を出すか否か**で決まる。金額上限に至っては `do_not_proceed_if` に文字列を足すだけで、`/escrow/generate` は上限超過を拒否しない（根拠は上表）。つまり **エージェントやクライアントがその助言を無視すれば素通りする**。
   我々は Payment Channel の `Amount` と Permissioned Domains で**台帳自身に強制させる**。バリデータが拒否するため、アプリのバグ・悪意・助言無視のいずれでも破れない。これは「信用を最小化する」という先方自身の掲げる目標に対して、我々の方が厳密に達成している。
2. **支払先の許可リストが先方に存在しない**
   grep 2 通りでヒット 0。先方は「支払った後に、条件を満たしたか判定して解放するか決める」モデル。我々は「**そもそも許可リスト外には送れない**」モデル。事後判定 vs 事前不能化という質的な差。
3. **XLS-80 / XLS-70 が完全に空白**
   先方は XLS-26（toml ドメイン検証）と XLS-85（RLUSD エスクロー、しかも発行体未対応で 503）に触れているだけ。最新のパーミッション系標準は未着手。我々が先行できる。
4. **Payment Channel が完全に空白**
   先方は Escrow のみ。Escrow は 1 件ごとに条件と宛先を固定する「単発ロック」で、**継続的な支出枠**という概念を表現できない。Payment Channel なら「上限 X まで、この相手に、何度でも少額決済」が台帳で表現できる。エージェントの反復的な少額支払いというユースケースは先方の設計では素直に扱えない。
5. **信頼する第三者の有無**
   先方はレフェリーが fulfillment（解放鍵）を保管し（`referee.py:648` `fulfillment = Column(String, nullable=False)`、`encrypt_fulfillment`/`decrypt_fulfillment`）、EscrowFinish を代理送信する。README は "The Referee never holds funds" と書くが、**解放の可否を握る中央サービスであることは事実**。サービス停止・鍵漏洩・恣意的判断のリスクが残る。我々の台帳強制方式にはこの単一障害点がない。
6. **AI 依存の有無**
   先方のコア価値は Gemini 2.5 Pro による成果物の品質判定。我々は「誰にいくらまで払えるか」という**決定論的な制約**であり、AI の判断ゆらぎ・コスト・可用性に依存しない。レイヤーが違うため、**理論上は補完関係になりうる**（先方の上に我々の台帳制約を敷く構成も可能）。

---

## 確認できなかったこと

- [要確認] **副作用のある POST（`/audit`, `/escrow/generate`, `/evaluate`, `POST /jobs` 等）は一度も実行していない。** ルールに従い課金・エスクロー作成・ジョブ投稿を回避したため、「AI 監査が実際に妥当な PASS/FAIL を返すか」「エスクロー解放が実際に最後まで通るか」は**未検証**。メインネット上に `EscrowFinish` が 5 件成功していることから解放フロー自体は機能していると**推測**されるが、実行して確かめてはいない。
- [要確認] MCP の 40 ツールは `tools/list` のスキーマを確認しただけで、**個々のツールを `tools/call` で実行していない**。動作の正否は未検証。
- [要確認] Smithery（`smithery.ai/server/xrpl/agent-trust`）、HuggingFace Space、`www.cryptovault.co.uk` 本体は未アクセス。実ユーザー数・利用実績は不明。Star 0 以外の採用指標を取れていない。
- [要確認] PostgreSQL に入っている実エスクロー総数は外からは見えない。`/wallet/score` が protocol wallet について返した `total_escrows:4 / passed_escrows:0` と、メインネット実 tx の `EscrowCreate 5 / EscrowFinish 5 / EscrowCancel 5` の差異の意味は未解明（テスト分を含む可能性）。
- [要確認] 先方が今後 XLS-80 / XLS-70 / Payment Channel に着手する計画があるかは不明。Issue / PR / ロードマップを見ていない。**開発速度が非常に速い（1日11コミット）ため、我々の差別化点が短期間で埋められるリスクは実在する**と推測する。
- [要確認] `require_consensus`（2モデル合議）は README に記載があるが、コミット `#105` で `ai-plugin.json` の説明から削除されており、現在有効かどうかは未確認。
