# 00 — 戦略

最終更新: 2026-09-18

## ゴール

**XRPL Grants への採択。** 助成額 $10,000〜$200,000（非希薄化）。

## 意思決定の記録

### 2026-09-18: ハッカソン不参加を決定

XRPL Commons ハッカソン（10/24-25, ニューヨーク）は**不参加**。

理由:
- 現地開催であり、渡航が不可能
- Agentic Finance トラックのバウンティは $4,000。渡航費に見合わない
- **審査対象が「36時間内に作ったもの」に限定**されるため、事前の積み上げが効かない

出典:
- https://genfinity.io/2026/08/24/xrp-ledger-hackathon-nyc-october-2026-xrpl-commons-swell/
- https://hackathons.xrpl-commons.org/

ただし、ハッカソンのトラック構成（Protocol Innovation / **Agentic Finance** /
Lending & Borrowing / Why Not）は **エコシステムが今どこに金を出したいか**の
シグナルとして有効。Agentic Finance は重点領域とみなす。

## 確認済みの事実（助成金）

| 項目 | 内容 | 出典 |
|---|---|---|
| 助成額 | $10,000〜$200,000（非希薄化） | https://xrplgrants.org/faq |
| Accelerator | $50,000〜$200,000 | 同上 |
| 応募資格 | 18歳以上、OFAC制裁国以外。**個人・法人化前チーム・法人すべて可** | 同上 |
| 除外 | Ripple 社員は応募不可 | 同上 |
| 選考 | 応募 → 通過者に本申請 → ファイナリスト面接 → 採択 → マイルストーン資金供給 | https://xrplgrants.org/ |
| **マイルストーン構造** | プロダクト/統合 約30% ＋ **成長系（オンチェーン指標等）約70%** | https://xrplgrants.org/faq |
| ファンド | AI Fund、**Japan/Korea Fund**、Brazil Fund、Accelerator | https://xrplgrants.org/ |
| GitHub | 「preferred」。無い場合は設計図＋narrative で代替可 | https://xrplgrants.org/faq |
| 評価軸 | プロダクト / チーム / トラクション / スケーラビリティ。**調達希望額は評価に無関係** | https://xrplgrants.org/ 他 |

### 必要な提出物
- PoC または MVP
- コードまたはアーキテクチャの証明（GitHub リポジトリ / システム設計図）
- XRPL との技術統合計画
- **2分のプロジェクトデモ動画**
- ピッチデック

## この構造から導かれる制約（最重要）

**助成金の約70%が成長マイルストーンに紐づく** ため:

1. 「技術的に優れたライブラリ」だけでは構造的に通らない。
   **オンチェーンで測定可能な利用**が生まれる設計でなければならない
2. 企画段階で「成功指標は何か、それはどうやってオンチェーンで測るか」を
   定義しておく必要がある
3. ユーザーがゼロのまま申請するより、小さくても実利用がある状態のほうが強い

## 未確認事項

- [要確認] Japan/Korea Fund の要件・金額・締切。FAQ に記載なし。
  → `info@xrplgrants.org` に直接問い合わせる
- [要確認] AI Fund と Japan/Korea Fund の併願可否
- [要確認] 応募の締切／ウェーブ制かローリングか
- [要確認] オープンソース化は必須か（FAQ では必須と明記されていない）
