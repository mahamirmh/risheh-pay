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
- ✅ Production-safe Vercel configuration
- ✅ Fail-fast روی نبودن API URL در Production
- ✅ Demo Mode فقط به‌صورت Explicit و Opt-in

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

artifacts/
└── review-redesign/
    ├── rishehpayfixreviewredesign.patch
    └── rishehpayfixreviewredesign.bundle
```

---

## 🔐 Security & Reliability

- جلوگیری از double-purchase و double-refund با State Machine، locking و idempotency
- Encryption داده تحویلی در حالت at-rest با Fernet
- Audit کردن reveal/access رویدادهای حساس
- Admin API پشت API Key
- Explicit CORS allow-list
- Content Security Policy برای Web
- Redis Rate Limiting با fail-open behavior
- Integration tests برای endpointهای واقعی
- Production build بدون `NEXT_PUBLIC_API_URL` fail می‌شود
- قطع Backend در Production دیگر به Fake/Demo Order تبدیل نمی‌شود

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
npm ci
npm run dev
```

### API tests

```bash
cd apps/api
pip install -e '.[dev]'
pytest
```

---

## 🚀 Vercel Production Deployment

Canonical setup پیشنهادی:

```text
Root Directory = apps/web
Framework = Next.js
Install Command = npm ci
Build Command = npm run build
```

برای سازگاری با پروژه‌هایی که Root Directory هنوز روی repository root تنظیم شده، فایل `/vercel.json` نیز build را به `apps/web` هدایت می‌کند.

### Environment Variables ضروری Web

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

قوانین:

- `NEXT_PUBLIC_API_URL` در production اجباری است.
- `NEXT_PUBLIC_ENABLE_DEMO_MODE=false` برای هر محیطی که پرداخت واقعی دارد الزامی است.
- Demo Mode فقط برای Preview/Demo مستقل و با مقدار `true` قابل فعال‌سازی است.
- Backend، PostgreSQL و Redis روی Vercel Frontend deploy نمی‌شوند و باید سرویس مستقل داشته باشند.

---

## ⚙️ Backend Production Environment

حداقل تنظیمات لازم:

```env
APP_ENV=production
APP_SECRET_KEY=<strong-secret>
DATABASE_URL=<production-postgres-url>
REDIS_URL=<production-redis-url>
CORS_ORIGINS=["https://your-frontend-domain"]
DELIVERY_ENCRYPTION_KEY=<strong-secret>
ADMIN_API_KEY=<strong-secret>
PAYMENT_CALLBACK_URL=https://api.example.com/api/v1/payments/callback
```

در صورت استفاده از Provider و Payment واقعی، credentialهای مربوط نیز فقط از Secret Manager / Environment دریافت شوند.

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
| Frontend Hosting | Vercel |
| CI | GitHub Actions |

---

## ✅ Production Checklist

- [ ] `NEXT_PUBLIC_API_URL` روی Vercel Production تنظیم شده
- [ ] `NEXT_PUBLIC_ENABLE_DEMO_MODE=false` روی Production تنظیم شده
- [ ] Secretها در Environment/Secret Manager تنظیم شده‌اند
- [ ] `DELIVERY_ENCRYPTION_KEY` تولید و امن نگهداری شده
- [ ] `ADMIN_API_KEY` روی Production تنظیم شده
- [ ] CORS فقط Origin واقعی Frontend را مجاز می‌کند
- [ ] PostgreSQL migration روی دیتابیس تمیز تست شده
- [ ] Redis availability بررسی شده
- [ ] API Integration Tests پاس شده‌اند
- [ ] Web build و smoke test پاس شده‌اند
- [ ] Payment callback روی دامنه واقعی تست شده
- [ ] Backup، monitoring و alerting فعال شده‌اند
- [ ] Runtime backend outage باعث Demo Checkout نمی‌شود

---

## 🧩 Review / Redesign Handoff Artifacts

نسخه‌های Patch و Bundle مربوط به مرحله Fix + Review + Redesign داخل این مسیر نگهداری می‌شوند:

```text
artifacts/review-redesign/
```

این artifactها برای recovery، audit و handoff هستند و تغییرات اصلی آن‌ها قبلاً روی `main` اعمال شده است؛ برای اجرای عادی پروژه نیازی به apply مجدد آن‌ها نیست.

---

Built with ❤️ by **Risheh Digital**
