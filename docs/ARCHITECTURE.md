# Architecture — Risheh Digital Goods

## Decision
MVP uses a **modular monolith + asynchronous fulfillment worker**. This keeps deployment and transactions simple while preserving domain boundaries that can later become services.

## System context

```text
Customer PWA        Admin
     \               /
      \             /
       Edge / WAF / TLS
              |
          FastAPI API
              |
       Order Orchestrator
        /      |       \
 Catalog    Payment   Fulfillment
   |           |          |
Pricing    Gateway     Provider Gateway
                         /   |    \
                       Mock  A   Future
              |
       PostgreSQL + Redis
              |
         Async Worker
```

## Domains
- Identity & access
- Catalog
- Pricing & quotes
- Checkout
- Orders
- Payments
- Fulfillment
- Providers
- Wallet / ledger
- Refunds
- Notifications
- Audit & operations

## Core invariants
1. Payment success never directly means delivery success.
2. Every external mutation has an idempotency key.
3. Provider responses with unknown outcome are reconciled before retrying purchase.
4. Checkout performs a preflight availability/health check, but fulfillment still handles race conditions.
5. Money movements are append-only ledger entries.
6. Provider and payment credentials remain server-side.
7. Delivered secrets are encrypted at rest and access is audited.

## Provider boundary

```text
DigitalGoodsProvider
- list_products()
- get_product()
- check_availability()
- quote_cost()
- purchase(idempotency_key)
- get_order_status()
- get_balance()   # optional capability
```

The application never imports provider-specific response shapes outside the provider adapter.

## Payment boundary

```text
PaymentProvider
- create_payment()
- verify_callback()
- query_payment()
- refund()        # when supported
```

Callbacks are authenticated and idempotent.

## Data
PostgreSQL is the source of truth. Redis is used for cache, short-lived locks, rate limiting and async job transport. No financial source of truth lives only in Redis.

Core tables planned: users, products, product_variants, providers, provider_products, exchange_rates, pricing_rules, quotes, orders, payments, fulfillment_attempts, digital_deliveries, refunds, wallet_accounts, ledger_entries, audit_logs.

## Deployment
- `apps/web`: customer Next.js PWA
- `apps/admin`: operations UI
- `apps/api`: FastAPI modular monolith
- `apps/worker`: fulfillment/reconciliation jobs
- PostgreSQL
- Redis
- object storage for non-secret documents/exports

All deployable components are containerized. Production secrets are injected by the deployment platform, never committed.

## Scale path
Extract services only when operational evidence requires it. Likely first extraction candidates: fulfillment/provider gateway, notifications, catalog sync. Orders/payments/ledger remain strongly consistent for as long as practical.
