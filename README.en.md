# XRPL Leash

**Ledger-enforced spending limits and payee restrictions for AI agents on the XRP Ledger.**

[日本語](README.md)

Agents can be prompt-injected. If an agent's spending limit lives on the agent's own
host — in a config value, a policy script, or a tool the agent is expected to consult —
whoever takes over the agent's host takes over the limit too.

XRPL Leash puts the limit where the host cannot reach it: in the ledger's own validation
rules.

## How it works

A budget is an XRPL **payment channel**.

| Guarantee | Mechanism | Enforced by |
|---|---|---|
| Spending ceiling | `PaymentChannelCreate.Amount` | the ledger |
| Approved payee | `PaymentChannelCreate.Destination` — no transaction type can change it | the ledger |
| Key separation | the channel's `PublicKey` is the agent's signing key; the agent never holds the account key | structure |
| Expiry | `CancelAfter` | the ledger |
| Measurement | `SourceTag = 1279607123` (`0x4C454153`, "LEAS") on every transaction | public ledger |

The agent can only sign claims against channels the owner opened. Only the owner's account
(or an account it explicitly delegates to, once XLS-75 is active) can raise a ceiling
(`PaymentChannelFund`); the agent can move neither the ceiling nor the payee. One channel per approved payee.

### Two tiers

| | Tier 1 — payment channels | Tier 2 — broker |
|---|---|---|
| Use when | the payee is known in advance | the payee is discovered at runtime (e.g. x402) |
| Limit enforced by | **the ledger** | software: per-payment and daily limits, payee denylist, new-payee quota, payee ↔ domain binding |
| Worst case if the host is compromised | the channel's remaining balance | the broker account's balance — never the owner's account |

The broker's decision function is a pure function: no LLM, no natural-language input, no
network or file I/O. The x402 `exact` scheme for XRPL accepts only a signed `Payment`, which
is why x402 currently goes through Tier 2. A payment-channel network binding that would move
it to Tier 1 is drafted in [`docs/90-x402-paychannel-proposal.md`](docs/90-x402-paychannel-proposal.md).

## Verified on XRPL Testnet

| Action | Ledger response |
|---|---|
| Open a budget: cap 10 XRP, payee fixed | `tesSUCCESS` |
| Claim within the cap (3 XRP) | `tesSUCCESS` |
| **Claim above the cap (50 XRP), validly signed** | **`tecUNFUNDED_PAYMENT`** |

The signature was valid. The ledger refused it anyway. Transaction hashes are in
[`docs/logs/`](docs/logs/).

End-to-end run (`node src/verify/03-e2e.js`): two payments settle, a compromised agent's
100 XRP claim against a 10 XRP cap is rejected by the ledger, a payment to an unapproved
address is impossible because no channel to it exists. Loss to the owner's account: 0 XRP.

## Quick start

Requires Node.js 20+.

```bash
npm install
npm test                      # 129 tests, no network
node src/verify/01-channel-cap.js   # over-cap claim rejected on testnet
node src/verify/03-e2e.js           # end-to-end on testnet
```

### Owner CLI

```bash
node bin/leash.js new-agent                          # create an agent signing key
LEASH_OWNER_SEED=s... node bin/leash.js grant \
  --payee rVendor... --cap 10 --agent-pubkey ED... --expires 86400
node bin/leash.js list --address rOwner...           # public data only, no key needed
LEASH_OWNER_SEED=s... node bin/leash.js revoke --channel <id>
node bin/leash.js dashboard --address rOwner...      # read-only, 127.0.0.1 only
```

`revoke` sends `tfClose` from the owner's account. On the XRP Ledger this **schedules**
closure after the channel's `SettleDelay` (Leash's default: 1 hour) unless nothing is left in
the channel; it is not an instant stop. The
ceiling is the defence; closing is cleanup.

### Agent side (MCP)

```json
{
  "mcpServers": {
    "xrpl-leash": {
      "command": "node",
      "args": ["/path/to/xrpl-agent-lab/src/mcp/server.js"],
      "env": { "LEASH_OWNER_ADDRESS": "rOwner...", "LEASH_AGENT_SEED": "sEd..." }
    }
  }
}
```

Tools: `list_budgets`, `authorize_payment`, `budget_status`. `LEASH_AGENT_SEED` is the
agent's signing key, not the owner's. This process cannot open budgets, raise ceilings or
change payees.

### Dashboard

Read-only. It holds no keys, accepts only `GET`, binds to `127.0.0.1`, validates the `Host`
header against DNS rebinding, and shows separately how much is enforced by the ledger and
how much by software.

## Related work

- **Open Wallet Standard (OWS).** OWS gates signing through a policy engine on the signing
  host. Its specification states that per-transaction value caps, recipient allowlists and
  daily spend are not built-in rules and require a custom executable policy, and its threat
  model lists compromised process memory as "not fully mitigated in the current in-process
  model". Leash is complementary: the broker's decision function is designed to fit OWS's
  executable-policy hook, and Tier 1 adds a ceiling the host cannot lift.
- **Permission Delegation (XLS-75).** Lets an account delegate `Payment` authority. A
  `Delegate` entry has no field for an amount, payee or expiry, so a delegation cannot be
  bounded. Payment channels and escrow bound an amount with funds set aside.

## Limitations

- Payment channels are XRP-only. Token-denominated locks are possible with escrow when the
  issuer allows it, but escrow releases all-or-nothing.
- Tier 2 (the broker) is software enforcement. Its policy and daily state live on the
  broker's machine.
- Testnet only. Mainnet key handling has not been designed yet.
- Not published to npm.

## Documentation

Design decisions, including rejected alternatives, are recorded in [`docs/adr/`](docs/adr/)
(Japanese). Security review: [`docs/91-security-review.md`](docs/91-security-review.md).
Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
