# XLS-75（Permission Delegation）の調査 — 使えるか、組み込めるか

調査日: 2026-09-21
読む人: 技術レビューをしてくれる方
関連: ADR [0001](../docs/adr/0001-上限を台帳に置く.md) / [0007](../docs/adr/0007-ダッシュボードに鍵を持たせない.md)

---

## 要約

1. **XLS-75 で支出上限は作れない。** 許可証（`Delegate` オブジェクト）に金額の欄が存在しない
2. **むしろ、このプロジェクトが存在する理由の証拠になる。** Ripple は「権限を渡す仕組み」を Final にしたが「渡した権限を縛る仕組み」は出していない。仕様書自身が危険性を明記している
3. **組み込める余地はあるが、期待したほどではない。** 当初「鍵なしの停止スイッチ」に使えると考えたが、**仕様を確認したら効かなかった**。理由は下記 §4.2

---

## 1. XLS-75 とは

| | |
|---|---|
| 正式名 | Permission Delegation |
| ステータス | **Final** |
| Amendment 名 | `PermissionDelegationV1_1`（旧 `PermissionDelegation` は Obsolete） |
| 著者 | Mayukha Vadari / Yinyi Qian / Ed Hennis（いずれも Ripple） |
| 作成 | 2024-08-21 |
| **有効化** | **2026-09-21 11:18:40 UTC に過半数到達。支持が維持されれば最速 2026-10-05 11:18:40 UTC**（メインネット2ノードの `feature` RPC で確認。2026-09-23） |

つまり**まだメインネットで使えない。支持が維持されれば来月から使えるようになる。**

やることは「自分の口座の操作を、鍵を渡さずに別の口座へ代行させる」。
`Delegate` 台帳オブジェクトと `DelegateSet` トランザクションを追加する。

---

## 2. 上限には使えない — 根拠

### 2.1. `Delegate` オブジェクトにフィールドが無い

仕様書 §2.1 のフィールド一覧が**これで全部**:

| フィールド | 内容 |
|---|---|
| `Account` | 委譲する側 |
| `Authorize` | 委譲される側 |
| `Permissions` | 許可する権限の配列（**最大10**） |
| `OwnerNode` / `PreviousTxnID` / `PreviousTxnLgrSeq` / `LedgerIndex` / `LedgerEntryType` | 台帳の管理用 |

**金額の欄が無い。支払先の欄も無い。期限の欄も無い。**
「書かれていない」のではなく、**置く場所が構造として存在しない。**

### 2.2. `Permissions` に入るもの

XLS-74 が定める名前空間:

- `0` — 全権限
- `1`〜`65536` — **取引種別そのもの**（`1 + TxType`）
- `65537`〜 — **ハードコードされた granular permission**

granular permission は現在12個。全部が「トラストライン」「AccountSet の各欄」「発行体としての送金」「MPT のロック」に関するもので、
**金額を縛るものは1つも無い。**

### 2.3. 仕様書自身の記述（原文）

XLS-74 §4.4.1:

> "The set of permissions **must be hard-coded. No custom configurations are allowed.**
> For example, we cannot add permissions based on specific currencies — the best you could
> theoretically do on that front is XRP vs. issued currency."

XLS-74 セキュリティ節:

> "Giving permissions to other parties requires a **high degree of trust**, especially when
> the delegated account can potentially **access funds** (the `Payment` permission)."

**`Payment` 権限の委譲は、金額・宛先ともに無制限。仕様書がそう警告している。**

### 2.4. 結論

ADR 0001 で `DelegateSet` を却下した判断は変わらない。
ただし**根拠が「公式ドキュメントの記述」から「仕様書のフィールド一覧」に上がった。**
欄が無いのだから、実装や運用でどうにかなる話ではない。

---

## 3. 委譲できる取引種別の確認

非委譲リスト（27件）を確認した:

```
AccountDelete, AccountSet, Batch, ConfidentialMPTConvert, DelegateSet,
EnableAmendment, LedgerStateFix, LoanBrokerCoverClawback, LoanBrokerCoverDeposit,
LoanBrokerCoverWithdraw, LoanBrokerDelete, LoanBrokerSet, LoanDelete, LoanManage,
LoanPay, LoanSet, SetFee, SetRegularKey, SignerListSet, SponsorshipTransfer,
VaultClawback, VaultCreate, VaultDelete, VaultDeposit, VaultSet, VaultWithdraw,
UNLModify
```

**`PaymentChannelCreate` / `PaymentChannelFund` / `PaymentChannelClaim` は3つとも入っていない = 委譲できる。**

---

## 4. 組み込める可能性の検討

### 4.1. `PaymentChannelFund` の委譲 — 補充の自動化（有望）

`PaymentChannelFund` には構造的な縛りがある:

- **既存のチャネルにしか効かない**（新規作成はできない）
- チャネルの `Destination` は**変更する取引型が存在しない**（ADR 0002）

したがって **`PaymentChannelFund` だけを持つ委譲先は、持ち主が既に承認した支払先にしか資金を動かせない。**

| | |
|---|---|
| 宛先 | **持ち主が固定済み。委譲先は変えられない** |
| 金額 | **縛れない。** 承認済みの支払先へ過剰に補充できる |
| 新規の支払先 | **作れない**（`PaymentChannelCreate` を渡さなければ） |

**用途:** 枠の補充を、口座の鍵をオンラインに置かずに回せる。
**被害の上限:** 委譲先が乗っ取られると、口座の残高を「承認済みの支払先へのチャネル」に移せる。
ただしそこから先に出すには**チャネルの署名鍵**が要るので、資金が攻撃者に渡るわけではない。
実質的には**資金拘束の DoS**。

### 4.2. `PaymentChannelClaim` の委譲 — 停止スイッチ（**当初の見込みは誤り**）

ADR 0007 で「枠を閉じるには口座の鍵が要るので、ダッシュボードに持たせない」と決めた。
XLS-75 なら鍵なしで閉じられるのでは、と考えた。

**仕様を確認したら、停止スイッチとしては機能しない。**

`PaymentChannelClaim` の `tfClose` は、**誰が出したかで挙動が違う**:

| 送信者 | 挙動 |
|---|---|
| **送金元**（＝持ち主・委譲先） | "This **schedules** the channel to close after `SettleDelay` seconds have passed" |
| 受取人 | "This flag closes the channel **immediately**" |
| どちらでも、残高が 0 になる場合 | 即時に閉じる |

**委譲先は送金元として振る舞うので、閉じるのは `SettleDelay` 秒後。**
本実装の既定値は 3600 秒。

**つまり「止めた」あとも最大1時間、エージェントは上限までクレームできる。**
これは停止スイッチとは呼べない。

`SettleDelay` を小さくすれば速くなるが、それは**受取人が正当なクレームを換金する猶予**でもあるため、短くすると別の問題が出る。

**得られた結論:**
> **守っているのは「閉じられること」ではなく「上限そのもの」である。**
> 閉じる操作は事後処理であって、防御ではない。
> ADR 0007 の判断（revoke を CLI に残す）は、結果的に正しかった。

### 4.3. 却下した使い方

| 案 | 却下の理由 |
|---|---|
| `Payment` を委譲してエージェントに払わせる | **金額も宛先も無制限。** 解こうとしている問題そのもの |
| `PaymentChannelCreate` を委譲する | 委譲先が任意の宛先・任意の金額でチャネルを作れる。`Destination` を自分にして署名鍵も自分のものにすれば、**実質的に残高を持ち出せる** |
| granular permission で金額を縛る | **存在しない。** しかも「ハードコードのみ、独自設定は不可」と明記されている |

---

## 5. 未確認のこと

- **[要確認]** testnet で `PermissionDelegationV1_1` が既に有効か。メインネットは最速 10-05
- **[解決]** 手数料は**委譲先**が払う（XLS-75 L185: "The delegate will pay the fees on the transaction, to prevent a delegate from draining an account's XRP via fees. Only the `Account`'s sequence number is incremented"）。`Delegate` オブジェクトの reserve は `Account` 持ち（§3.4）
- **[要確認]** 委譲先が出した `PaymentChannelFund` の `Expiration` 変更可否。仕様上は送金元として振る舞うので変えられるはずだが未検証
- **[要確認]** `PermissionDelegation`（旧版）で見つかった「critical bug」の内容。V1_1 で何が直ったのか一次ソースを読めていない

---

## 6. 相談したいこと

### Q1. 補充の委譲（§4.1）は入れる価値があるか

「宛先は固定・金額は無制限」という中途半端な縛りを、運用上の利便のために入れるべきか。
**個人的には入れない方に傾いている**（攻撃面が増えるわりに、守れるものが増えない）が、
実運用の感覚が無いので判断がつかない。

### Q2. `SettleDelay` の既定値 3600 秒は妥当か

§4.2 の通り、これが「閉じるまでの遅延」と「受取人の換金猶予」を兼ねている。
短くすると即応性は上がるが受取人が困る。実務的にどのあたりが妥当か。

### Q3. granular permission を XLS として提案する価値はあるか

XLS-74 §4.4 は「granular permission は今後も追加しうる」と明記しており、
`SponsorFee` / `SponsorReserve` を追加候補の例として挙げている。

つまり **「金額上限つきの `Payment` 権限」を新しい granular permission として提案する道が、
制度としては開いている。**

ただし §4.4.1 の「ハードコードのみ、通貨ごとの設定は不可」という制約と
正面からぶつかる（金額上限は本質的にパラメータを要するため）。

**この制約を満たす形で書けるのか、そもそも筋が悪いのか**、意見が聞きたい。
筋が通るなら、Payment Channel で埋めている穴を**標準側に持っていく**道になる。

### Q4. そもそも委譲を一切使わない、で良いか

現状（口座の鍵は人間の手元、エージェントはチャネルの署名鍵のみ）を変えない選択。
**§4.2 の結論からすると、これが一番素直に見える。**
見落としがあれば指摘してほしい。

---

## 7. この調査から出た、プロジェクト上の意味

事実を並べるとこうなる:

> Ripple は「支払いの権限を委譲する仕組み」を Final にし、**支持が維持されれば最速 2026-10-05 に本番で有効化される。**
> しかし「委譲した権限を金額で縛る仕組み」は用意していない。
> **仕様書自身が "can potentially access funds" と警告している。**

これは想定の話ではなく、**日付の入った具体的な欠落**である。

---

## 出典

| 内容 | URL | 種別 |
|---|---|---|
| XLS-75 仕様（`Delegate` のフィールド一覧・失敗条件・JSON 例） | https://github.com/XRPLF/XRPL-Standards/blob/master/XLS-0075-permission-delegation/README.md | **一次** |
| XLS-74 仕様（権限の名前空間・granular 12個・§4.4.1 の制約・セキュリティ節） | https://github.com/XRPLF/XRPL-Standards/blob/master/XLS-0074-account-permissions/README.md | **一次** |
| 非委譲リスト27件・granular permission 一覧 | https://xrpl.org/docs/references/protocol/data-types/permission-values | 一次 |
| `DelegateSet` の仕様 | https://xrpl.org/docs/references/protocol/transactions/types/delegateset | 一次 |
| `tfClose` の挙動（送金元は `SettleDelay` 後・受取人は即時） | https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelclaim | **一次** |
| XLS 一覧とステータス | https://xls.xrpl.org/ | 一次 |
| `PermissionDelegationV1_1` の活性化状況（過半数到達 2026-09-21 11:18:40 UTC → 最速 10-05） | メインネット `feature` RPC（xrplcluster.com / xrpl.ws、`majority` = 843304720） | **一次（台帳そのもの）** |
