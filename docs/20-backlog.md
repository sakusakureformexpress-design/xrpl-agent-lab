# 20 — バックログ

最終更新: 2026-09-18（Sprint 1 完了時点で全面改訂）

## 前提の変更

応募窓口がクローズしており、次は **2026年10月の新プログラム発表**。
→ 急いで申請する路線は消えた。**10月までに動く MVP を作る**路線に切り替える。

---

## Sprint 1 — 完了 ✅

- [x] 助成金要件の調査（出典93本）
- [x] 既存プロジェクト55件の棚卸し（出典87本）
- [x] Critic による検証（2件の修正、1件の未再現を記録）
- [x] 空白候補の抽出とランキング

成果物:
- `research/2026-09-18-grants-requirements.md`
- `research/2026-09-18-landscape.md`
- `research/2026-09-18-critic-review-grants.md`
- `research/2026-09-18-critic-review-landscape.md`

---

## Sprint 2 — 企画の確定（次に実行）

Sprint 1 で空白がほぼ特定できたため、当初予定の「10案出して足切り」は**過剰**。
**空白2を軸にした1案を深掘りし、Judge にかける**方式に変更する。

### 目標
1. 空白2（支払先の事前許可リスト）＋ 空白1（上限のオンチェーン強制）を
   束ねた企画を1案、Judge が採点できる粒度で記述する
2. 競合 T54 / xrpl-referee との差分を明文化する

### 受入基準
- [ ] 企画が「課題 / 解決策 / 使うXRPL機能 / 成功指標（オンチェーン測定可能）/
      T54との差分 / xrpl-refereeとの差分」の6項目で記述されている
- [ ] **xrpl-referee の稼働エンドポイントを実際に叩き**、どこまで動くかを
      `research/` に記録している（Critic 指摘事項）
- [ ] Architect が `xrpl_necessity` を判定し、**12/20 以上**である
- [ ] Judge が採点し、**構想段階の減点（−15）を除いて 70点以上**の見込みがある
- [ ] 成功指標が「オンチェーンで測定可能」な形で2つ以上定義されている

### 担当
- Architect: XRPL必然性の判定、riskiest_unknown の特定
- Builder: xrpl-referee の稼働確認
- Judge: 採点
- PM: 確定と記録

---

## Sprint 3 — スパイク

### 目標
riskiest_unknown を testnet で潰す

### 受入基準
- [ ] Payment Channel の `Amount` による上限強制が testnet で動作し、
      **上限超過の支払いが台帳に拒否されること**を tx で実証している
- [ ] Permissioned Domains(XLS-80) + Credentials(XLS-70) で
      支払先を限定する最小実装が testnet で動作している
- [ ] 各 tx hash が `docs/logs/` に記録されている
- [ ] 動かなかった場合は「動かなかった理由」を記録し、設計を見直している

---

## Sprint 4 以降 — MVP

10月の発表までに「第三者が再現できる動くもの」にする。
詳細は Sprint 3 完了後に定義する。

---

## 継続タスク

- [ ] **10月の新プログラム発表を監視する**（見逃すと数ヶ月待ち）
- [ ] `RippleXEcosystem@ripple.com` への問い合わせ（`docs/40-inquiry-email.md` を改訂済み）
- [ ] [要確認] 日本の税務区分 → **税理士相談。推測で進めない**

## アイスボックス

- ピッチデック作り込み（企画確定後）
- デモ動画撮影（MVP完成後）
- Ripple × Web3 Salon ルートの調査
