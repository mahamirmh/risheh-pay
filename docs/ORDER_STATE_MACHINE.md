# Order State Machine

## States

```text
CREATED
  -> PREFLIGHT_OK
  -> PAYMENT_PENDING
  -> PAID
  -> FULFILLMENT_PENDING
  -> PROCESSING
       -> DELIVERED
       -> RETRYING -> PROCESSING
       -> RECONCILIATION_REQUIRED
       -> FULFILLMENT_FAILED -> REFUND_PENDING -> REFUNDED
```

Terminal states: `DELIVERED`, `REFUNDED`, `CANCELLED`.

## Rules
- An order cannot enter `PAID` from an unverified client redirect; only verified gateway evidence can do it.
- `PAID` must enqueue fulfillment exactly once logically, even if callbacks are duplicated.
- A provider timeout after a purchase request is **not** immediately retryable: outcome may be unknown and duplicate purchase could charge twice. Move to reconciliation first unless provider guarantees idempotency.
- Digital code delivery only occurs after a successful provider transaction is persisted.
- Refund initiation is idempotent.

## Failure policy

| Situation | Action |
|---|---|
| Provider unhealthy before payment | Disable checkout / reject preflight |
| Product unavailable before payment | Reject preflight |
| Price changed before payment | Expire quote and re-quote |
| Duplicate payment callback | Return existing result; no duplicate fulfillment |
| Provider deterministic rejection | Fail fulfillment and start recovery |
| Provider timeout / unknown outcome | Reconcile provider transaction before retry |
| Worker/server restart | Resume from persisted state/job |
| Refund callback duplicated | Idempotently retain final refund state |

## Required identifiers
- internal order UUID
- immutable quote ID
- payment idempotency/reference key
- provider idempotency key when supported
- provider transaction/reference ID
- fulfillment attempt ID

Every transition writes an audit event with actor/system, prior state, next state, timestamp and correlation ID.
