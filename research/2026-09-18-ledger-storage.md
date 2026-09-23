# XRPL で「ルールを台帳に守らせられる」のはどこまでか

調査日: 2026-09-18
きっかけ: 「メモ機能でブローカーの代わりにならないか」という問い

## 結論

**「書き換えられない」と「守らせる」は別の話だった。**

XRPL で**金額の上限を台帳に強制できるのは Payment Channel と Escrow の2つだけ**。
それ以外のデータ保存機能は、置けるが台帳が読まない。

そして決定的なことに、**XRPL 公式の権限委譲では金額上限を付けられない。**

## 1. データ保存機能の分類

### A. 絶対に書き換えられない — 確定した取引の履歴

Memo（`MemoData` / `MemoType` / `MemoFormat`、1KB上限、16進）もここに含まれる。

**ただし台帳は内容を読まない。**
> 仕様書には、メモの内容に基づく合意形成レベルの検証・解釈・強制の記述が無い。
> メモは「任意のメッセージデータ」であり、合意に影響しない純粋なメタデータ。
> — https://xrpl.org/docs/references/protocol/transactions/common-fields

→ **記録としては最強。強制力はゼロ。**

### B. 台帳に置けるが、持ち主が書き換えられる

testnet の `server_definitions` で実在を確認した取引種別:

| 機能 | 書き換え手段 |
|---|---|
| `DID` | `DIDSet` で上書き、`DIDDelete` で削除 |
| `NFToken` の URI | **`NFTokenModify` が実在する** |
| `MPTokenIssuance` | `MPTokenIssuanceSet` |
| `AccountRoot.Domain` | `AccountSet` |
| `Credential` | 発行者が失効可・期限あり |
| `PermissionedDomain` | `PermissionedDomainSet` |

→ **どれも台帳が中身を読んで判断することはない。**

### C. 台帳の検証ルールが実際に読むフィールド ← これだけが本物

- `PayChannel`: **`Amount`** / **`Destination`** / `PublicKey` / `SettleDelay` / `CancelAfter`
- `Escrow`: `Amount` / `Destination` / `FinishAfter` / `CancelAfter` / `Condition`
- `AccountRoot` のフラグ（DepositAuth 等）、`DepositPreauth`
- `SignerList`（マルチシグの閾値）
- `RippleState` のフラグ・上限
- `PermissionedDomain`（ただし許可型DEX・レンディングに限る）

## 2. Hooks は XRPL に存在しない

`server_definitions` に **`SetHook` が無い**ことを確認した（testnet, rippled 3.3.0）。
Hooks は Xahau の機能であり、XRPL 本体には無い。

→ **任意のルールを台帳上で実行させる道は存在しない。**

## 3. 公式の権限委譲では金額上限を付けられない（重要）

`Delegate` という台帳オブジェクトは実在する（`DelegateSet`）。
だが公式ドキュメントに明記されている:

> "The set of granular permissions is **hard-coded and cannot be customized**.
> For example, you cannot grant permission to send only certain currencies and not others."
> — https://xrpl.org/docs/concepts/accounts/permission-delegation

**通貨の限定すらできない。金額の上限は当然できない。**
（委譲は1つあたり最大10権限、委譲先は資金のある口座である必要がある）

### これが本プロジェクトの存在理由

> **XRPL 自身の権限委譲は「送金してよい」は言えるが「いくらまで」は言えない。**

x402 の公式スキームが `Delegate` を明示的に拒否している
（`scheme_exact_xrpl.md:450`）のとも整合する。

## 4. では、ポリシーをどう扱うか

台帳に置いても守ってはもらえない。しかし**改ざん検知には使える。**

```
ポリシーファイルの SHA-256 を、支払いのメモに載せる
→「この支払いの時点で有効だったポリシーはこれ」が改ざん不能な形で残る
```

- 事故時に「当時のルール」を証明できる
- ポリシーをこっそり緩めて後で戻す、が履歴に残る
- 監査で期間中の一貫性を示せる

**防止(prevention)はできないが、検知(detection)はできる。**
これは実装する（`src/leash/memo.js`）。

## まとめ

| やりたいこと | 可否 |
|---|---|
| 金額上限を台帳に強制 | ✅ **Payment Channel / Escrow のみ** |
| 支払先を台帳に固定 | ✅ 同上 |
| 任意のルールを台帳で実行 | ❌ Hooks が無い |
| 公式の権限委譲に上限を付ける | ❌ **仕様上できない** |
| ルールを書き換え不能に保存 | ❌ 置けるが誰も読まない |
| **ルールの改ざんを検知可能に** | ✅ **ハッシュをメモに刻む** |
