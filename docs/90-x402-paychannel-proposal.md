# Proposal: A payment-channel scheme for x402 on the XRP Ledger

Status: **draft for discussion**, not submitted upstream.
Author: xrpl-agent-lab.
Date: 2026-09-18.

> **Citation rule for this document.** Every factual claim carries a source URL.
> Claims that could not be sourced are marked **[unverified]**. Inferences are
> marked **[speculation]**. Field names are taken verbatim from the specs cited;
> none are invented except the ones this document explicitly proposes as new.

---

## Summary (3 lines)

1. The x402 `exact` scheme on XRPL requires a payer-signed `Payment` transaction, so an autonomous agent paying with x402 must hold a key that can sign *any* transaction from the payer's account — the spending cap lives in the client, not in the ledger.
2. XRPL payment channels already fix a maximum (`Amount`) and a recipient (`Destination`) at channel creation, and let a separate, non-account key sign off-ledger claims against them, which moves the cap into the ledger's own validation rules.
3. This is not a new top-level scheme: x402's existing **`batch-settlement`** scheme already names payment channels as a target, so the correct artifact is an XRPL network binding, `specs/schemes/batch-settlement/scheme_batch_settlement_xrpl.md`, sketched here.

---

## Motivation

### x402 `exact` on XRPL settles with a payer-signed `Payment`

The official XRPL binding of the `exact` scheme states the payment model plainly:

> | **Payment authorization** | The payer signs a standard XRPL `Payment` transaction |
> | **Settlement** | The facilitator submits the signed transaction to XRPL |
> | **Fee payer** | The payer pays the XRPL transaction fee embedded in the signed transaction |

— [`specs/schemes/exact/scheme_exact_xrpl.md`](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_xrpl.md), "Payment Model"

Verification rule 3 is explicit:

> ### 3. Transaction Type
> - `tx_json.TransactionType` MUST equal `"Payment"`.

— same file, "Facilitator Verification Rules (MUST)"

The T54 facilitator documentation restates the same constraint for its implementation, and it is the framing that motivated this proposal:

> "Only direct Payment transactions are supported."

— <https://xrpl-x402.t54.ai/docs/xrpl-scheme>

### What that costs an autonomous payer

To produce that blob, the client must sign with a key that controls the payer account. On XRPL, an account-level signing key is not scoped to an amount or a counterparty: the same key that signs a 0.01 XRP `Payment` signs a `Payment` for the account's whole balance, an `AccountSet`, a `SetRegularKey`, or an `OfferCreate`.

So the per-request cap in an x402 client is a property of the client software. If the agent is compromised — by prompt injection, a poisoned tool result, or an ordinary bug — nothing in the ledger's validation rules stops it. The cap and the allow-list of recipients are advisory.

### XRPL's own delegation primitive does not close this gap

XRPL has account permission delegation (`DelegateSet`, and a `Delegate` field on delegated transactions), but the documentation is explicit that it carries no spending limit:

> "the set of granular permissions is hard-coded and cannot be customized. For example, you cannot grant permission to send only certain currencies and not others."

— <https://xrpl.org/docs/concepts/accounts/permission-delegation>

The same page states the feature requires the `PermissionDelegationV1_1` amendment. And independently of whether delegation could help, the `exact` XRPL binding forbids it outright:

> The facilitator MUST reject transactions with: … `Delegate` present.

— [`scheme_exact_xrpl.md`](https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_xrpl.md), "§9. Safety Checks (MUST)"

So within x402 as specified today, an XRPL payer has exactly one option, and that option requires full account signing authority in the paying process.

### What payment channels change

A `PaymentChannelCreate` fixes three things at creation:

| Field | Type | Required | Role |
|---|---|---|---|
| `Amount` | Currency Amount | Yes | XRP allocated to the channel |
| `Destination` | Address | Yes | the only account that can ever receive from it |
| `PublicKey` | Hexadecimal | Yes | "The 33-byte public key of the key pair the source will use to sign claims against this channel." |
| `SettleDelay` | Number | Yes | seconds the source must wait to close a non-empty channel |
| `CancelAfter` | Number | No | immutable expiration |
| `DestinationTag` / `SourceTag` | Number | No | attribution |

— <https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate>

The `PublicKey` is the load-bearing field for this proposal. It registers a key that can sign claims **and nothing else**. That key is not an account key; it does not need to correspond to a funded account at all.

We confirmed the enforcement on testnet. A claim within the cap succeeded; a claim of 50 XRP against a 10 XRP channel was rejected by the ledger with `tecUNFUNDED_PAYMENT`, with no application-level check involved.

— [`docs/logs/2026-09-18.md`](./logs/2026-09-18.md) (XRPL Testnet, `network_id` 1, rippled 3.3.0, channel `177AE4305EDF4D556A2D867F5D1A11473A2C6946EE2351DD433FD5DBE2605557`)

---

## Problem with the current XRPL `exact` scheme

Stated as narrowly as the evidence supports:

1. `exact` on XRPL requires `TransactionType == "Payment"` (`scheme_exact_xrpl.md` §3).
2. A valid signature on a `Payment` requires a key with account-level authority over the payer account (<https://xrpl.org/docs/references/protocol/transactions/common-fields>).
3. XRPL provides no way to scope such a key to a maximum amount (<https://xrpl.org/docs/concepts/accounts/permission-delegation>).
4. Therefore an x402 client on XRPL cannot be given a *ledger-enforced* spending ceiling. Its ceiling is enforced by its own code.

This is not a defect in the `exact` spec. `exact` is doing its job, and it does it well: the spec's own security section correctly claims that "The resource server cannot collect more than the amount the payer signed for." The gap is one level up — nothing bounds what the payer *will* sign next.

**What is out of scope for `exact` is precisely what a channel binding can supply.**

---

## Proposed scheme

### Naming: bind to `batch-settlement`, do not add a top-level `paychannel`

This proposal was originally scoped as a new scheme named `paychannel`. On reading the specs, that is the wrong shape, and we say so rather than push our own name.

x402 already has a scheme whose stated purpose covers this exactly:

> `batch-settlement` exists to serve situations where gas fees exceed the value of individual requests, block confirmation time is incompatible with HTTP response latency, request volume requires batched settlement, or settlement happens through infrastructure that operates asynchronously from HTTP (**payment channels**, fiat billing systems, stablecoin invoices).

and, among its listed use cases:

> **Payment channel streaming.** A client and provider open a payment channel once. Each request increments a signed running total (a receipt). The provider closes the channel periodically, collecting accumulated value in one settlement regardless of how many individual requests were made.

— [`specs/schemes/batch-settlement/scheme_batch_settlement.md`](https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement.md)

It further defines a **capital-backed** commitment model in which "The client's commitment is backed by onchain capital committed before or during the session such as pre-funded escrow, **a payment channel**, or a delegated authorization against a wallet balance."

There is also direct precedent: [`scheme_batch_settlement_svm.md`](https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement_svm.md) is a payment-channel binding on Solana, with an `open`/`voucher` payload union and cumulative vouchers. An XRPL binding is the same shape with XRPL's native primitive instead of a deployed program.

Per [`specs/CONTRIBUTING.md`](https://github.com/x402-foundation/x402/blob/main/specs/CONTRIBUTING.md), the process is: (1) open a GitHub issue or discussion stating the problem, the high-level approach, and why existing schemes do not suffice; (2) write the spec from `scheme_impl_template.md`; (3) submit a PR placing it at `specs/schemes/<scheme_name>/scheme_<name>_<chain>.md`. The repository root `CONTRIBUTING.md` adds that a new chain binding is a 3-PR sequence — spec, then a reference implementation in one SDK, then the remaining SDKs.

So the artifact this proposal argues for is:

```
specs/schemes/batch-settlement/scheme_batch_settlement_xrpl.md
```

The rest of this section sketches its contents. Where the sketch names a field that does not exist upstream, it is **newly proposed here**, not quoted.

### Mapping the generic requirements to XRPL

The generic scheme requires every network binding to specify seven things. Mapping them:

| Requirement ([`scheme_batch_settlement.md`](https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement.md), "Network requirements") | XRPL mechanism |
|---|---|
| Commitment format | Claim signature over `encodeForSigningClaim` bytes; see below |
| Verification rules | `channel_verify` for the signature, `account_channels` for channel state |
| Storage behavior | Server stores the highest-valued valid claim per channel; `commitmentId = channelId:cumulativeAmount` |
| Double-spend prevention | Claims are cumulative and the ledger enforces monotonicity via `Balance` |
| Commitment expiry | Channel `Expiration` and immutable `CancelAfter` |
| Redemption | Destination submits `PaymentChannelClaim` |
| Trust model | Capital-backed: the trust anchor is XRP escrowed in the channel by the client |

### The commitment (claim) format

An XRPL channel claim is a signature over a fixed 44-byte message. Verified against the reference codec:

```
0x434C4D00                    # 4-byte prefix "CLM\0"
|| channelId                  # 32 bytes, the channel's UInt256 ID
|| cumulativeAmount           # 8 bytes, big-endian uint64, drops
```

The prefix constant is `paymentChannelClaim: bytes(0x434c4d00)` in `ripple-binary-codec/dist/hash-prefixes.js`, and the amount is serialized by `UInt64`, which writes two big-endian 32-bit halves (`ripple-binary-codec/dist/types/uint-64.js`). The assembled buffer is what `encodeForSigningClaim` returns, and `xrpl@5.3.0`'s `signPaymentChannelClaim` / `verifyPaymentChannelClaim` sign and verify exactly it (`node_modules/xrpl/dist/npm/utils/signPaymentChannelClaim.js`). Verified locally in this repository's dependency tree at `xrpl@5.3.0` / `ripple-binary-codec`.

Note there is **no expiry, nonce, invoice, or network identifier inside the signed message.** This is a real difference from the SVM binding, whose voucher commits to `expiresAt`, and it drives several of the rules below. The channel ID is domain-separating enough to prevent cross-channel replay, and since `channelId` is derived from the creating account and its sequence number, cross-network replay of a *claim* would require an identical channel to exist on both networks. **[speculation]** — we have not tested this, and the binding should say so rather than assert safety.

### `PaymentRequirements` fields

Core fields are defined in [`x402-specification-v2.md` §5.1.2](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md); only their XRPL meaning is given here.

| Field | Type | Required | Notes |
|---|---|---|---|
| `scheme` | string | yes | `"batch-settlement"` |
| `network` | string | yes | CAIP-2 `xrpl:{network_id}`. Mainnet `xrpl:0`, Testnet `xrpl:1`, Devnet `xrpl:2` (per `scheme_exact_xrpl.md`, "Network Identifier") |
| `asset` | string | yes | MUST be `"XRP"`. Payment channels are XRP-only (<https://xrpl.org/docs/concepts/payment-types/payment-channels>) |
| `amount` | string | yes | Per-request price in **drops**, matching the `exact` XRPL convention |
| `payTo` | string | yes | XRPL classic address. MUST equal the channel's `Destination` |
| `maxTimeoutSeconds` | number | yes | HTTP completion window |
| `extra` | object | yes | below |

`extra` — **all keys below are newly proposed by this document** except `paymentFlow`, `areFeesSponsored` and `invoiceId`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `paymentFlow` | string | no | When present MUST be `"authorization"`. Protocol-reserved key; see [`x402-specification-v2.md` §6.1](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md). Verify runs before the handler; `/settle` records the claim after it |
| `areFeesSponsored` | boolean | yes | MUST be `false`. XRPL charges the fee to the transaction `Account`; `PaymentChannelCreate` and `PaymentChannelFund` are sent by the client, and the redeeming `PaymentChannelClaim` is sent and paid for by the server. Mirrors the `exact` XRPL rule |
| `minChannelAmount` | string | yes | Minimum channel `Amount` (drops) the server will transact against. Bounds how often it must redeem |
| `minSettleDelay` | number | yes | Minimum `SettleDelay` (seconds) the server requires. MUST be `>= maxClaimIntervalSeconds`. See "Verification flow" step 6 |
| `maxClaimIntervalSeconds` | number | yes | The server's published commitment to redeem accumulated claims at least this often. Lets a client bound its capital lockup |
| `minRemainingCapacity` | string | no | Drops of unclaimed headroom (`Amount - Balance - acceptedOffLedger`) below which the server will stop serving and demand a `fund` |
| `invoiceId` | string | no | Invoice binding. **Cannot** be bound the way `exact` binds it — see "What this does not solve" |
| `sourceTag` | number | no | `SourceTag` the server asks the client to set on `PaymentChannelCreate`, for third-party measurement of adoption |
| `channelState` | object | no | Corrective-only server snapshot, used to resynchronize the cumulative amount after a client restart. Same role as `extra.channelState` in the SVM binding |

`assetTransferMethod` is deliberately **absent**. Following the SVM binding's precedent ("SVM `batch-settlement` defines a single payment method … so the wire format does not include `extra.assetTransferMethod`"), there is one method here.

### `PaymentPayload` fields

`payload` is a tagged union on `payload.type`, mirroring the SVM binding's `deposit` / `voucher` / `refund` split.

**Common object — `Claim`:**

| Field | Type | Notes |
|---|---|---|
| `channelId` | string | 64 hex chars |
| `cumulativeAmount` | string | Running total in drops that this claim authorizes. Monotonically non-decreasing per channel |
| `signature` | string | Hex signature over the 44-byte claim message, by the key registered as the channel's `PublicKey` |
| `publicKey` | string | 33-byte hex public key. MUST equal the channel's `PublicKey` |

**`type: "open"`** — first contact. Opens a channel and authorizes the first request.

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"open"` |
| `channelTx` | string | Hex-encoded **client-signed** `PaymentChannelCreate` blob |
| `claim` | `Claim` | Claim for the first request. Its `channelId` is the deterministically derived ID of the channel `channelTx` will create |

**`type: "claim"`** — steady state. **No on-ledger transaction at all.**

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"claim"` |
| `claim` | `Claim` | New cumulative claim |

**`type: "fund"`** — top-up when headroom runs out.

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"fund"` |
| `channelTx` | string | Hex-encoded client-signed `PaymentChannelFund` blob |
| `claim` | `Claim` | Claim for the current request |

`PaymentChannelFund` "adds funds" to the channel and may only be sent by the channel source; it cannot change the `Destination` (<https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelfund>). The cap is therefore raisable **only by the account owner**, never by the claim-signing key. This distinction is the whole security argument and the binding must state it: the cap is not immutable, it is immutable *to the agent*.

**`type: "close"`** — client-initiated teardown, for recovering the reserve and unspent `Amount`.

| Field | Type | Notes |
|---|---|---|
| `type` | string | `"close"` |
| `channelTx` | string | Hex-encoded client-signed `PaymentChannelClaim` with the `tfClose` flag (`0x00020000`) |

### `SettlementResponse`

Core fields per [`x402-specification-v2.md` §5.3](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md). The generic `batch-settlement` scheme requires that "The settlement result MUST include a non-empty commitment identifier on success."

| Field | Type | Value for this binding |
|---|---|---|
| `success` | boolean | |
| `transaction` | string | Empty string `""` for `type: "claim"` — nothing was broadcast. The XRPL transaction hash for `open`, `fund`, and `close` |
| `network` | string | e.g. `"xrpl:1"` |
| `payer` | string | The channel's source account (`account` from `account_channels`) |
| `amount` | string | The actual amount charged for this request, in drops |
| `errorReason` | string | Omitted on success |
| `extra.commitmentId` | string | **Proposed**: `"{channelId}:{cumulativeAmount}"`, mirroring the SVM binding's `channelId:maxClaimableAmount` |
| `extra.remainingCapacity` | string | **Proposed**: drops of headroom left, so the client knows when to `fund` |

An empty `transaction` on the `claim` path is the honest representation: value has been *authorized* and not yet moved. The core spec permits it — `transaction` is "Blockchain transaction hash (empty string if no transaction was broadcast…)".

### Verification flow

What the facilitator MUST do on `/verify`, for `type: "claim"` (the steady-state path). Steps 1–4 are offline; steps 5–8 need one ledger read.

**1. Envelope.** Reject if `x402Version != 2`; if `accepted.scheme != "batch-settlement"`; if `accepted.network` is unsupported; or if `accepted` does not match `paymentRequirements` on `scheme`, `network`, `asset`, `payTo`, `amount`, `maxTimeoutSeconds`. Reject if `asset != "XRP"`.

**2. Claim signature.** Reconstruct `0x434C4D00 || channelId || u64be(cumulativeAmount)` and verify `signature` against `publicKey`. This is pure cryptography and needs no network access — the same check `channel_verify` performs.

**3. Signer binding.** Reject unless `publicKey` equals the channel's registered `PublicKey`. Without this, step 2 proves only that *someone* signed.

**4. Monotonicity against local state.** Reject unless `cumulativeAmount >= storedWatermark + paymentRequirements.amount` for this `channelId`. This is where the server's own accounting lives; it cannot be reconstructed from the ledger.

**5. Channel existence and shape.** Call `account_channels` and reject unless the channel exists with `destination_account == paymentRequirements.payTo` and the expected `public_key_hex`. Note `account_channels` takes the **source** `account`, optionally filtered by `destination_account` (<https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_channels>), so the server needs the payer address, which it takes from the channel record it already stored (or, on the `open` path, from the signed `PaymentChannelCreate`).

**6. Capacity.** Reject unless `cumulativeAmount <= amount` (the channel's total allocation) **and** `cumulativeAmount > balance` (the drops already claimed). `amount` is "The total amount, in drops of XRP, allocated to this channel"; `balance` is "The amount, in drops, currently allocated to claims against this channel" (same page).

This step is **mandatory and cannot be skipped**, because the XRPL docs warn about exactly this:

> "This does not check whether the channel has enough XRP allocated to it."

— <https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/payment-channel-methods/channel_verify>

A facilitator that verifies only the signature has verified nothing economically meaningful.

**7. Expiry.** Reject if the channel's `expiration` or `cancel_after` is at or before `now + maxClaimIntervalSeconds`. `Expiration` is "The mutable expiration time for this payment channel… The channel is expired if this value is present and smaller than the previous ledger's close_time field"; `CancelAfter` is immutable and set at creation (<https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/paychannel>). A channel that will expire before the server next redeems is worthless to the server even though every signature on it is valid.

**8. Closing state.** Reject if the source has already requested closure and the remaining window is shorter than the server's redemption latency. When the source sends `PaymentChannelClaim` with `tfClose`,

> "the ledger automatically sets the `Expiration` to whichever of the following values is earlier: The current `Expiration` value (if one is set) [or] The previous ledger's close time plus the `SettleDelay` of the channel."

— same page

That is the server's protection window, and step 7 already covers it if `SettleDelay >= maxClaimIntervalSeconds` is enforced at step 5 via `settle_delay`.

**On `/settle`** for `type: "claim"`: persist the claim as the new watermark for `channelId`, atomically, and return `commitmentId`. No XRPL submission. **Redemption is a separate, asynchronous process**: the server (the `Destination`) submits `PaymentChannelClaim` with `Balance` set to the highest accepted `cumulativeAmount`, plus `Amount`, `Signature` and `PublicKey` from the claim. `Balance` "must be more than the total amount delivered by the channel so far, but not greater than the `Amount` of the signed claim" (<https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelclaim>).

---

## Worked example

Real values from this repository's testnet run ([`docs/logs/2026-09-18.md`](./logs/2026-09-18.md)): channel `177AE430…` on `xrpl:1`, cap 10 XRP (`10000000` drops), `balance` already at `3000000` drops, destination `rNWHpzX6WUD8CU3vrrNJ4tuRnPFTV1X764`, source `rpCg5HPCSg1eaeF8fnNBdwG1nAwyuXX3gH`, claim signer public key `EDE165DE…`. Price: 0.05 XRP = `50000` drops per request.

### 1. Server → client: `402`, `PAYMENT-REQUIRED` (raw JSON, before base64)

Both options are offered. The `accepts` array is how this is expressed — it is "Array of payment requirement objects defining acceptable payment methods" ([`x402-specification-v2.md` §5.1.1](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md)).

```json
{
  "x402Version": 2,
  "error": "PAYMENT-SIGNATURE header is required",
  "resource": {
    "url": "https://api.example.com/quotes",
    "description": "Realtime quote lookup",
    "mimeType": "application/json"
  },
  "accepts": [
    {
      "scheme": "batch-settlement",
      "network": "xrpl:1",
      "asset": "XRP",
      "amount": "50000",
      "payTo": "rNWHpzX6WUD8CU3vrrNJ4tuRnPFTV1X764",
      "maxTimeoutSeconds": 60,
      "extra": {
        "paymentFlow": "authorization",
        "areFeesSponsored": false,
        "minChannelAmount": "10000000",
        "minSettleDelay": 3600,
        "maxClaimIntervalSeconds": 900,
        "minRemainingCapacity": "500000",
        "sourceTag": 804681468
      }
    },
    {
      "scheme": "exact",
      "network": "xrpl:1",
      "asset": "XRP",
      "amount": "50000",
      "payTo": "rNWHpzX6WUD8CU3vrrNJ4tuRnPFTV1X764",
      "maxTimeoutSeconds": 60,
      "extra": {
        "areFeesSponsored": false,
        "assetTransferMethod": "sequence",
        "invoiceId": "INV-2026-0918-001"
      }
    }
  ]
}
```

### 2. Client → server: `PAYMENT-SIGNATURE`, steady state (raw JSON, before base64)

`cumulativeAmount` is `3000000 + 50000 = 3050000`. Nothing is broadcast.

```json
{
  "x402Version": 2,
  "resource": { "url": "https://api.example.com/quotes" },
  "accepted": {
    "scheme": "batch-settlement",
    "network": "xrpl:1",
    "asset": "XRP",
    "amount": "50000",
    "payTo": "rNWHpzX6WUD8CU3vrrNJ4tuRnPFTV1X764",
    "maxTimeoutSeconds": 60,
    "extra": {
      "paymentFlow": "authorization",
      "areFeesSponsored": false,
      "minChannelAmount": "10000000",
      "minSettleDelay": 3600,
      "maxClaimIntervalSeconds": 900,
      "minRemainingCapacity": "500000",
      "sourceTag": 804681468
    }
  },
  "payload": {
    "type": "claim",
    "claim": {
      "channelId": "177AE4305EDF4D556A2D867F5D1A11473A2C6946EE2351DD433FD5DBE2605557",
      "cumulativeAmount": "3050000",
      "publicKey": "EDE165DE93DF4FDF329D9426D13137D5FDDC6C166052D630940D94A8BE3F0B8AFB",
      "signature": "<hex signature over 434C4D00 || 177AE430… || 00000000002E8A10>"
    }
  }
}
```

The signed message is the 44 bytes `434C4D00` `177AE4305EDF4D556A2D867F5D1A11473A2C6946EE2351DD433FD5DBE2605557` `00000000002E8A10`, where `0x2E8A10 = 3050000`. That is the entire authorization. It commits to a channel and a running total — nothing else.

### 3. Server → client: `PAYMENT-RESPONSE` (raw JSON, before base64)

```json
{
  "success": true,
  "transaction": "",
  "network": "xrpl:1",
  "payer": "rpCg5HPCSg1eaeF8fnNBdwG1nAwyuXX3gH",
  "amount": "50000",
  "extra": {
    "commitmentId": "177AE4305EDF4D556A2D867F5D1A11473A2C6946EE2351DD433FD5DBE2605557:3050000",
    "remainingCapacity": "6950000"
  }
}
```

### 4. First contact: `type: "open"`

```json
{
  "x402Version": 2,
  "accepted": { "…": "as above" },
  "payload": {
    "type": "open",
    "channelTx": "<hex-encoded client-signed PaymentChannelCreate: Amount=10000000, Destination=rNWHpz…, PublicKey=EDE165DE…, SettleDelay=3600, SourceTag=804681468>",
    "claim": {
      "channelId": "<deterministically derived channel ID>",
      "cumulativeAmount": "50000",
      "publicKey": "EDE165DE93DF4FDF329D9426D13137D5FDDC6C166052D630940D94A8BE3F0B8AFB",
      "signature": "<hex>"
    }
  }
}
```

Response carries a real hash and the first commitment:

```json
{
  "success": true,
  "transaction": "87DE7F799F032BCEE43F194BC4EC7854A5756FCC2A4A3054EE72702BF4952C16",
  "network": "xrpl:1",
  "payer": "rpCg5HPCSg1eaeF8fnNBdwG1nAwyuXX3gH",
  "amount": "50000",
  "extra": {
    "commitmentId": "177AE4305EDF4D556A2D867F5D1A11473A2C6946EE2351DD433FD5DBE2605557:50000",
    "remainingCapacity": "9950000"
  }
}
```

---

## The four design questions, answered

### 1. How does the merchant know a channel exists? It doesn't, and doesn't need to.

The server returns **both** `batch-settlement` and `exact` in `accepts[]` and lets the client choose. This requires no new mechanism: `accepts` is already an array of alternatives, and the core spec already tells clients how to choose among entries — "Clients MUST NOT construct a payment for a `paymentFlow` they do not recognize, and SHOULD skip such `accepts[]` entries when selecting" ([§6.1](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md)).

The client knows whether it holds a channel to this `payTo`; the server does not, and the asymmetry is in the right direction. Fallback to `exact` is automatic: a client with no channel and no appetite for opening one simply picks the `exact` entry.

Servers SHOULD offer both. A server that offers only `batch-settlement` forces every first-time caller through channel creation.

### 2. First contact vs. "zero friction" — the honest answer is that friction is deferred, not removed

The `type: "open"` payload folds channel creation into the same 402 retry that a normal x402 payment uses, so there is **no extra HTTP round trip**. That is the SVM binding's `deposit` variant applied to XRPL.

But there is an extra *ledger* transaction and an extra confirmation wait, roughly 4–5 seconds. So:

| | `exact` | `batch-settlement` (XRPL) |
|---|---|---|
| Request 1 | 1 ledger tx | 1 ledger tx (`PaymentChannelCreate`) |
| Requests 2..N | 1 ledger tx each | **0** |
| Capital committed | per-request only | channel `Amount` + 0.2 XRP reserve, until close |

The collision with x402's zero-friction thesis is real and should be stated in the spec, not papered over: **this scheme is worse than `exact` for a one-shot request and better from roughly the second request onward.** It is a session primitive. That is also exactly what `batch-settlement` is for — "many requests" is in its definition.

Unlike the SVM binding, XRPL cannot sponsor the client's fee here: the `PaymentChannelCreate` fee is charged to the client's `Account`, which is why `areFeesSponsored` MUST be `false`, exactly as in `exact`.

### 3. When may the server return data? Earlier than on EVM, and for a structural reason.

The generic scheme grants access on the commitment: "The commitment is accepted, access is granted immediately, and financial settlement occurs later."

The danger is that the commitment stops being redeemable before the server redeems it. This is a live, open concern upstream — [issue #3464, "Batch-settlement can deliver service before an outstanding voucher is protected on-chain"](https://github.com/x402-foundation/x402/issues/3464) — where an EVM payer can initiate a timed withdrawal and drain a channel whose voucher the server has accepted but not yet claimed.

XRPL's `SettleDelay` addresses this structurally rather than by convention. The source **cannot** empty a non-empty channel immediately: `tfClose` from the source only sets `Expiration` to "the previous ledger's close time plus the `SettleDelay` of the channel" (<https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/paychannel>). During that window the destination can still redeem.

So the rule for the binding is a simple inequality the facilitator enforces at verification time:

```
settle_delay  >=  maxClaimIntervalSeconds  +  redemption_latency_margin
```

and, separately, expiry checks against both `expiration` and `cancel_after` (step 7 above). With those enforced, **the server may return data on an accepted off-ledger claim**, because it holds a ledger-guaranteed window in which to convert that claim to XRP.

This does **not** eliminate the risk. `SettleDelay` is chosen by the client at creation; a server that fails to enforce `minSettleDelay`, or that redeems less often than it promised, is exposed exactly as in #3464. It is a bounded, measurable risk rather than an unbounded one. **We have not tested the `tfClose` race on testnet — the reasoning above is from the specification only. [unverified]**

A server wanting stronger guarantees can redeem every claim immediately, but then it has recreated `exact`'s cost profile and should just use `exact`.

### 4. Reserve economics: 0.2 XRP is not the real cost

The owner reserve is "0.2 XRP per item" against a base reserve of 1 XRP, and payment channels are among the objects that count (<https://xrpl.org/docs/concepts/accounts/reserves>). The same page notes these values move by validator fee voting, so a spec must not hardcode them. This matches the 0.2 XRP we observed on testnet.

Three corrections to the intuitive framing:

**(a) The reserve is locked, not spent.** It is released when the channel closes. Its cost is the opportunity cost of ~0.2 XRP for the channel's lifetime, not 0.2 XRP per channel.

**(b) The bigger lockup is the cap itself.** A channel with `Amount = 10 XRP` immobilizes 10 XRP until it closes, regardless of how little is claimed. At 50× the reserve, this dominates. A client should size `Amount` to its session budget, not to its balance — which is the same discipline this proposal exists to enforce, so the incentive points the right way.

**(c) The fee comparison favors channels almost immediately.** `exact` costs one transaction fee per request. This scheme costs one `PaymentChannelCreate` plus one `PaymentChannelClaim` per redemption batch, amortized over N requests. In pure fee terms the crossover is around N = 3.

The condition under which this is worth it:

```
N × price  ≥  minChannelAmount           (enough volume to justify the cap)
N          ≳  3                          (fee crossover)
session lifetime × 0.2 XRP × opportunity_rate  ≪  N × fee saved
```

Concretely: **an agent making a handful of calls to one provider should use `exact`. An agent making hundreds of calls to one provider over a session should use a channel.** Between those, the reserve and the locked cap make it a wash, and the deciding factor is whether the caller needs a ledger-enforced ceiling — which `exact` cannot give it at any volume.

One reserve subtlety worth putting in the spec: **one channel per (payer, destination) pair**, so an agent authorized to pay five providers needs five channels and 1 XRP of reserve. `Destination` is fixed at creation and no transaction type changes it, which is the property that makes the recipient restriction work — and the same property that makes the reserve scale with the number of counterparties.

---

## Trade-offs

Stated against this proposal, not for it.

**XRP only.** Payment channels are XRP-only (<https://xrpl.org/docs/concepts/payment-types/payment-channels>). `exact` on XRPL supports issued currencies including RLUSD (`scheme_exact_xrpl.md`, "IOU (Issued Currency) Example"). **A merchant pricing in dollars cannot use this scheme.** For a protocol whose dominant use case is stablecoin-denominated API billing, this is the single largest limitation, and no amount of design work in this document removes it. Anyone pricing in RLUSD should use `exact`.

**Capital lockup.** See question 4. `exact` locks nothing.

**Receiver-side implementation burden is materially higher.** `exact` lets a server hand a blob to a facilitator and receive a transaction hash. This scheme requires the server (or its facilitator) to own durable per-channel state — the accepted watermark, the latest claim signature, request correlation — and a background redeemer that submits `PaymentChannelClaim` on schedule and pays its own fees. The SVM binding says the same thing about its own state: those values "cannot be reconstructed from channel accounts." A server that loses this state loses money, silently.

**The server pays the redemption fee.** In `exact`, the payer's fee is embedded in the blob. Here, `PaymentChannelClaim` is sent by the destination, so the server pays. Amortized over a batch this is negligible, but it inverts who bears the cost and belongs in the spec.

**Counterparty bootstrapping.** A server that has never seen this client must accept a `PaymentChannelCreate` it did not choose the parameters of. It can only *reject* — via `minChannelAmount` and `minSettleDelay` — not negotiate. Rejection costs the client a real transaction fee and a real 4–5s round trip. Servers SHOULD publish these bounds in `accepts[].extra` precisely so a client can get it right the first time, and clients SHOULD read them. There is no handshake, and adding one would mean a new round trip.

**The claim message commits to almost nothing.** No expiry, no nonce, no invoice, no network ID inside the signed bytes. The SVM binding's voucher commits to `expiresAt`; this one cannot, because the signed format is fixed by the XRPL protocol. Every binding of a claim to an HTTP request is therefore a server-side bookkeeping convention, not a cryptographic fact. This is a genuine weakening relative to `exact`, where `InvoiceID = SHA-256(invoiceId)` is inside the signed transaction.

**It does not fit one-shot payments,** and offering it for them is a disservice. See question 2.

**Where this scheme is simply the wrong tool:** one-off purchases; stablecoin pricing; clients paying many different providers a small number of times each; any client that cannot keep XRP idle. In all of those, `exact` is better and the answer to "should I use the channel scheme?" is no.

---

## What this does not solve

**It does not bound what the agent spends *within* the cap.** The ledger enforces `cumulativeAmount <= Amount` and `Destination`. Within those, a compromised agent can spend the entire channel immediately. This proposal converts unbounded loss into loss bounded by the channel cap. That is the whole claim, and it should not be overstated — it is a blast radius reduction, not prevention.

**It does not verify what was bought.** The claim commits to a channel and a total, nothing else.

**It does not give invoice binding equivalent to `exact`.** `exact` requires `InvoiceID = SHA-256(invoiceId)` inside the signed transaction and states "Memos MUST NOT be used for invoice binding." There is no comparable field in the claim message. `extra.invoiceId` in this binding can only be server-side correlation. Any implementation claiming cryptographic invoice binding for this scheme would be wrong.

**It does not remove the need to trust the client's key custody.** The claim-signing key is still a key the agent holds. If it leaks, the channel drains to the cap.

**It does not solve RLUSD or any IOU.** See Trade-offs.

**It does not eliminate the #3464 class of risk,** it bounds it with `SettleDelay` and shifts the burden onto the server to enforce `minSettleDelay` and redeem on schedule.

**It does not make the cap immutable.** `PaymentChannelFund` raises `Amount` (<https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelfund>). It is immutable to the *agent*, because only the channel source can send it. Earlier drafts in this repository said "immutable" without qualification; that is imprecise and is corrected here.

---

## Open questions

1. **Channel ID derivation before submission.** The `open` payload needs the channel ID before `PaymentChannelCreate` is validated, so the client must derive it locally. We believe it is a hash over the source account, the destination, and the creating transaction's sequence number, but **we have not confirmed the exact preimage from a primary source and have not tested it. [unverified]** If it is not deterministically derivable pre-submission, the `open` variant needs a second round trip and question 2's answer weakens.

2. **Cross-network claim replay.** The claim message contains no network identifier. `exact` devotes a warning box to exactly this problem for `networkId <= 1024`. Whether channel IDs collide across standard networks in practice needs testing before any binding is submitted.

3. **Does the facilitator role make sense here at all?** For `type: "claim"` there is nothing to submit. The facilitator degrades to a stateful verifier holding the server's watermark — a different trust relationship from `exact`'s stateless blob relay. The SVM binding solves an analogous problem by giving the facilitator a `payee` seat with a zero payout share; XRPL has no equivalent because `Destination` is fixed and singular. **Possibly the server must always self-facilitate on XRPL. [speculation]**

4. **`SettleDelay` floor.** The SVM binding bounds `withdrawDelay` to 900s–2592000s as an x402 conformance rule. An XRPL binding needs an equivalent, and the number should come from measured redemption latency, not from copying Solana's.

5. **Interaction with `upto`.** `upto` also authorizes a maximum and settles actual usage. Whether an XRPL `upto` binding over a single-use channel would serve part of this use case more simply has not been examined here.

6. **Should `exact` gain a `Delegate`-based method instead?** `exact` currently rejects `Delegate`. If `PermissionDelegationV1_1` ever gained amount-scoped permissions, an `assetTransferMethod: "delegate"` might solve the motivating problem inside `exact` and make this whole proposal unnecessary. Today it cannot, because permissions carry no spending limit.

7. **Empirical validation.** The testnet run in this repository proves the ledger enforces the cap. It does **not** prove the x402 flow above works end to end. No implementation of this binding exists. Per the repository `CONTRIBUTING.md`, a reference implementation in one SDK is required before this could progress past a spec PR.

---

## References

**x402 (primary):**
- Core spec v2: <https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md>
- `exact` on XRPL: <https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_xrpl.md>
- `batch-settlement` overview: <https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement.md>
- `batch-settlement` on SVM: <https://github.com/x402-foundation/x402/blob/main/specs/schemes/batch-settlement/scheme_batch_settlement_svm.md>
- HTTP transport v2: <https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/http.md>
- Spec contribution process: <https://github.com/x402-foundation/x402/blob/main/specs/CONTRIBUTING.md>
- Repository contribution process: <https://github.com/x402-foundation/x402/blob/main/CONTRIBUTING.md>
- Issue #3464: <https://github.com/x402-foundation/x402/issues/3464>

**T54 XRPL facilitator:**
- <https://xrpl-x402.t54.ai/docs/xrpl-scheme>

**XRPL (primary):**
- Payment channels concept: <https://xrpl.org/docs/concepts/payment-types/payment-channels>
- `PaymentChannelCreate`: <https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelcreate>
- `PaymentChannelClaim`: <https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelclaim>
- `PaymentChannelFund`: <https://xrpl.org/docs/references/protocol/transactions/types/paymentchannelfund>
- `PayChannel` ledger entry: <https://xrpl.org/docs/references/protocol/ledger-data/ledger-entry-types/paychannel>
- `channel_verify`: <https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/payment-channel-methods/channel_verify>
- `account_channels`: <https://xrpl.org/docs/references/http-websocket-apis/public-api-methods/account-methods/account_channels>
- Reserves: <https://xrpl.org/docs/concepts/accounts/reserves>
- Permission delegation: <https://xrpl.org/docs/concepts/accounts/permission-delegation>

**This repository:**
- Testnet verification log: [`docs/logs/2026-09-18.md`](./logs/2026-09-18.md)
- Claim encoding verified locally against `xrpl@5.3.0` and `ripple-binary-codec`

---

## 日本語要約

### 何を提案しているか

x402 の XRPL 向け `exact` スキームは、署名済みの `Payment` トランザクションしか受け付けない
（`scheme_exact_xrpl.md` 検証ルール §3: `TransactionType` MUST equal `"Payment"`）。
`Payment` に署名できる鍵は口座全体を操作できる鍵であり、XRPL には金額上限を付けて
権限を委譲する手段がない（公式ドキュメントに「支出上限のカスタマイズはできない」と明記）。
したがって **x402 でエージェントに払わせるには、口座の署名権を渡すしかない。**
上限はアプリのコードが守っているだけになる。

Payment Channel なら、`Amount`（上限）と `Destination`（支払先）が作成時に固定され、
`PublicKey` に登録した**口座権限を持たない鍵**でクレームに署名できる。
上限超過を拒否するのは台帳自身である（testnet で `tecUNFUNDED_PAYMENT` を実測）。

### 重要な方針転換

当初は `paychannel` という**新しいスキーム**を提案する予定だったが、
調査の結果 **それは誤りだと判断した。**

x402 には既に `batch-settlement` スキームがあり、その仕様書本文が
ユースケースとして **「Payment channel streaming」を名指ししている。**
さらに Solana 版 `scheme_batch_settlement_svm.md` は、実際に
ペイメントチャネルのバインディングそのものである。

よって正しい成果物は新スキームではなく、既存スキームのネットワークバインディング
`specs/schemes/batch-settlement/scheme_batch_settlement_xrpl.md` である。
自分の名前を通すより、標準の作法に従うほうが提案として強い。

### 4つの設計論点への回答

1. **チャネルの有無を merchant はどう知るか** → 知る必要がない。
   402 の `accepts` 配列に `batch-settlement` と `exact` を両方載せ、
   クライアントに選ばせる。`accepts` は元々「受け入れ可能な支払方法の配列」であり、
   新しい仕組みは要らない。チャネルが無ければ `exact` に自動的に落ちる。

2. **初回の摩擦** → HTTP の往復は増えない（`open` ペイロードが
   `PaymentChannelCreate` を同じリクエストに同梱する）。
   ただし**台帳トランザクション1本と約4〜5秒は確実に増える。**
   正直に書くべき結論は「1回きりの支払いには `exact` より劣り、
   2回目以降で逆転する」。これはセッション用の道具である。

3. **merchant はいつデータを返してよいか** → `SettleDelay` があるため、
   EVM 版より構造的に安全。送金元が `tfClose` を打っても、
   `Expiration` は「直前の台帳の close time + SettleDelay」にしかならず、
   その間 destination は換金できる（一次ソースで確認）。
   よって `settle_delay >= maxClaimIntervalSeconds + 余裕` を検証時に強制すれば、
   **オフレジャーのクレーム受領時点でデータを返してよい。**
   なお EVM 版では同じ問題が未解決の issue #3464 として残っている。
   ただし本件の tfClose 競合は testnet 未検証であり、仕様書からの推論である。

4. **準備金** → 0.2 XRP は**ロックであって消費ではない**（閉じれば戻る）。
   実際に効くコストは準備金ではなく**上限額そのもののロック**（10 XRP なら 10 XRP）。
   手数料の損益分岐は N ≈ 3 回。実務的な結論は
   「1プロバイダに数回 → `exact`。1プロバイダに数百回 → チャネル」。
   支払先ごとに1本必要なので、承認済み支払先5件なら準備金 1 XRP。

### 正直に書いた限界

- **XRP 限定。RLUSD / IOU では使えない。** `exact` は IOU に対応しているので、
  ドル建てで課金する merchant はこのスキームを使えない。**最大の制約。**
- **上限内であれば乗っ取られたエージェントは即座に使い切れる。**
  防いでいるのは被害の上限であって、被害そのものではない。
- **`Amount` は「不変」ではない。** `PaymentChannelFund` で増額できる。
  ただし送れるのはチャネルの送金元だけなので、**エージェントには増やせない。**
  本リポジトリの過去の記述「変更不可」は不正確であり、ここで訂正した。
- **請求書（invoiceId）の暗号的な紐付けができない。** クレームの署名対象は
  `CLM\0 || channelId || 累計額` の44バイトのみで、有効期限も nonce も入らない。
  `exact` は `InvoiceID = SHA-256(invoiceId)` を署名対象に含められるので、この点は劣る。
- **受取側（merchant）の実装負担が明確に重い。** チャネルごとの累計額を
  永続化し、定期的に換金するバックグラウンド処理が必須。状態を失うと損をする。
- **換金手数料は merchant が払う。** `exact` では payer が払う。負担が逆転する。

### 未確認事項

チャネルIDの事前導出方法、クレームのネットワーク間リプレイ、
XRPL で facilitator 役が成立するか、の3点は未検証。
本提案の実装は存在せず、上流の手順上、仕様PRの次に
リファレンス実装が1SDK分必要になる。
