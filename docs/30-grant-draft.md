# 30 — XRPL Grants 申請ドラフト

最終更新: 2026-09-18
ステータス: **草案（窓口は2026年10月告知待ち）**
方針: **英語。誇張しない。実装済みと未実装を明確に分ける。**

---

## Project Name

**XRPL Leash**

## One-line description

Ledger-enforced spending limits and payee restrictions for autonomous AI agents.

## Problem

Autonomous agents can now pay for services on their own. Ripple's XRPL AI Starter Kit,
x402 and the Stripe/Tempo Machine Payments Protocol all shipped in 2026, and x402 traffic
on the XRP Ledger already runs at roughly 4,400 payments per hour.

The controls did not ship with them.

Every spending limit available today lives **inside the agent's own process** — a config
value, a state-directory lock, an advisory tool the agent is expected to consult. That
design fails against the most common attack on agents: prompt injection. A page the agent
reads during a task tells it to ignore prior instructions and send everything to an
attacker's address. The agent complies, and the limit that was supposed to stop it is
running in the same process that was just compromised. **The guard is the suspect.**

We verified this on the closest existing XRPL project. Its spending cap exists only in an
advisory tool and never reaches the code path that moves money; a grep for payee
allowlists, Permissioned Domains, Credentials and DepositPreauth across its 7,306-line
core returns zero results. The only amount check in its escrow path is a *lower* bound.

This is why treasury owners will not let agents spend real money. The barrier is not
capability. It is that no one can prove the ceiling holds.

## Solution

XRPL Leash moves the ceiling out of the application and into the ledger.

A budget is a payment channel. `Amount` is the ceiling; `Destination` is the payee. Both
are set at creation. No transaction type can change the destination, and the cap can only
be raised by the channel's own source account — which requires the account key. The agent receives
only a signing key registered as the channel's `PublicKey` — never the owner's account
key. It can sign claims; it cannot exceed the cap, redirect funds, or touch the account
behind the channel.

One channel per approved payee. An agent can only pay counterparties a human funded a
channel to, for no more than that channel holds.

When an agent is compromised, the ledger still enforces what the human set. The blast
radius is one channel's remaining balance.

## Why the XRP Ledger?

These are protocol-level primitives, not contracts. There is no bytecode to audit, no
upgrade key, no reentrancy surface. The ceiling is part of the ledger's own validation
rules, so it cannot be bypassed by a bug in our code or anyone else's.

On other chains the same guarantee requires a smart contract — which is itself an attack
surface, and which must be audited, deployed and maintained per chain.

Deterministic finality in 3–5 seconds and sub-cent fees make per-call agent payments
economically viable in the first place.

## Technical integration plan

| Guarantee | Mechanism | Enforced by |
|---|---|---|
| Spending ceiling | `PaymentChannelCreate.Amount` | Ledger |
| Approved payee | `PaymentChannelCreate.Destination` (no transaction can change it) | Ledger |
| Key separation | Channel `PublicKey` = agent's signing key only | Structure |
| Time limit | `CancelAfter` | Ledger |
| Revocation | `PaymentChannelClaim` with `tfClose` | Owner |
| Adoption measurement | `SourceTag = 1279607123` on every transaction | Public ledger |

The library is split along the trust boundary: `LeashOwner` holds the account key,
`LeashAgent` holds only a signing keypair and has no account, `LeashPayee` redeems
vouchers.

**Non-XRP denominations.** Payment channels are XRP-only. We verified on testnet that
token-denominated locks *are* possible on the XRP Ledger via escrow when the issuer sets
`asfAllowTrustLineLocking`: a 100 USD IOU escrow succeeded and the holder's trust line
balance moved from 1000 to 900. RLUSD cannot be used this way today — not because of a
protocol limitation, but because its issuer has not enabled that flag. We will support
any issuer that has. Note that escrow is all-or-nothing, so incremental micro-spending
remains XRP-only.

## Current status

Working proof of concept on XRPL Testnet. Reproducible with `node src/verify/03-e2e.js`.
Recorded run (2:22): https://youtu.be/yg3UMwMczU4

| Action | Ledger response | Transaction |
|---|---|---|
| Open budget, cap 10 XRP, payee fixed | `tesSUCCESS` | `87DE7F79…` |
| Claim within cap (3 XRP) | `tesSUCCESS` | `214E65E8…` |
| **Claim above cap (50 XRP)** | **`tecUNFUNDED_PAYMENT`** | `C34C542C…` |

End-to-end run: two budgets funded, two payments settled, a simulated compromise attempts
a 100 XRP claim against a 10 XRP cap and is rejected by the ledger, a payment to an
unapproved address is structurally impossible because no channel exists to it, and the
owner closes a budget. Loss to the owner's account: 0 XRP.

**Not yet built:** mainnet deployment, framework adapters, hosted dashboard.

## Success metrics (on-chain)

Every transaction carries `SourceTag = 1279607123`, so all figures below are verifiable
by third parties directly from the ledger. No self-reported numbers.

| Metric | Source |
|---|---|
| Budgets opened | `PaymentChannelCreate` count with our SourceTag |
| Total value under enforced limits | Sum of `Amount` on those channels |
| Payments settled through Leash | `PaymentChannelClaim` count with our SourceTag |
| Distinct integrating accounts | Unique `Account` values across the above |
| Repositories depending on the package | GitHub dependents |

## Roadmap and milestones

**Product and integration (~30%)**

1. Core library and testnet proof — **complete**
2. Mainnet support, key handling hardening, security review
3. Adapters so any agent framework can use it (MCP server; Python parity)
4. Reference integration with an x402 / MPP flow
5. Documentation and worked examples

**Growth (~70%)**

Targets to be set with the grants team. They will be expressed as SourceTag-derived
on-chain counts — budgets opened, value under enforced limits, settled claims and
distinct integrating accounts — plus integration count, and verified from the public
ledger rather than reported by us.

## Team

Independent, Japan-based. Non-engineer founder working with AI agents for research,
verification and implementation, currently recruiting an XRPL engineer from the XRP
community.

Rather than assert execution capability, the repository is the evidence: competitive
analysis with sources for every claim, a design error found and corrected mid-flight
(Permissioned Domains do not gate ordinary payments — recorded, not hidden), and a
working testnet proof, all in public commit history.

## Links

- GitHub: https://github.com/sakusakureformexpress-design/xrpl-agent-lab
- Demo video: https://youtu.be/yg3UMwMczU4
- Pitch deck: _TBD_

---

## 埋めるときの注意（社内メモ・提出しない）

- **Team 欄は正直に書く。** 「非エンジニア + AIエージェント」を隠すと面接で破綻する。
  代わりに**リポジトリの履歴を証拠として提示する**構成にしてある
- **Growth の数値目標は空欄のままにする。** 公開情報に事例が無いため、
  問い合わせかヒアリングで実務的な水準を掴んでから埋める
- **RLUSD は「できない」と書かない。** 「発行体のフラグ待ち」が事実
- **未実装を現在形で書かない。** Current status の "Not yet built" は必ず残す
- **ピッチデックの URL は、共有設定を確認してから入れる。**
  現在は非公開の Artifact であり、そのままでは審査員が開けない。
  共有設定を「リンクを知っている人は閲覧可」にするか、PDF に書き出して差し替える
