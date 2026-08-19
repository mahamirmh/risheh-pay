# 💳 Risheh Pay

> زیرساخت فروش، پرداخت و تحویل آنی محصولات دیجیتال با معماری Transaction-Safe

**Risheh Pay** یک پلتفرم Full-Stack برای فروش محصولات دیجیتال بین‌المللی است؛ از انتخاب محصول و محاسبه قیمت ریالی تا پرداخت، خرید از Provider، تحویل خودکار و مدیریت خطا/Refund.

---

## ✨ وضعیت پروژه

- ✅ Storefront با Next.js + TypeScript
- ✅ Backend با FastAPI
- ✅ PostgreSQL + Redis
- ✅ Docker Compose برای اجرای Full Stack
- ✅ Health / Readiness checks
- ✅ GitHub Actions برای API و Web
- ✅ ساختار Transaction-Safe برای Checkout و Fulfillment
- ✅ Order State Machine + کنترل Retry/Idempotency
- ✅ Delivery Encryption با `DELIVERY_ENCRYPTION_KEY`
- ✅ Admin API محافظت‌شده با `ADMIN_API_KEY`
- ✅ Redis-backed Rate Limiting
- ✅ Category discovery و Product filtering
- ✅ Integration Test برای مسیرهای واقعی API
- ✅ تنظیمات Vercel برای Frontend

---

## 🧭 Core Flow

```text
Customer
   ↓
Product Selection
   ↓
Availability Check
   ↓
Rial Pricing / Quote
   ↓
Order Creation
   ↓
Payment
   ↓
Payment Verification
   ↓
Provider Purchase
   ↓
Automatic Fulfillment
   ↓
Encrypted Digital Delivery
   ↓
Reveal + Audit Log
```

### اصل مهم معماری

> **Payment Success ≠ Order Delivered**

پرداخت و تحویل دو مرحله مستقل هستند. بنابراین سیستم باید Retry، Provider Failure، Duplicate Request، Refund و Recovery را بدون ایجاد خرید یا بازپرداخت تکراری مدیریت کند.

---

## 🏗️ Repository Structure

```text
apps/
├── api/       # FastAPI + PostgreSQL + Redis + payment/fulfillment adapters
└── web/       # Next.js storefront

.github/workflows/
├── api-ci.yml
└── web-ci.yml
```

---

## 🧩 Review / Redesign Handoff Artifacts

برای بازبینی فنی و انتقال تغییرات مرحله Fix + Review + Redesign دو artifact همراه پروژه در نظر گرفته شده‌اند:

```text
risheh-pay-fix-review-redesign.patch
risheh-pay-fix-review-redesign.bundle
```

این بسته تغییرات روی commit مبنای زیر ساخته شده است:

```text
9ee1144215b1db4b7f6876f9626e9168f25b86d5
```

و شامل اصلاحات Checkout/Migration، Security/RBAC، Rate Limiting، Integration Tests و بازطراحی Storefront است.

### اعمال Patch

```bash
git checkout main
git pull
git am risheh-pay-fix-review-redesign.patch
```

### استفاده از Bundle

```bash
git bundle verify risheh-pay-fix-review-redesign.bundle
git fetch risheh-pay-fix-review-redesign.bundle fix/review-redesign-storefront:fix/review-redesign-storefront
git checkout fix/review-redesign-storefront
```

> قبل از اعمال artifactها مطمئن شوید HEAD پروژه با commit مبنا سازگار است یا تغییرات را ابتدا روی یک branch جداگانه بررسی کنید.

---

## 🔐 Security & Reliability

نسخه Review/Redesign این موارد را پوشش می‌دهد:

- جلوگیری از double-purchase و double-refund با State Machine، locking و idempotency
- Encryption داده تحویلی در حالت at-rest با Fernet
- Audit کردن reveal/access رویدادهای حساس
- Admin API پشت API Key
- Explicit CORS allow-list
- Content Security Policy برای Web
- Redis Rate Limiting با fail-open behavior
- Integration tests برای endpointهای واقعی

متغیرهای مهم محیطی:

```env
DELIVERY_ENCRYPTION_KEY=
ADMIN_API_KEY=
DATABASE_URL=
REDIS_URL=
PAYMENT_SECRET=
PAYMENT_CALLBACK_URL=
```

هیچ Secret واقعی نباید داخل Git یا README ذخیره شود.

---

## 🧪 Local Development

### Full Stack

```bash
docker compose up --build
```

سرویس‌ها:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Web: `http://localhost:3000`

### Web only

```bash
cd apps/web
npm install
npm run dev
```

### API tests

```bash
cd apps/api
pip install -e '.[dev]'
pytest
```

---

## 🚀 Vercel

برای Deploy فرانت‌اند در Vercel:

```text
Root Directory = apps/web
```

Backend و سرویس‌های stateful مانند PostgreSQL/Redis باید جداگانه Deploy شوند.

---

## 🧰 Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| Cache / Rate Limit | Redis |
| Migrations | Alembic |
| Delivery Security | Fernet / Cryptography |
| Infrastructure | Docker Compose |
| CI | GitHub Actions |

---

## ✅ Production Checklist

- [ ] Secretها در Environment/Secret Manager تنظیم شوند
- [ ] `DELIVERY_ENCRYPTION_KEY` تولید و امن نگهداری شود
- [ ] `ADMIN_API_KEY` روی Production تنظیم شود
- [ ] CORS فقط برای Originهای واقعی Production تنظیم شود
- [ ] PostgreSQL migration روی دیتابیس تمیز تست شود
- [ ] Redis availability بررسی شود
- [ ] API Integration Tests پاس شوند
- [ ] Web build و smoke test پاس شوند
- [ ] Payment callback روی دامنه واقعی تست شود
- [ ] Backup، monitoring و alerting فعال شوند

---

Built with ❤️ by **Risheh Digital**
