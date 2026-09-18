# セキュリティレビュー

レビュー日: 2026-09-18
対象コミット: `7514fa8dc7138dc025fb2a3b96a8e75ca28a5288`
レビュー範囲: `src/leash/` `src/broker/` `src/lib/rpc.js` `src/mcp/server.js` `bin/leash.js` `examples/`

前提: 本リポジトリは既に公開済みであり、助成金審査でコード審査を受ける。
かつ**人の資金を扱う**ことを目的としている。この前提で、曖昧なものは問題側に倒して判定した。

## サマリ

| 深刻度 | 件数 |
|---|---|
| high | 5 |
| medium | 9 |
| low | 11 |

high 5 件のうち **4 件は実際にコードを動かして再現済み**。

---

## 指摘

### [HIGH-1] ブローカーの日次上限は並行要求で突破できる（TOCTOU）

- **場所**: `src/broker/broker.js:78-98`（判定は `src/broker/policy.js:65-68`）
- **問題**: 状態の読み出し（`#loadState`）・判定（`decide`）・署名・状態の書き戻し（`#saveState`）の間に
  **`await autofill(...)` という XRPL への往復が挟まる**。ロックも CAS も無い。
  同時に来た N 件の要求は全て `spentDrops = 0` を読み、全て上限内と判定され、全てに署名される。
  書き戻しは lost update になり、状態ファイルには 1 件分しか記録されない。
- **該当コード**:
  ```js
  const { all, key, state } = this.#loadState(agentName);      // 78-79 読む
  const verdict = decide({ ..., state });                       // 80    判定
  if (!verdict.allow) return verdict;
  const tx = await autofill({ ... });                           // 83    ★ここで中断する
  const signed = this.wallet.sign(tx);                          // 90    署名
  state.spentDrops = (BigInt(state.spentDrops) + BigInt(amountDrops)).toString();
  this.#saveState(all, key, state);                             // 95    書く
  ```
- **再現/根拠**: **再現済み。** 日次上限 100,000 drops のポリシーで
  `Promise.all` により 100,000 drops の要求を 5 件並行させた結果:

  ```
  日次上限: 100000 drops / 並行要求: 5 件 × 100000 drops
    #0..#4 すべて allow=true code=OK signed=YES
  署名された合計: 500000 drops   （上限の 5 倍）
  状態ファイルの記録: {"spentDrops":"100000", ...}   （1 件分しか残らない）

  署名済み tx の中身:
    Sequence=1..5  Amount=100000  Destination=rEeZ...vwE1   （5 本とも独立に提出可能）
  ```
  XRPL への往復はスタブ化した（`account_info` が Sequence を進める実環境を模擬）。
  Sequence が異なるため、**5 本すべてが台帳に通る**。
- **影響**: 日次上限は事実上機能しない。上限突破の唯一の歯止めはブローカー口座の残高のみ。
  x402 のように「支払先が実行時に判明し、並行してリクエストが飛ぶ」用途では現実的に起きる。
- **修正案**:
  1. 要求を単一のキューで直列化する（最小の修正）。または
  2. 状態の更新を CAS にする。`#loadState` 時に読んだ内容の hash / mtime を保持し、
     `#saveState` で一致しなければ判定からやり直す。
  3. **署名の前に予約（reserve）を確定させる**。`decide` 通過直後に `spentDrops` を加算して
     ファイルに `O_EXCL` 付きの一時ファイル + `rename` で原子的に書き、その後に `autofill`/`sign` を行う。
     署名に失敗したら予約を戻す。
  4. 状態ファイルは `proper-lockfile` 相当の排他ロック、書き込みは `write to tmp + rename` で原子化する。
- **確認済みか**: **再現済み**（スクリプト実行、上記出力）。

---

### [HIGH-2] x402 merchant は受け取った `signedTxBlob` の中身を一切検証していない

- **場所**: `examples/x402-server.js:53-69`
- **問題**: merchant は決済の検証を `accepted?.payTo !== payTo`（55行）でしか行わない。
  しかし **`accepted` はクライアントが base64 で送ってきた自己申告のエコー**であり、
  実際に提出する `payload.signedTxBlob` とは何の結び付きも無い。
  blob はデコードすらされず、`TransactionType` / `Destination` / `Amount` / `Account` が確認されない。
  攻撃者は「正しい payTo を書いた `accepted`」と「自分宛に 1 drop 送るだけの tx」を組み合わせれば、
  **一銭も払わずに有料コンテンツを取得できる**。
- **該当コード**:
  ```js
  const { accepted, payload } = unb64(sig);
  if (accepted?.payTo !== payTo) throw new Error('payTo が一致しない');   // ← 自己申告を自己申告と比較している
  if (!payload?.signedTxBlob) throw new Error('signedTxBlob が無い');
  const settled = await submitAndWait(payload.signedTxBlob);              // ← 中身を見ずに提出
  if (settled.result !== 'tesSUCCESS') { ... 402 ... }
  // → 200 でコンテンツを配信
  ```
- **再現/根拠**: **再現済み。** `startMerchant({ payTo: rEeZ...vwE1, priceDrops: '20000' })` を起動し、
  攻撃者が自分宛に 1 drop 送る tx を署名して送信した結果:

  ```
  merchant の要求価格 : 20000 drops → rEeZFPMu6VEjQ7ib4hpoJKdKqLRCNCvwE1
  実際に提出された tx : 1 drop → 攻撃者自身 rLhEbzk3zJHGYQ4uTWtWjf3ESNtHwbvDP
  HTTP status: 200
  body: {"symbol":"XRP/USD","price":3.41,...}
  → 無償でコンテンツを取得（再現済み）
  ```
  （XRPL RPC はスタブ化し `submit` が `tesSUCCESS` を返す状況を模擬。
  実ネットでも自分宛 1 drop の送金は `tesSUCCESS` になるため、条件は同じ。）
- **影響**: これは `examples/` だが、リポジトリが提示する x402 の**参照実装**である。
  審査者はここを読み、実装者はここを写す。放置すれば merchant 側の資金（＝売上）が失われる。
- **修正案**: 提出前に blob をデコードし、最低限すべて検証する。
  ```js
  import { decode } from 'ripple-binary-codec';
  const tx = decode(payload.signedTxBlob);
  if (tx.TransactionType !== 'Payment') throw new Error('Payment ではない');
  if (tx.Destination !== payTo) throw new Error('宛先が自分ではない');
  if (typeof tx.Amount !== 'string' || BigInt(tx.Amount) < BigInt(priceDrops)) throw new Error('金額不足');
  if (tx.DestinationTag !== undefined) { /* invoice との突合 */ }
  ```
  さらに `accepts[].extra.invoiceId` を `InvoiceID` / `DestinationTag` として tx に載せさせ、
  **一度使った invoice は再利用不可**にする（現状 invoice は発行するだけで照合していない）。
- **確認済みか**: **再現済み**（実際に merchant を起動し 200 を取得）。

---

### [HIGH-3] MCP の累計額を「換金済み残高」から計算しているため、未換金バウチャが上書きされる

- **場所**: `src/mcp/server.js:116`（値の出どころは `src/leash/owner.js:79`）
- **問題**: Payment Channel のバウチャは**累計額**で表現される。
  しかし累計額の計算元 `budget.spentXrp` は `account_channels` の `balance`、すなわち
  **支払先が既に換金した額**である。支払先がまだ換金していない段階で次の支払いを行うと、
  2 枚目のバウチャは 1 枚目を含まない累計額になり、**1 枚目を無効化して上書きする**。
  支払先は 2 回サービスを提供して 1 回分しか受け取れない。
- **該当コード**:
  ```js
  // src/mcp/server.js:116
  const cumulative = (Number(budget.spentXrp) + amount).toString();
  // src/leash/owner.js:79
  spentXrp: dropsToXrp(c.balance),      // ← 換金済み額であって、発行済みバウチャの合計ではない
  ```
- **再現/根拠**: **再現済み。** 台帳の `balance = 0` の状態で 0.5 XRP の支払いを 2 回行った:
  ```
  1回目 (0.5 XRP 支払い) cumulative = 0.5
  2回目 (0.5 XRP 支払い) cumulative = 0.5
  → 合計 1.0 XRP 支払ったはずが、換金できる総額は 0.5 XRP のみ
  ```
  x402 のように「都度払いで即座に何度も呼ぶ」用途では、支払先が毎回同期的に換金しない限り必ず起きる。
  逆向きの危険もある: 支払先が 1 枚目を換金した直後に 2 枚目を作ると正しくなるため、
  **タイミング次第で正しくも誤りにもなる**（＝テストで気付きにくい）。
- **影響**: 支払先（サービス提供者）の資金が失われる。エージェント側から見れば
  「1 回分の支払いで 2 回サービスを受ける」ことが可能。
- **修正案**:
  - MCP サーバ側で**発行済みバウチャの累計**を永続化し、`max(台帳の balance, 発行済み累計)` を基準にする。
  - 計算は drops の `BigInt` で行う（[MEDIUM-1] 参照）。
  - 加えて、状態ファイルの書き込みは [HIGH-1] と同じ原子性・排他が要る
    （同じエージェントが並行して `authorize_payment` を呼べば同じ上書きが起きる）。
- **確認済みか**: **再現済み**（`LeashAgent.authorize` を実際に 2 回呼び、累計額が同値になることを確認）。

---

### [HIGH-4] 未確定の `tesSUCCESS` を「決済完了」として扱っている

- **場所**: `src/lib/rpc.js:86` / `src/leash/payee.js:34` / `examples/x402-server.js:59` / `src/leash/owner.js:57`
- **問題**: `submitAndWait` は確定待ちがタイムアウトすると
  `{ validated: false, result: preliminary }` を返す。`preliminary` は `submit` の `engine_result`、
  すなわち**暫定結果**であり、`tesSUCCESS` でも台帳に載る保証は無い
  （同一 Sequence の別 tx に負ける、`LastLedgerSequence` 超過、チャネル残高の変化など）。
  呼び出し側はいずれも `validated` を見ず `result === 'tesSUCCESS'` だけで判定している。
- **該当コード**:
  ```js
  // src/lib/rpc.js:86
  return { validated: false, hash, result: preliminary, message: '確定待ちでタイムアウト' };
  // src/leash/payee.js:34
  accepted: res.result === 'tesSUCCESS',           // validated を見ていない
  // examples/x402-server.js:59
  if (settled.result !== 'tesSUCCESS') { ... }     // 通れば 200 でコンテンツ配信
  ```
- **再現/根拠**: **再現済み。** `submit` が `tesSUCCESS` を返し、以後 `tx` が `txnNotFound` を返し続ける状況で:
  ```
  submitAndWait の戻り値: {"validated":false,"hash":"AABB","result":"tesSUCCESS","message":"確定待ちでタイムアウト"}
  payee.redeem の accepted 判定 (res.result === "tesSUCCESS"): true
  x402-server の判定: ★コンテンツを配信
  ```
- **影響**: 支払先は入金が確定していないのにサービス／商品を引き渡す。
  `owner.grantBudget` も未確定の枠を「作成済み」として channelId を返す。
- **修正案**: `submitAndWait` のタイムアウト経路では `result` に暫定値を入れず
  `result: undefined, timedOut: true` のように**確定と区別できる形**で返す。
  呼び出し側は `res.validated === true && res.result === 'tesSUCCESS'` を必須条件にする。
  さらに `LastLedgerSequence` を超えるまで待ち、超えたら「確実に失敗」と判定できるようにする
  （現状 `tries=25 × 4s = 100 秒` は `LastLedgerSequence = +40 ledger ≒ 160 秒` より短く、
  「まだ有効だが結果不明」の状態で打ち切っている）。
- **確認済みか**: **再現済み**（`submitAndWait` を直接呼び戻り値を確認）。

---

### [HIGH-5] ブローカーの署名鍵がエージェントと同一プロセスに置かれ、公開プロパティとして読める

- **場所**: `src/broker/broker.js:27` / `examples/x402-client.js:16`
- **問題**: `this.wallet = Wallet.fromSeed(seed)` で保持される `Wallet` は
  `seed` と `privateKey` を**列挙可能な公開プロパティ**として持つ。
  そして参照実装 `fetchWithPayment(url, broker, agentName)` は
  **ブローカーのインスタンスそのものをエージェント側のコードに渡している**。
  同一プロセス内の任意のコード（乗っ取られたエージェント、悪意ある npm 依存、
  プラグイン、ログ出力）が `broker.wallet.seed` に到達できる。
  ポリシー判定を一切経由せずに口座を空にできる。
- **再現/根拠**: **再現済み。**
  ```
  JSON.stringify(broker) にシードが含まれるか: ★含まれる
    抜粋: {"policyPath":"...","statePath":"...","wallet":{"publicKey":"ED3ABA...","privateKey":"EDEC7270D4B1...
  broker.wallet.seed 直接読み出し: ★成功
  Object.keys(wallet): publicKey, privateKey, classicAddress, seed
  ```
  つまり `console.log(broker)` / エラーレポータ / クラッシュダンプ / `util.inspect` の
  いずれか一つでシードが平文で流出する。**ログ漏洩の一次要因になりうる。**
- **影響**: README が掲げる「エージェント（LLM）は口座の鍵を一切持たない」という主張が、
  参照実装の構成では成立していない。鍵が漏れる＝high。
- **修正案**:
  1. **ブローカーを別プロセス／別ホストにする。** エージェントとは
     Unix ドメインソケット or HTTP（loopback + トークン）で会話し、
     エージェントには「署名済み blob」だけを渡す。`broker` オブジェクトを渡さない。
     `examples/x402-client.js` の引数はブローカーの**クライアント**（RPC スタブ）にする。
  2. `wallet` を `#wallet`（private field）にする。少なくとも
     `Object.defineProperty(this, 'wallet', { enumerable: false })` で
     `JSON.stringify` / `util.inspect` から外す。
  3. `LeashBroker` に `toJSON()` / `[util.inspect.custom]()` を定義し、
     鍵を含まない安全な表現を返す。`src/leash/agent.js:19` の `this.privateKey` も同様。
- **確認済みか**: **再現済み**（`LeashBroker` を実際に構築し `JSON.stringify` で seed を取り出した）。

---

### [MEDIUM-1] 浮動小数で累計 XRP を計算しており、支払いが例外で止まる

- **場所**: `src/mcp/server.js:116`, `src/mcp/server.js:99-100,124`
- **問題**: `Number(budget.spentXrp) + amount` は二進浮動小数の加算。
  結果が 6 桁を超える小数になると `xrpToDrops` が例外を投げ、`authorize_payment` が落ちる。
- **再現/根拠**: **再現済み。**
  ```
  spent=0.1 + amount=0.2 -> "0.30000000000000004" : 例外 -> xrpToDrops: value '...' has too many decimal places.
  spent=0.7 + amount=0.1 -> "0.7999999999999999"  : 例外 -> 同上
  spent=2.675 + amount=0.1 -> "2.775"              : 署名OK
  ```
  `0.1 XRP` 単位の少額決済という本ツールの主用途で、ごく普通に発生する。
- **影響**: 資金は失われないが、支払い機能が停止する。
  MCP のツールハンドラは例外を捕まえていないため、エラーはプロトコル層まで伝播する。
- **修正案**: XRP 表記を捨て、**内部計算は全て drops の `BigInt` で行う**。
  `listBudgets` は `capDrops` / `spentDrops` / `remainingDrops` を文字列で返し、
  表示のときだけ XRP に変換する。`agent.authorize` も drops を受け取る API にする。
- **確認済みか**: **再現済み**。

### [MEDIUM-2] 支払先アドレスのチェックサムを検証していない

- **場所**: `src/broker/policy.js:45`
- **問題**: `/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/` は base58 の**文字種と長さしか見ていない**。
  base58check のチェックサムを検証しないため、実在しない／打ち間違えたアドレスが通る。
  `payTo` は**敵対的でありうる merchant** から来る（`examples/x402-client.js:30`）。
- **再現/根拠**: **再現済み。** `autoApprove: true` のポリシーで:
  ```
  r111111111111111111111111            allow= true OK   （isValidClassicAddress = false）
  rEeZFPMu6VEjQ7ib4hpoJKdKqLRCNCvwEa   allow= true OK   （isValidClassicAddress = false）
  ```
- **影響**: 判定は通り、その後の `wallet.sign` でエンコード例外になる（＝ブローカーのクラッシュ／DoS）。
  この経路では状態が保存されないため予算は消費されないが、
  merchant は無償でブローカーを落とせる。
- **修正案**: `import { isValidClassicAddress } from 'xrpl'` を使い、
  正規表現と**両方**を必須にする。あわせて `payTo === policy.brokerAccount` を拒否する
  （自己送金は手数料を焼くだけ）。X-address（`X` 始まり）を受ける場合は明示的に変換する。
- **確認済みか**: **再現済み**。

### [MEDIUM-3] `agentName` がプロトタイプ由来の名前だと未処理例外になる

- **場所**: `src/broker/policy.js:42`, `src/broker/policy.js:61`
- **問題**: `policy.agents?.[agentName]` は `Object.prototype` のプロパティにも当たる。
  `__proto__` / `constructor` / `toString` は truthy を返すため `UNKNOWN_AGENT` で弾かれず、
  `agent.limits` が `undefined` のまま `BigInt(l.perPaymentMaxDrops)` に到達して落ちる。
- **再現/根拠**: **再現済み。**
  ```
  __proto__      -> 例外: TypeError: Cannot convert undefined to a BigInt
  constructor    -> 例外: TypeError: Cannot convert undefined to a BigInt
  toString       -> 例外: TypeError: Cannot convert undefined to a BigInt
  unknown-bot    -> {"allow":false,"code":"UNKNOWN_AGENT", ...}     ← 正しい挙動
  ```
- **影響**: 上限の突破はできない（例外で止まる＝fail-closed）。DoS と、
  「拒否されるべき入力が拒否として返らない」という判定境界の穴。
- **修正案**: `Object.prototype.hasOwnProperty.call(policy.agents, agentName)` で判定する、
  もしくはポリシー読み込み時に `agents` を `Object.create(null)` へ移す。
  加えて `limits` の各値が `decide` 内で必ず存在することを前提にせず、
  欠損時は明示的に `deny('BAD_POLICY', ...)` を返す。
- **確認済みか**: **再現済み**。

### [MEDIUM-4] Sequence を open ledger から素朴に取るため、連続する支払いが衝突する

- **場所**: `src/lib/rpc.js:91-98`, `src/broker/broker.js:83-90`
- **問題**: `autofill` は `account_info(ledger_index: 'current')` の `Sequence` をそのまま使う。
  ブローカーは**署名した blob を merchant に渡すだけで、自分では提出しない**
  （`examples/x402-client.js:42`）。提出が遅れている間に次の支払いを署名すると、
  台帳の Sequence が進んでいないため**同じ Sequence の tx が 2 本**できる。
  片方は必ず `tefPAST_SEQ` で落ちる。
- **再現/根拠**: [HIGH-1] の第 1 回実行（`Sequence` を固定した模擬）で、
  5 本すべてが `Sequence=1` になることを確認した。
  実環境でも、merchant が提出する前に 2 回目の支払いを行えば同じ状況になる。
  ただし**実ネットでの発生は未実機確認**。
- **影響**: 予算は消費済み（`broker.js:92-95` で署名時点で加算）なのに支払いは成立しない。
  失敗した分を戻す仕組みは無いので、予算が焼ける。
- **修正案**: ブローカー内部で Sequence を自前管理する（払い出した番号を記録し、
  未消化分を追跡する）。より堅いのは **Ticket（`TicketCreate` / `TicketSequence`）** の利用で、
  並行発行しても互いに干渉しない。あわせて、
  提出されなかった／失敗した支払いの予算を戻す補償処理を入れる。
- **確認済みか**: コード読解 + 模擬環境での確認。**実ネットでは未確認。**

### [MEDIUM-5] `Fee` が固定値 `'20'` で、手数料急騰時に支払いが成立しない

- **場所**: `src/lib/rpc.js:95`
- **問題**: `Fee: tx.Fee ?? '20'` は基準手数料 10 drops の 2 倍で、平時は十分だが固定値である。
  XRPL は負荷時に `open_ledger_fee` を跳ね上げる。急騰時、tx はキューにも入らず
  `telINSUF_FEE_P` で落ちる。`LastLedgerSequence` が切れれば恒久的に無効になる。
- **再現/根拠**: コード読解のみ。`server_state` / `fee` コマンドを引く箇所は
  リポジトリ全体に存在しない（`grep -rn "server_state\|'fee'" src/` で 0 件）。
- **影響**: 支払い不成立。ブローカー経路では予算だけが消費される（[MEDIUM-4] と同じ）。
  `owner.revoke`（枠の閉鎖）も落ちるため、**緊急時に枠を止められない**のが最も痛い。
- **修正案**: `fee` コマンドで `drops.open_ledger_fee` を取得し、
  その倍率（例: ×1.2、下限 10 drops、上限はポリシーで設定）を使う。
  上限を超える手数料が要求される状況では**署名せず明示的に拒否**する
  （黙って高い手数料を払わない）。手数料も日次上限に算入すべき。
- **確認済みか**: コードを読んだのみ。**未実機。**

### [MEDIUM-6] `.leash-state.json` に完全性保護が無く、上限を無効化できる

- **場所**: `src/broker/broker.js:26,43-56`
- **問題**: 日次上限の唯一の根拠は、ポリシーファイルと同じディレクトリに置かれた平文 JSON である。
  署名も権限分離も無い。`spentDrops` を `"0"` に書き戻せば日次上限は無制限になる。
  [HIGH-5] の通りブローカーはエージェントと同一プロセスで動かす構成が示されているため、
  **エージェントを乗っ取った攻撃者はこのファイルに書ける**。
  また書き込みは `fs.writeFileSync`（非原子的）で、クラッシュ時に壊れた JSON が残ると
  `#loadState` の `catch {}`（45行）が**黙って `spentDrops: '0'` に戻す**。
- **再現/根拠**: コード読解。`#loadState` の握りつぶしは
  `try { all = JSON.parse(...) } catch { /* 初回 */ }` で、
  「ファイルが無い（初回）」と「ファイルが壊れている（異常）」を区別していない。
- **影響**: 日次上限・新規支払先クォータが無効化される。
  README（3, 10-11 行目）の「上限は台帳が強制する」という主張は
  **Payment Channel 経路にしか当てはまらず、ブローカー経路には当てはまらない**。
  審査でこの差が問われる。
- **修正案**:
  - 書き込みを `tmp + rename` で原子化し、`catch` では
    「ファイルが存在しない（ENOENT）」のみ初期化、それ以外は**起動を止める**。
  - ブローカー口座の残高を実質的な上限として扱い、
    「日次上限はローカル強制（best-effort）、台帳強制ではない」ことを README に明記する。
  - 可能なら日次上限自体も台帳側に持たせる（枠の分割、期限付きチャネル等）。
- **確認済みか**: コードを読んだのみ。ファイル改竄の実演はしていない。

### [MEDIUM-7] `zod` が `package.json` の依存に宣言されていない

- **場所**: `src/mcp/server.js:21`（`import { z } from 'zod'`）/ `package.json:24-27`
- **問題**: `dependencies` は `@modelcontextprotocol/sdk` と `xrpl` の 2 つのみ。
  `zod` は MCP SDK の推移的依存として `node_modules/zod`（現状 **4.6.5**）に
  巻き上げられているだけで、宣言されていない。
- **再現/根拠**: `package.json` を読み、`node -e "require('./node_modules/zod/package.json').version"` → `4.6.5`。
  `grep zod package.json` は 0 件。
- **影響**: パッケージマネージャや SDK のバージョン次第で巻き上げが起きず、
  MCP サーバが起動しない。またバージョン制約が無いため
  zod v3/v4 の非互換（MCP SDK の `inputSchema` 解釈）を踏む。
  供給網の観点でも、宣言されていない依存は監査対象から漏れる。
- **修正案**: `dependencies` に `"zod": "^4.6.5"`（SDK が要求する範囲に合わせる）を明記する。
- **確認済みか**: 確認済み（ファイル読解と実測）。

### [MEDIUM-8] `#findBudget` がチャネル一覧の末尾を「今作った枠」とみなしている

- **場所**: `src/leash/owner.js:100-110`
- **問題**: `res.channels?.[res.channels.length - 1]` で最後の要素を取る。
  `account_channels` の並び順は保証されていない。同じ支払先に複数の枠がある場合、
  **別の（古い、あるいは別エージェント用の）チャネル ID を返しうる**。
  さらにこの呼び出しは `ledger_index` を指定していないため、
  直前の `PaymentChannelCreate` が未反映なら古い一覧を見る。
- **再現/根拠**: コード読解。`grantBudget` は作成 tx のメタデータから
  `CreatedNode` の `LedgerIndex`（＝チャネル ID）を取得できるのに、それを使っていない。
- **影響**: `bin/leash.js grant` が誤った channelId を表示し、
  人間がそれをエージェントに渡す／`revoke --channel` に使う。
  **別の枠を閉じる／存在しない枠に署名させる**。
- **修正案**: `submitAndWait` の結果から tx メタデータを取り、
  `meta.AffectedNodes` の `CreatedNode.LedgerEntryType === 'PayChannel'` の
  `LedgerIndex` をチャネル ID として返す。`ledger_index: 'validated'` を指定する。
- **確認済みか**: コードを読んだのみ。

### [MEDIUM-9] MCP の `myBudgets` が `publicKey === undefined` を「自分の枠」とみなす

- **場所**: `src/mcp/server.js:46`
- **問題**: `all.filter((b) => b.publicKey === agent.publicKey || b.publicKey === undefined)`。
  `listBudgets` は `publicKey: c.public_key_hex`（`src/leash/owner.js:76`）を入れるが、
  ノードがこのフィールドを返さない／名前が変わった場合、
  **フィルタが全通しになり、オーナーの全チャネルが「このエージェントの枠」になる**。
  fail-open である。
- **再現/根拠**: コード読解。フォールバックの意図がコメントで説明されていない。
- **影響**: 直接の資金被害は無い（別エージェントの枠に自分の鍵で署名しても台帳が拒否する）が、
  - LLM に**オーナーの全支払先と全残高が露出する**（機密性）
  - 同じ支払先に複数エージェントの枠がある場合、`find` が他人の枠を拾い、
    そのチャネルに対する累計額を計算して壊れたバウチャを出す
- **修正案**: フォールバックを削除し、`b.publicKey === agent.publicKey` の厳密一致のみにする。
  `public_key_hex` が欠けている応答は**エラーとして扱う**（fail-closed）。
- **確認済みか**: コードを読んだのみ。`account_channels` が
  `public_key_hex` を常に返すかは未確認（下記「確認できなかったこと」参照）。

---

### [LOW-1] 例外の握りつぶし

- **場所**: `src/broker/broker.js:45` / `src/lib/rpc.js:54,84` / `examples/x402-client.js:19,48` / `src/verify/05-x402.js:48` / `src/verify/04-mcp.js:33`
- **問題**: `broker.js:45` は [MEDIUM-6] の通り重大（壊れた状態ファイルを初回扱いする）。
  `rpc.js:54,84` は「まだ見つからない」以外のエラー（ネットワーク断、認証、レート制限超過）も
  同じく飲み込むため、障害が「タイムアウト」として現れて切り分けできない。
- **修正案**: エラー種別で分岐し、想定外は投げ直す。最低限デバッグログに残す。
- **確認済みか**: 全箇所を grep で列挙して確認。

### [LOW-2] `bin/leash.js new-agent` がシードを標準出力に印字する

- **場所**: `bin/leash.js:31`
- **問題**: `console.log(\`  シード (エージェントに渡す): ${w.seed}\`)`。
  用途上やむを得ないが、CI ログ・`script` 記録・ターミナルのスクロールバック・
  画面共有に平文で残る。
- **修正案**: TTY でなければ出力を拒否する、`--out <file>`（0600）に書く、
  あるいは環境変数への設定文を出さず「一度だけ表示」である旨を警告する。
- **確認済みか**: 該当行を確認。

### [LOW-3] `LEASH_OWNER_SEED` を環境変数で渡す運用

- **場所**: `bin/leash.js:7,18` / README 132-134 行
- **問題**: 環境変数はシェル履歴（`LEASH_OWNER_SEED=s... node ...` の形）、
  同一 uid のプロセスから読める `/proc/<pid>/environ`、子プロセスへの継承に露出する。
  `src/mcp/server.js` は環境全体を継承するため、同じシェルで両方を設定していると
  **LLM が駆動するプロセスの環境にオーナーのシードが乗る**（サーバ自身は読まないが、
  依存パッケージや他の MCP ツールから到達しうる）。
- **修正案**: README の例を `read -s` / 0600 のファイル / OS のキーチェーン経由に改める。
  `bin/leash.js` と MCP サーバは別のシェルで動かすことを明記する。
- **確認済みか**: コードと README を読んだのみ。実際の漏洩経路は未実証。

### [LOW-4] `Number` による drops 演算の精度限界

- **場所**: `src/leash/owner.js:72-81`
- **問題**: `Number(c.amount)` / `Number(c.balance)` は drops を `Number` に入れる。
  安全なのは `Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991` drops
  ＝ **約 9,007,199,254 XRP** まで。XRP の総供給量（1000 億 XRP = 1e17 drops）は
  これを超えるため、理論上は精度が壊れる。単一チャネルで 90 億 XRP は非現実的なので low。
  ただし `usedPercent`（81行）の丸めは常に浮動小数。
- **修正案**: drops は一貫して `BigInt` で扱う（[MEDIUM-1] の修正と同じ方向）。
- **確認済みか**: `dropsToXrp` が **number を返す**（xrpl 5.3.0 で実測）ことを確認済み。
  閾値は計算による。

### [LOW-5] `.gitignore` に状態ファイル・実ポリシーが入っていない

- **場所**: `.gitignore`
- **問題**: `.env` / `*.seed` / `*.key` / `secrets/` はあるが、
  `.leash-state.json` と `leash.policy.json`（例ファイルではない実運用のもの）が無い。
  状態ファイルは支払先アドレスと支出履歴を含む。
- **修正案**: `.leash-state.json` と `leash.policy.json` を追加する
  （`leash.policy.example.json` は `!` で除外しない）。
- **確認済みか**: `.gitignore` を確認。**コミット履歴にこれらのファイルは存在しない**ことも確認済み。

### [LOW-6] CLI の引数パーサが値を取り違える

- **場所**: `bin/leash.js:13-15`
- **問題**: `arr[i + 1]?.startsWith('--') ? true : arr[i + 1]` のため、
  `--expires --payee rX` のように値が抜けると `expires = true` → `Number(true) = 1` となり、
  **1 秒後に取り消せる枠**が作られる。値の型検証も無い。
- **修正案**: 値が `--` で始まる／欠けている場合はエラーで止める。
  `cap` `expires` は数値であることを検証する。
- **確認済みか**: コードを読み、パーサの挙動を確認。

### [LOW-7] x402 merchant が内部エラーメッセージをそのまま返す

- **場所**: `examples/x402-server.js:71`
- **問題**: `JSON.stringify({ error: e.message })`。`submitAndWait` 由来の
  RPC エラー文字列（エンドポイント名、内部状態）がクライアントに漏れる。
- **修正案**: クライアントには一般化したメッセージを返し、詳細はサーバ側ログにのみ出す。
- **確認済みか**: 該当行を確認。

### [LOW-8] `state.payees` が欠けていると `decide` が落ちる

- **場所**: `src/broker/policy.js:70,75`
- **問題**: `state.spentDrops` は `?? '0'`（65行）で防御されているが、
  `state.payees.includes(payTo)` は無防備。
- **再現/根拠**: **再現済み。** `state: { spentDrops: '0' }` を渡すと
  `Cannot read properties of undefined (reading 'includes')`。
- **修正案**: `(state.payees ?? [])` にする。
- **確認済みか**: **再現済み**。

### [LOW-9] `amountDrops` の型混乱（配列・数値が通る）

- **場所**: `src/broker/policy.js:48`
- **問題**: `/^\d+$/.test(String(amountDrops))` は `String()` を挟むため、
  `["100"]`（配列）や `100`（数値）も通る。
- **再現/根拠**: **再現済み。** `["1"]` と `1`（number）は `BAD_AMOUNT` にならず通過した。
  後段の `broker.js:87` も `String(amountDrops)` を使うため値は一致し、実害は無い。
  ただし `String()` を 2 回呼ぶ設計は、`toString` を持つオブジェクトを渡された場合に
  **判定時と署名時で違う値になりうる**（現状の JSON 経由入力では発生しない）。
- **修正案**: `typeof amountDrops !== 'string'` を即座に拒否し、以後は同じ文字列を使い回す。
- **確認済みか**: **再現済み**。

### [LOW-10] 集計の日付が UTC 固定で、前日分を削除している

- **場所**: `src/broker/broker.js:41,53-54`
- **問題**: `new Date().toISOString().slice(0, 10)` は UTC。
  日本時間で運用すると **朝 9 時に日次上限がリセット**される。
  また `if (!k.endsWith(today)) delete all[k]` で前日以前を消すため、
  **監査証跡が残らない**（資金を扱うツールとして問題）。
- **修正案**: タイムゾーンをポリシーで設定可能にする。
  過去分は削除せず、追記専用の監査ログ（支払い 1 件ごとに payTo / amount / verdict / txHash）を分離して残す。
- **確認済みか**: コードを読んだのみ。

### [LOW-11] テストがリポジトリに入っていない

- **場所**: `package.json:9` / 作業ツリーの `test/`（**未コミット**）
- **問題**: 公開されている `7514fa8` の時点では `npm test` は
  `echo "Error: no test specified" && exit 1`。
  作業ツリーには `test/leash.test.js` と `test/policy.test.js` があるが
  `git status` では untracked で、**公開リポジトリには存在しない**。
  資金を扱うコードの審査で、テストが無いのは致命的な印象を与える。
- **修正案**: テストをコミットする。少なくとも
  [HIGH-1]（並行要求）・[HIGH-3]（未換金バウチャ）・[MEDIUM-1]（浮動小数）の
  回帰テストを含める。
- **確認済みか**: `git status --porcelain` と `git diff package.json` で確認。

### [LOW-12] 検証スクリプトが `/tmp` の固定パスを使う

- **場所**: `src/verify/05-x402.js:18-19`
- **問題**: `/tmp/leash-demo-policy.json` / `/tmp/leash-demo-state.json`。
  共有ホストでは他ユーザが事前に作成／シンボリックリンクを張れる。
  ブローカーはこのポリシーを読んで動く。
- **修正案**: `fs.mkdtempSync(path.join(os.tmpdir(), 'leash-'))` を使う。
- **確認済みか**: 該当行を確認。

---

## 問題なしと確認した項目

- **コミット履歴に鍵は含まれていない。**
  `git log -p --all` 全体に対し以下を実行し、いずれも該当なしを確認した:
  - `\bs[1-9A-HJ-NP-Za-km-z]{27,29}\b`（XRPL シード形式）→ **0 件**
  - `sEd` / `snoPBr` / `privateKey = '...'` / `LEASH_*_SEED=<実値>` → 該当は
    README と docstring の `LEASH_OWNER_SEED=s...`（プレースホルダ）のみ
  - `\b(00)?[0-9A-F]{64}\b` → 6 件ヒットしたが、**全て testnet のトランザクションハッシュ**
    （`docs/logs/`・`demo/explainer.html` の検証記録）であることを個別に確認した
- **`.gitignore`** は `.env` `.env.*` `*.seed` `*.key` `secrets/` `node_modules/` を含み、
  鍵ファイルの誤コミットに対する基本的な防御はある（不足は [LOW-5]）
- **`Wallet.fromSeed` の例外メッセージにシードは含まれない。**
  実測: 不正な文字 → `Unknown letter "_". Allowed: rpsh...`、
  チェックサム不一致 → `checksum_invalid`。いずれもシード値を出さない
- **`bin/leash.js:100` のエラーハンドラは `e.message` のみ出力**し、
  スタックトレースやウォレットオブジェクトを出さない
- **MCP サーバからオーナーの鍵に到達する経路は無い。**
  `src/mcp/server.js:39` の `view` は `sign: () => { throw ... }` を持つダミーで、
  登録されている 3 ツール（`list_budgets` / `authorize_payment` / `budget_status`）は
  いずれも `listBudgets()`（公開情報の読み取りのみ）しか呼ばない。
  `grantBudget` / `revoke` は MCP から呼び出せない。
  返却する voucher は `{channelId, cumulativeXrp, signature, publicKey}` のみで秘密鍵を含まない
- **`src/broker/policy.js` は自然言語を解釈しない。**
  LLM 呼び出し・ネットワーク I/O・`eval` / `Function` / 動的 import は 1 つも無い。
  外部文字列は `payTo`（正規表現）と `amountDrops`（正規表現）としてしか判定に触れず、
  `reason` メッセージに埋め込まれるだけの `agentName` は判定ロジックに影響しない。
  **信頼境界の設計そのものは妥当**（実装の穴は [MEDIUM-2][MEDIUM-3]）
- **`amountDrops` の異常入力は正しく拒否される。** 実測（全て `BAD_AMOUNT`）:
  ```
  0.5 / " 1"（前置空白）/ "1\n"（後置改行）/ "١"（Unicode 数字）/ 1e+21（指数表記）
  / "0x1" / true / null / 負数
  ```
  `/^\d+$/` は `u` フラグ無しのため ASCII 数字のみ一致し、
  JS の `$` は行末ではなく文字列末尾に一致するため、末尾改行によるすり抜けも無い。**ここは堅い**
- **`LastLedgerSequence` は設定されている。** `src/lib/rpc.js:97` で
  `ledger_current_index + 40`。未設定で tx が無期限に有効になる問題は無い
  （ただし `submitAndWait` の待ち時間 100 秒との不整合は [HIGH-4] で指摘）
- **`payee.redeem` の `Balance` と `Amount` の関係は正しい。**
  Payment Channel の累計方式に沿って両方に累計額を入れている
- **`npm audit --omit=dev`: 0 vulnerabilities**（node_modules 102 パッケージ、
  `@modelcontextprotocol/sdk` 1.30 系 / `xrpl` 5.3.0）
- **`policy.js` の判定順序は妥当**: denyList → 1 回上限 → 日次上限 → 未知の支払先、の順で、
  金額が範囲外なら支払先の事情に関わらず拒否される

---

## 確認できなかったこと

- **[要確認] voucher のリプレイ（同じ伝票の二度換金）**。
  XRPL の `PaymentChannelClaim` は `Balance` がチャネルの現在残高を上回らない限り
  失敗する仕様であり、同一 voucher の再提出は成立しないはずだが、
  **testnet で実際に二度提出して確認していない**。
  なお `PaymentChannelClaim` は Destination 以外の第三者も提出でき、
  その場合も資金は Destination へ行くため、voucher の窃取による横取りは成立しない
  ——これも仕様知識であり実機未確認。**回帰テストとして追加すべき。**
- **[要確認] `account_channels` が `public_key_hex` を常に返すか**。
  [MEDIUM-9] のフォールバックが実際に発火する条件を実機で確認していない。
- **[要確認] 手数料急騰時の実挙動**（[MEDIUM-5]）。
  testnet では再現できないため、`Fee: '20'` が `telINSUF_FEE_P` になる閾値を実測していない。
- **[要確認] 実ネットでの Sequence 衝突**（[MEDIUM-4]）。
  模擬環境でしか確認していない。
- **[要確認] `.leash-state.json` の改竄による上限無効化**（[MEDIUM-6]）。
  コード上明らかだが、実演していない。
- **レビュー対象外**: `src/verify/*`（検証スクリプト）と `demo/` は
  指定範囲外のため精査していない。ただし `src/verify/05-x402.js` で目に付いた点は [LOW-12] に記載した。
- **XRPL への実接続は行っていない。** すべての再現は
  `globalThis.fetch` をスタブ化したローカル環境で行った。
  再現に用いたスクリプトは一時ディレクトリに置いており、リポジトリにはコミットしていない。

---

## 総評

設計の方向（上限と支払先を台帳に置く、ポリシー判定を純粋関数に隔離して
プロンプトインジェクションの入り口を構造的に排除する）は妥当であり、
`policy.js` の入力検証は金額に関しては堅い。

一方で、**「台帳が強制する」という主張が及ぶ範囲は Payment Channel 経路だけ**であり、
最新コミットで追加されたブローカー経路の日次上限は
並行要求で 5 倍まで突破できる（[HIGH-1]、再現済み）。
さらに参照実装はブローカーの署名鍵をエージェントと同一プロセスに置き、
`JSON.stringify` 一発で流出する状態にある（[HIGH-5]、再現済み）。
x402 の merchant 例は支払いを実質的に検証しておらず（[HIGH-2]、再現済み）、
MCP の累計額計算は支払先の資金を失わせる（[HIGH-3]、再現済み）。

**現状のまま資金を扱う用途に出すべきではない。**
公開済みかつ審査対象である以上、少なくとも high 5 件の修正と、
その回帰テストのコミット（[LOW-11]）を先に行う必要がある。


---

# 【2026-09-18 追記】修正の記録

対象コミット（レビュー時）: `7514fa8`

## HIGH — 5件すべて修正・再検証済み

| # | 内容 | 対応 |
|---|---|---|
| 1 | 日次上限が並行要求で突破可能 | エージェント単位の排他制御＋署名前に枠を確保。**再現テストで 5/5 → 1/5 に** |
| 2 | merchant が `signedTxBlob` を検証せず | tx をデコードし種別・宛先・金額を merchant 自身が検証 |
| 3 | MCP が未換金バウチャを上書き | 発行済み累計額を保持し、台帳の値との大きい方を基準に |
| 4 | 未確定の `tesSUCCESS` を完了扱い | `UNVALIDATED` を返し、受領判定に `validated === true` を要求 |
| 5 | シードが `JSON.stringify` で露出 | `wallet` を列挙不可にし `toJSON()` を実装。**露出しないことを確認** |

## MEDIUM — 9件

| # | 内容 | 対応 |
|---|---|---|
| 1 | 浮動小数で累計 XRP を計算 | drops を `BigInt` で扱うよう変更（`owner.js`） |
| 2 | アドレスのチェックサム未検証 | `isValidClassicAddress` で検証。**テストの固定値2件が実際に無効だったことが判明** |
| 3 | プロトタイプ由来の名前で未処理例外 | `Object.hasOwn` で確認。`BAD_POLICY` として拒否を返す |
| 4 | Sequence を素朴に取り連続署名が衝突 | ブローカーが自前で採番。失敗時は巻き戻す |
| 5 | `Fee` が固定値 `'20'` | `fee` から取得し 1.2 倍、上限 10000 drops でクランプ |
| 6 | 状態ファイルに完全性保護が無い | `mode 0o600`。**完全性は保証できないため、被害上限はブローカー口座の残高であることを明記** |
| 7 | `zod` が依存に未宣言 | `package.json` に追加 |
| 8 | 作成した枠を一覧の末尾で特定 | 署名鍵で絞り込む |
| 9 | `publicKey === undefined` を自分の枠とみなす | 自分の鍵の枠だけを対象に |

## LOW — 11件

対応済み: 例外の握りつぶし（状態ファイル破損時は中止するよう変更）、
シードの標準出力（`--out` でファイル出力・警告表示）、
`Number` による drops 演算、`.gitignore`（実ポリシー・状態ファイル）、
CLI の引数パーサ、merchant の内部エラー露出、`state.payees` 欠落時の防御、
`amountDrops` の型混乱（文字列のみ受理）、テストの未コミット。

未対応（設計上の判断）:
- **LOW-3** `LEASH_OWNER_SEED` を環境変数で渡す運用。
  代替手段（ファイル・鍵管理サービス）を用意するまでは README で注意喚起にとどめる
- **LOW-10** 集計の日付が UTC 固定。
  現状は仕様として明記する方針。タイムゾーン設定は今後

## 現在の状態

- `npm test` **87/87 合格**
- `src/verify/01-channel-cap.js` — 上限超過が `tecUNFUNDED_PAYMENT` で拒否されることを再確認
- `src/verify/05-x402.js` — x402 の通し動作を再確認

## 残る制約（設計上、消せないもの）

**ブローカーを完全に掌握された場合、ブローカー口座の残高までは失われる。**
ポリシーファイルも状態ファイルも、その機械の上にある以上、書き換えられる。

これは第2段（ブローカー）の構造的な限界であり、実装で消せるものではない。
消えるのは第1段（Payment Channel）に載せられた場合のみ。
→ だからこそ x402 への Payment Channel 方式の提案（`docs/90-...`）が本丸である。

**運用上の対策**: ブローカー口座には必要な分だけを入れる。
本口座の鍵はブローカーに渡さない。
