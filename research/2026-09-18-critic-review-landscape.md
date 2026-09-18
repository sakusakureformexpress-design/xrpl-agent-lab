# Critic レビュー: landscape 調査の検証結果

検証日: 2026-09-18
対象: `research/2026-09-18-landscape.md`

## verdict

```json
{
  "verdict": "PASS_WITH_CORRECTIONS",
  "blocking": [],
  "corrections": [
    { "item": "xrpl-referee の規模を過小評価", "severity": "medium" },
    { "item": "空白1 の新規性を過大評価", "severity": "medium" }
  ]
}
```

出典URLは実在し、検索の網羅性も十分。ただし**結論を支える2件の主張を直接検証した結果、
評価の修正が必要**と判断する。

---

## 修正1: `eamwhite1/xrpl-referee` は「★0の個人プロジェクト」ではない

Scout は「★0・個人・要警戒」と記載したが、リポジトリ本体を確認した結果、
**実装規模は相当大きい**。

| 項目 | 実測値 |
|---|---|
| コミット数 | **383**（main ブランチ） |
| 実装 | Python 実装が実在（`mcp_server.py`, `referee.py`） |
| 稼働状況 | **MCP サーバ / REST API / playground / health ページが稼働中** |
| MCP ツール数 | 36 |
| Star / Fork | 0 / 0 |

出典: https://github.com/eamwhite1/xrpl-referee

### 機能
- crypto-condition エスクローによる資金ロック（AI評価の合格で解放）
- XRPLアドレスに対する**12シグナルの信用スコア**（0〜100）
- Gemini 2.5 Pro による成果物の PASS/FAIL 判定
- NFT 発行者レジストリ（ドメイン所有によるorg→wallet検証）
- タスク単位の予算（ジョブがXRP額を指定し、エスクローがその額を正確にロック）

### 判断への影響
**star数はこの領域では無意味な指標**（領域自体が新しく、誰も星を付けていない）。
コミット383・稼働エンドポイントありは「実質的に動いている競合」とみなすべき。

**空白3（支出レシートと事後監査）とタスク単位予算の部分が重複する。**
ただし以下は xrpl-referee に**無い**ことを確認した:
- 支払先の許可リスト（信用スコアとbid-award方式で代替しており、allowlistは無い）
- 人間側の異議申立て・返金ワークフロー

---

## 修正2: 空白1 の新規性は Scout の記述より低い

Scout は AllowanceKit を「Base/Solana のみ対応で XRPL 非対応」と正しく記載したが、
**その中身を確認すると、空白1で挙げた機能の大半が既に実装済み**だった。

AllowanceKit（https://github.com/fskroes/AllowanceKit、MIT、75コミット、★0）が既に持つもの:
- 総予算上限（`totalBudgetUsd`）
- 1回あたり上限（`perCallMaxUsd`）
- ローリング速度制限とサーキットブレーカー
- 閾値超過時の人間承認ゲート
- キルスイッチ（即時凍結）
- **追記専用の監査台帳**（全支払い判断を記録）
- Solana の `upto` payment channel 対応

対応チェーン: Base / Base Sepolia / Solana / Solana devnet。**XRPL の記載は一切なし。**

### 判断への影響
空白1は「**誰も思いついていない**」ではなく「**他チェーンで解決済みのパターンが
XRPL に移植されていない**」が正確。新規性の主張としては弱い。

ただし**差別化点は残る**:
- AllowanceKit の上限強制は**ソフトウェア側**（state-dir ロック）。
  XRPL Payment Channel の `Amount` は**台帳が拒否する**ため、実装バグや
  プロンプトインジェクションで突破できない。この差は本質的
- AllowanceKit に**支払先の許可リストは無い**

---

## 修正後の空白ランキング

| 順位 | 空白 | 新規性 | 根拠 |
|---|---|---|---|
| **1** | **空白2: 支払先の事前許可リスト（XLS-80）** | **高** | AllowanceKit に無し。xrpl-referee にも無し（信用スコアで代替）。t54 x402 Secure はクローズド商用。OSS代替が存在しない |
| 2 | 空白1: 支出上限のオンチェーン強制 | 中 | 他チェーンに先行実装あり。ただし「台帳が拒否する」点は本質的な差別化 |
| 3 | 空白3: 支出レシートと事後監査 | 中〜低 | AllowanceKit が監査台帳を実装済み。xrpl-referee とも重複。異議申立て・返金の部分のみ空白 |
| — | 空白4: RLUSD ストリーミング | 対象外 | amendment 案件。アプリ層で解けない |

## 次アクションの推奨

1. **空白2 を軸に据え、空白1 を「同じ原語（Payment Channel + Permissioned Domains）で
   同時に解く」形で束ねる**のが最も筋が良い。単独では弱い空白1が、空白2と組むと
   「上限と支払先を1つの仕組みで台帳に強制する」という一貫した主張になる
2. Architect による `xrpl_necessity` 判定にかける前に、**xrpl-referee の稼働エンドポイントを
   実際に叩いて**、どこまで動くかを確認する
3. [要確認] XRPL Commons ハッカソン作品（BumbleBee / Agent Octopus）の実体
4. [要確認] 2026年 XRPL Grants AI Fund の採択一覧（衝突案件の有無）
