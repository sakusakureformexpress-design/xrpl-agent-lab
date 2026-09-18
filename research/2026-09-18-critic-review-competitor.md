# Critic レビュー: 競合検証（xrpl-referee）の再検証

検証日: 2026-09-18
対象: `research/2026-09-18-competitor-xrpl-referee.md`

## verdict

```json
{
  "verdict": "PASS",
  "blocking": [],
  "note": "結論を支える3つの主張すべてを Critic が独立に再現した"
}
```

Builder の報告は file:line 付きで検証可能な形になっていた。
**Critic が `referee.py`（7,306行・343KB）を直接取得し、独立に grep して3件すべて再現。**

取得元: `https://raw.githubusercontent.com/eamwhite1/xrpl-referee/main/referee.py`

---

## 再現1: 支払先の許可リストは存在しない ✅ 確認

```
grep -niE 'allowlist|allow_list|whitelist|white_list|allowed_destination|
           permitted_dest|PermissionedDomain|DepositPreauth|CredentialCreate|
           XLS-?80|XLS-?70' referee.py
→ ヒット 0 件
```

**XLS-80 Permissioned Domains、XLS-70 Credentials、DepositPreauth のいずれも未使用。**
支払先を制限する仕組みは実装されていない。

## 再現2: Payment Channel は完全未使用 ✅ 確認

```
grep -niE 'PaymentChannel|paychan|channel_claim' referee.py
→ ヒット 0 件
```

Escrow と通常 Payment のみ。**台帳による上限強制の原語を使っていない。**

## 再現3: 金額検証は下限のみ ✅ 確認

`referee.py` 内の金額バリデーションで raise しているのは以下がすべて:

| 行 | 内容 | 種別 |
|---|---|---|
| 1843 / 1847 / 1855 | `amount_mismatch` | 支払額の一致確認（上限ではない） |
| 2293 | RLUSD 額のパース失敗 | パースエラー |
| **4307** | **`amount_xrp must be ≥ MIN_ESCROW_XRP (1 drop — XRPL minimum)`** | **下限のみ** |
| 4314 | `amount_rlusd required` | 必須チェック |

**上限（maximum / exceed）を理由に raise する箇所は存在しない。**

さらに `grep -n 'escrow_cap' referee.py` は **ヒット0**。
Builder の報告どおり、`escrow_cap_xrp` は助言ツール（`mcp_server.py` 側）にのみ存在し、
実際の決済経路である `referee.py` には到達していない。

→ **エージェントが助言を無視すれば、上限は素通りする。**

---

## 競合の実体（Builder 報告、Critic が矛盾を発見せず）

過小評価は禁物である。以下は本物:

| 項目 | 実測 |
|---|---|
| コミット | 383（最終更新 2026-09-15、単日11コミット） |
| 稼働 | MCP / REST / playground / health すべて 200 |
| MCP ツール | 実測 **40**（README の36は古い） |
| **XRPL メインネット実 tx** | **全82件**（2026-02-12〜09-12）<br>EscrowCreate 5 / EscrowFinish 5 / EscrowCancel 5 / Payment 61 |
| ライセンス | MIT |

---

## 結論: 差別化余地は確定した

両者は**質的に異なるモデル**である。

| | xrpl-referee | 我々 |
|---|---|---|
| 制御のタイミング | **事後**（払った後、レフェリーが解放鍵を出すか判定） | **事前**（そもそも送れない） |
| 強制主体 | **中央サービス**（AI審判＋$0.10の手数料） | **台帳**（XRPL が拒否） |
| 支払先 | 制限なし（信用スコアで助言） | 許可リスト外は不可 |
| 上限 | 助言のみ（素通り可能） | Payment Channel の `Amount` |
| 使用する原語 | Escrow + Payment | Payment Channel + XLS-80 + XLS-70 |

**「レフェリーを信頼する」モデルと「誰も信頼しなくてよい」モデルの違い。**
これは T54（クローズド商用）との差別化軸「台帳が強制する」とも一致する。

---

## リスク（Builder 指摘、Critic も同意）

**先方の開発速度が非常に速い。** 2026-09-15 単日で11コミット（AI支援開発と推測）。
Payment Channel や XLS-80 を後から実装される可能性は実在する。**推測。**

→ 対策: 速度で競わない。**「台帳が強制する」という設計思想を先に文書化して公開し、
   実装より先に旗を立てる。** OSS であることと合わせ、後発が真似ても
   「後から追随した」構図になる。

## 未検証（副作用のある操作を禁止したため）

- [要確認] AI監査の妥当性、エスクロー解放の完走（POST 未実行）
- [要確認] MCP ツールの実挙動（`tools/list` のみ、`tools/call` 未実行）

## 副次的発見

- README の `/wallet/{address}/trust-score` は **404**（実パスは `/wallet/score/{address}`）
- openapi.json は「11 signals」、README と実応答は 12（内部不整合）
- `/marketplace/skills` は `is_demo:true` のダミー
- **RLUSD エスクローは発行体が `lsfAllowTrustLineLocking` 未設定のため 503 で利用不可**
  （先方自身が明記）← RLUSD を扱う設計をするなら我々も同じ制約を受ける。要注意
