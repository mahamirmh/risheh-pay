# Security Baseline

## Secrets
- Never expose provider/payment credentials to browser code.
- Never commit `.env` files or real credentials.
- Production credentials are injected from a secrets manager/deployment environment.
- Rotate credentials and revoke immediately on suspected exposure.

## Payments
- Trust only server-side verification/webhook evidence.
- Authenticate callbacks according to gateway specification.
- Use idempotency and unique DB constraints to prevent duplicate processing.
- Record raw provider/gateway identifiers needed for reconciliation without logging sensitive secrets.

## Digital goods
- Treat gift-card codes as secrets.
- Encrypt delivery payloads at rest using an application-managed encryption key stored outside the database.
- Never write full codes to logs, analytics or error tracking.
- Audit code reveal/access events.

## Application
- TLS everywhere in production.
- Secure/HttpOnly/SameSite cookies where cookie auth is used.
- RBAC for admin functions.
- Rate limiting on auth, checkout, payment and reveal endpoints.
- Strict input validation and output schemas.
- CSRF protection where relevant to the chosen auth model.
- Content Security Policy and security headers.

## Operations
- Separate development/staging/production credentials.
- Least-privilege database and infrastructure accounts.
- Backups and restore drills.
- Dependency and container scanning in CI.
- Alert on provider failure spikes, payment verification anomalies, refund backlog and suspicious code-reveal behavior.

## Repository rule
Real API keys, payment secrets, personal data and issued gift-card codes are prohibited from Git history, fixtures and screenshots.
