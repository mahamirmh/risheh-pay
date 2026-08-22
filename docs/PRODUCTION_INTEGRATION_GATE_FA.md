# 🔒 Production Integration Gate — Risheh Pay

## وضعیت فعلی

زیرساخت VPS، Docker، شبکه، Reverse Proxy، Healthcheck، Backup و Production Environment آماده شده‌اند؛ اما این revision از Backend هنوز فقط این adapterها را دارد:

- `app/payments/mock.py`
- `app/providers/mock.py`

و در `app/api.py` نیز همین Mock adapterها مستقیماً wire شده‌اند.

بنابراین **Production مالی عمداً در startup مسدود شده است**. این محدودیت یک باگ نیست؛ یک Safety Gate است تا هیچ محیطی با `APP_ENV=production` در حالی که پرداخت یا تحویل واقعی وجود ندارد، به اشتباه فعال نشود.

## چه زمانی Gate برداشته می‌شود؟

Gate فقط در همان Pull Request / Commitی باید برداشته شود که همه موارد زیر را اضافه و تست می‌کند:

1. Payment Provider واقعی
2. Digital Goods Provider واقعی
3. Credential validation
4. Payment initiation واقعی
5. Callback / Webhook verification
6. Signature validation یا روش احراز اصالت Provider
7. Idempotency روی callback
8. Refund واقعی
9. Product mapping واقعی بین Catalog داخلی و Provider
10. Fulfillment واقعی
11. Sandbox integration tests
12. Failure / timeout / retry tests
13. Duplicate callback tests
14. End-to-end staging transaction
15. Monitoring و alerting برای failureهای مالی

## چرا adapter واقعی در این مرحله ساخته نشده؟

API درگاه پرداخت و API تأمین‌کننده محصول باید بر اساس مستندات و credential واقعی همان سرویس پیاده‌سازی شوند. ساخت adapter فرضی یا حدس‌زدن endpoint، signature، callback و refund contract برای یک سامانه مالی ناامن است.

## چیزی که همین حالا قابل Deploy است

پروژه را می‌توان روی VPS به‌عنوان **Staging / Infrastructure Validation Environment** بالا آورد و موارد زیر را تست کرد:

- Docker build
- PostgreSQL
- Redis
- Alembic migrations
- Next.js
- FastAPI
- Reverse Proxy
- TLS
- Healthchecks
- Backup / Restore
- Mock checkout flow

برای این محیط باید `APP_ENV` مقدار `staging` یا `development` داشته باشد و به هیچ عنوان برای دریافت پول واقعی استفاده نشود.

## Definition of Done برای Production مالی

Production مالی فقط زمانی مجاز است که:

```text
Real Payment Adapter
        +
Real Goods Provider Adapter
        +
Verified Callback Security
        +
Sandbox E2E Pass
        +
Backup / Restore Pass
        +
Monitoring / Alerting
        =
Financial Production Ready
```
