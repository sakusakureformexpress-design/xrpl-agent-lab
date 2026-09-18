# xrpl-agent-lab

XRPL Grants 採択を目標とするプロジェクト。
サブエージェント7体による PDCA で企画・実装・検証を回す。

## 現在のステータス

**Sprint 1 未着手** — 企画未確定。まず助成金要件と競合の調査から。

## ドキュメント

| ファイル | 内容 |
|---|---|
| [docs/00-strategy.md](docs/00-strategy.md) | 戦略・確認済み事実・意思決定の記録 |
| [docs/10-rubric.md](docs/10-rubric.md) | Judge の採点表（100点満点／合格70点） |
| [docs/20-backlog.md](docs/20-backlog.md) | バックログと受入基準 |
| [docs/30-grant-draft.md](docs/30-grant-draft.md) | 申請書ドラフト |
| [docs/logs/](docs/logs/) | スプリント記録 |
| [research/](research/) | 調査結果（出典URL必須） |

## エージェント構成

| エージェント | 責務 | 差し戻し権限 |
|---|---|---|
| `pm` | スプリント統括、受入基準の定義、優先順位 | ○ |
| `scout` | 調査（出典URL必須） | — |
| `architect` | 技術設計、実現可能性、XRPL必然性の判定 | ○ |
| `builder` | 実装（testnet で動作証拠を残す） | — |
| `critic` | 受入基準に対する厳格検証 | ◎ |
| `judge` | 審査基準で100点満点採点、70点未満は差し戻し | ◎ |
| `storyteller` | 申請書・README・デモ台本・ピッチデック（英語） | — |

定義は [.claude/agents/](.claude/agents/) を参照。

## 設計上の要点

1. **Builder と Critic を分離** — 自己レビューは構造的に甘くなる
2. **受入基準を実装前に定義** — 差し戻しが感想にならないように
3. **差し戻しは JSON で構造化** — 閾値未満は機械的にバックログへ戻る
4. **出典URL必須** — エージェントの捏造を構造で防ぐ
5. **Judge の採点表は主催の公開評価軸から作る** — 想像で作らない

## セキュリティ

- 秘密鍵・シードはコミットしない（`.gitignore` 済み）
- mainnet の鍵はこのリポジトリで扱わない。testnet / devnet のみ
