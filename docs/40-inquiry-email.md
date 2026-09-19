# 40 — RippleX への問い合わせ文面

宛先: **RippleXEcosystem@ripple.com**
（`info@xrplgrants.org` ではなく、こちらが現行の窓口）
ステータス: **未送信。`<NAME>` を埋めれば送れる**

> 2026-09-19 に書き直した。理由は `research/2026-09-19-funding-routes.md`。
>
> 前の版は「10月の告知を逃さないための接点作り」として書いていた。
> しかし Ripple 自身が既に「2026 年は分散モデルへ移行」と公表しており、
> **受け皿は XRPL Grants だけではなくなっている。**
> 「10月の告知はどこで見られますか」と聞くのは、公開情報を読んでいないように見える。
>
> したがって**聞くことを変えた**。どの受け皿が合うのか、
> そして**渡航要件**（こちらの最大の制約）を先に確認する。

---

**Subject:** Ledger-enforced spending limits for agentic payments — which 2026 route fits?

Hello RippleX Ecosystem team,

I am an independent developer based in Japan. I have built an open-source
toolkit on the XRP Ledger and would like to ask which part of the 2026
ecosystem programming it belongs in, rather than wait for a window to open and
guess.

**What it does.** The tooling released so far — the XRPL AI Starter Kit, the
x402 and MPP integrations, and the Open Wallet Standard work — solves how an
agent *makes* a payment. This solves the opposite side: how a human *constrains*
what an agent may pay for, in a way that survives the agent being compromised.

A budget is a payment channel, so the ceiling and the payee are enforced by the
ledger rather than by application code, and the agent holds only a signing key,
never the account key. OWS enforces the same limits inside a vault; this places
them on the ledger, so a compromised host cannot move them either. The two are
complementary, and I would like the broker layer to sit behind the OWS policy
interface rather than compete with it.

It works today on testnet. When a simulated compromise claims 50 XRP against a
10 XRP cap, the signature is valid and the ledger refuses it anyway with
`tecUNFUNDED_PAYMENT`.

- Repository (MIT, full history public): https://github.com/sakusakureformexpress-design/xrpl-agent-lab
- Two-minute demo: https://youtu.be/yg3UMwMczU4

Your application page lists what a grant applicant should have ready — a pitch
deck, a demo or prototype link, a GitHub repository, and code access for
technical review. All four exist now, including an owner dashboard that reads
the ledger directly and shows which limits are enforced on-chain versus in
software.

**Two findings from building it**, which may be useful regardless of whether this
project is a fit:

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

1. **Which route.** Your 2026 post describes a shift to a more distributed
   model — XAO DAO microgrants, XRPL Commons, XRP Asia, the FinTech Builder
   Program, and the accelerators. Infrastructure for agentic payments does not
   obviously belong to any one of them. Where would you point it? XRP Asia in
   particular is described as early-stage, and I am in Japan.
2. **Travel.** I cannot travel internationally. The XRPL Accelerator page
   describes "the opportunity to attend an onsite demo day", while the Tenity
   SFIIP page states an on-site demo week "is required". Is remote-only
   participation possible in any current program, or should I focus on the
   non-cohort routes?
3. **Growth milestones.** The FAQ notes that roughly 70% of an award is tied to
   growth-based milestones. For developer-facing infrastructure, where success
   shows up as integrations rather than end users, how are those usually
   defined? Every transaction this toolkit sends carries a fixed `SourceTag`
   (1279607123), so adoption can be counted from the ledger directly — I would
   like to know whether that is the kind of metric you work with.

One small thing: I could not confirm the official submission endpoint for XAO
DAO. Several domains present themselves as it, at least one on a free
subdomain asking to connect a wallet. If there is a canonical link, I would
rather have it from you than from a search result.

Thank you for your time.

Best regards,
<NAME>
https://github.com/sakusakureformexpress-design/xrpl-agent-lab

---

## 送信前に

- [ ] `<NAME>` を埋める（本名でもハンドルネームでも可）
- [ ] 件名をコピーする
- [ ] 本文の `**太字**` と `` `コード` `` の記号を外す（メールにマークダウンは効かない）

## あわせてやること

**メールと別に、公式フォームから「今すぐ」出せる。**
https://submit.xrplgrants.org/ には、窓口が閉じている間も
"submit information about your project for future consideration" のフォームがある。
RippleX 側が内容を見て、合うプログラムが開いたときに繋いでくれる仕組み。
**窓口が開くのを待つのではなく、開いたときに声がかかる側に回るためのもの。**

## 書き方の意図

- **公開情報を読んでいることを示す。** 2026 年の分散モデル、accelerator の現地要件、
  応募に必要な4点セット。これらに触れることで「調べずに聞いている人」から外れる
- **渡航できないことを先に言う。** 後から判明すると相手の時間を無駄にする。
  制約として先に置けば、相手は残る選択肢の中から答えられる
- **OWS を自分から出す。** 触れずに進めると「それ OWS でよくない?」で終わる。
  先に「補完であり、その上に乗りたい」と言い切る
- **XAO DAO の偽サイト懸念を伝える。** 相手にとっても有用な情報であり、
  こちらが慎重であることも同時に伝わる
- **誇張しない。** メインネット未対応、RLUSD 未対応は書いていないが、
  聞かれたら正直に答える
