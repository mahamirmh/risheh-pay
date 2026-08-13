# PRD — Transaction-Safe MVP

## Problem
Iranian customers need a simple way to purchase supported international digital goods with local pricing and receive fulfillment quickly. The platform must not create uncontrolled customer liabilities when a provider fails after payment.

## MVP outcome
A customer can discover a supported gift card, choose region and denomination, receive a time-limited rial quote, pay, and either receive the code automatically or enter a controlled recovery/refund path with complete operational visibility.

## Primary personas
- Customer: wants fast, clear, trustworthy purchase and delivery.
- Operator/Admin: manages catalog, pricing, providers, orders and incidents.
- Finance/Ops: reconciles payments, provider costs, refunds and margin.

## Customer scope
- RTL/mobile-first storefront
- search/category/brand discovery
- region and redemption warnings
- denominations
- availability indicator based on recent provider state
- rial quote with expiration
- checkout and payment
- order status timeline
- secure code reveal/copy
- redemption instructions
- order history
- recovery/refund status

## Admin scope
- operational dashboard
- orders and state timeline
- payment/provider references
- provider health and optional balance
- catalog mapping and enable/disable
- exchange rate and margin rules
- fulfillment attempts
- refund queue/status
- audit log

## Out of scope for V1
- multi-vendor marketplace
- VPN/accounts resale
- AI conversational search
- eSIM/mobile top-up unless validated as the first provider capability
- loyalty/gamification
- advanced referral system

## Success gates before public launch
- provider API validated against real/sandbox documentation
- payment verification tested
- duplicate callback test passes
- provider timeout/unknown-outcome test passes
- out-of-stock race handled
- restart during fulfillment test passes
- refund/recovery path tested
- no secrets in client bundle/repository
- monitoring/alerts active
- controlled low-value pilot reconciled transaction-by-transaction

## Product principles
1. Complexity stays behind the UI.
2. Region restrictions are explicit before payment.
3. Final rial price is clear before checkout.
4. Delivery status is truthful; never show delivered before fulfillment is confirmed.
5. Failure states are designed, not treated as exceptions.
