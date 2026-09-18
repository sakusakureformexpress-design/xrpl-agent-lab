# 40 — XRPL Grants への問い合わせ文面

宛先: **RippleXEcosystem@ripple.com**
（`info@xrplgrants.org` ではなく、こちらが現行の窓口）
ステータス: **未送信。`<NAME>` を埋めれば送れる**

> 2026-09-18 時点で応募窓口はクローズしている
> （"There are presently no open calls for applications."）。
> したがって「今すぐ応募したい」ではなく、
> **「次の窓口を逃さないための接点作り」**として送る。
>
> **動く実物ができたので、それを先に見せる構成に改めた。**
> 「作る予定です」ではなく「作りました、見てください」のほうが強い。

---

**Subject:** Ledger-enforced spending limits for agentic payments — questions ahead of the October programs

Hello RippleX Ecosystem team,

I am an independent developer based in Japan. I have built an open-source
toolkit on the XRP Ledger and wanted to introduce it ahead of the programming
due to be announced in October, rather than wait for applications to open.

**What it does.** The tooling released so far — the XRPL AI Starter Kit, the
x402 and MPP integrations — solves how an agent *makes* a payment. This solves
the opposite side: how a human *constrains* what an agent may pay for. A budget
is a payment channel, so the ceiling and the payee are enforced by the ledger
rather than by application code, and the agent holds only a signing key, never
the account key.

It works today on testnet. When a simulated compromise claims 100 XRP against a
10 XRP cap, the signature is valid and the ledger refuses it anyway with
`tecUNFUNDED_PAYMENT`.

- Repository (MIT): https://github.com/sakusakureformexpress-design/xrpl-agent-lab
- Two-minute demo: https://youtu.be/yg3UMwMczU4

**Two things I found while building it**, which may be of interest regardless of
whether this project is a fit:

1. Account permission delegation cannot express a spending limit — the granular
   permissions are hard-coded, and the documentation notes you cannot even
   restrict which currencies a delegate may send. Payment channels and escrow
   appear to be the only primitives that bind an amount.
2. The `exact` scheme for XRPL in x402 accepts only a signed `Payment`
   transaction, which means an agent transacting over x402 must hold authority
   over an account. I have written up a `batch-settlement` network binding for
   XRPL that would let a payment channel serve the same flow, and would welcome
   a pointer to the right venue for that discussion.

**Three questions.**

1. **Upcoming programs.** Is there a mailing list or channel where the October
   announcement will be posted? I would like to be sure I do not miss the window.
2. **Fit.** Would this direction suit the grant program's current priorities, or
   is it better suited to a different part of the ecosystem? I would rather hear
   that early than submit something misaligned.
3. **Growth milestones.** The FAQ notes that roughly 70% of an award is tied to
   growth-based milestones on on-chain metrics or other key growth metrics. For
   developer-facing infrastructure, where success shows up as integrations
   rather than end users, how are those milestones usually defined? Every
   transaction this toolkit sends carries a fixed `SourceTag`, so adoption can
   be counted from the ledger directly — I would like to know whether that is
   the kind of metric you work with.

Thank you for your time.

Best regards,
<NAME>
https://github.com/sakusakureformexpress-design/xrpl-agent-lab

---

## 送信前に

- [ ] `<NAME>` を埋める（本名でもハンドルネームでも可）
- [ ] 件名をコピーする
- [ ] 本文の `**太字**` の記号を外す（メールにマークダウンは効かない）

## 書き方の意図

- **成果物を先に出す。** 「作る予定」ではなく「動いています、見てください」
- **質問だけでなく、こちらからも情報を渡す。**
  仕様の穴2点は、調べた人にしか書けない内容であり、相手にとっても価値がある
- **3番目が本題。** 開発者向けインフラの成長マイルストーンは公開情報に事例が無く、
  申請書で唯一埋まっていない欄。ここに実務的な回答が得られると質が大きく変わる
- **誇張しない。** メインネット未対応、RLUSD 未対応は書いていないが、
  聞かれたら正直に答える
