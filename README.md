# 💳 Risheh Pay

> زیرساخت فروش، پرداخت و تحویل آنی محصولات دیجیتال با معماری Transaction-Safe

**Risheh Pay** یک پلتفرم Full-Stack برای فروش محصولات دیجیتال است؛ از انتخاب محصول و محاسبه قیمت تا پرداخت، خرید از Provider، تحویل خودکار و مدیریت خطا، Retry و Refund.

---

## ✨ وضعیت پروژه

- ✅ Storefront با Next.js + TypeScript
- ✅ Backend با FastAPI
- ✅ PostgreSQL + Redis
- ✅ Docker Compose برای Development Backend
- ✅ Docker Compose مستقل و Hardened برای VPS Production
- ✅ Docker image مستقل Next.js با Standalone Output
- ✅ Nginx Reverse Proxy داخلی
- ✅ Health / Readiness checks برای API، Web، DB، Redis و Proxy
- ✅ PostgreSQL Migration با Alembic
- ✅ GitHub Actions برای API و Web
- ✅ ساختار Transaction-Safe برای Checkout و Fulfillment
- ✅ Order State Machine + Retry / Idempotency
- ✅ Delivery Encryption با `DELIVERY_ENCRYPTION_KEY`
- ✅ Admin API محافظت‌شده با `ADMIN_API_KEY`
- ✅ Redis-backed Rate Limiting
- ✅ Redis Password در Production
- ✅ Explicit CORS allow-list
- ✅ Fail-fast روی نبودن API URL در Production
- ✅ Demo Mode فقط به‌صورت Explicit و Opt-in
- ✅ Demo Catalog در Production غیرفعال و Fail-fast
- ✅ Guarded Production Deploy Script
- ✅ PostgreSQL Backup + Retention Script
- ✅ راهنمای کامل VPS + TLS + Backup + Rollback

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

پرداخت و تحویل دو مرحله مستقل هستند. سیستم باید Provider Failure، Duplicate Callback، Retry، Refund و Recovery را بدون خرید یا بازپرداخت تکراری مدیریت کند.

---

## 🏗️ Production Architecture

```text
Internet
   ↓
DNS / Cloudflare
   ↓
Host Nginx :443 + Let's Encrypt
   ↓
127.0.0.1:8080
   ↓
Docker Nginx
   ├── /api/* → FastAPI :8000
   └── /*      → Next.js :3000
                    │
FastAPI ────────────┼── PostgreSQL (private)
                    └── Redis (private + password)
```

PostgreSQL، Redis، FastAPI و Next.js در Production مستقیماً روی اینترنت expose نمی‌شوند.

---

## 🗂️ Repository Structure

```text
apps/
├── api/
│   ├── app/
│   ├── alembic/
│   └── Dockerfile
└── web/
    ├── app/
    ├── components/
    ├── lib/
    └── Dockerfile

deploy/
└── nginx/
    ├── default.conf
    └── host-risheh-pay.conf.example

scripts/
├── deploy-prod.sh
└── backup-postgres.sh

docs/
└── DEPLOYMENT_VPS_FA.md

docker-compose.yml
├── Development backend stack

docker-compose.prod.yml
└── Production full stack
```

---

## 🔐 Security & Reliability

- جلوگیری از double-purchase و double-refund با State Machine، locking و idempotency
- Encryption داده تحویلی at-rest
- Audit کردن reveal/access رویدادهای حساس
- Admin API پشت API Key
- Explicit CORS allow-list
- Content Security Policy برای Web
- PostgreSQL بدون public port
- Redis بدون public port + password
- Docker internal network برای data layer
- `no-new-privileges` روی containerهای Production
- Production build بدون `NEXT_PUBLIC_API_URL` fail می‌شود
- Production deploy با Providerهای `mock` عمداً fail می‌شود
- `SEED_DEMO_CATALOG=true` در `APP_ENV=production` عمداً API را متوقف می‌کند
- Runtime backend outage به Fake/Demo Checkout تبدیل نمی‌شود

هیچ Secret واقعی نباید داخل Git، README، issue یا artifact ذخیره شود.

---

## 🧪 Local Development

### Backend stack

```bash
docker compose up --build
```

سرویس‌های Development Compose:

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- PostgreSQL
- Redis

### Web

```bash
cd apps/web
npm ci
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

### API tests

```bash
cd apps/api
pip install -e '.[dev]'
pytest
```

---

## 🚀 VPS Production Deployment

راهنمای مرجع:

**[`docs/DEPLOYMENT_VPS_FA.md`](docs/DEPLOYMENT_VPS_FA.md)**

### 1. ساخت env

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

### 2. اجرای Production Gate + Deploy

```bash
chmod +x scripts/deploy-prod.sh scripts/backup-postgres.sh
./scripts/deploy-prod.sh
```

`deploy-prod.sh` انتشار را متوقف می‌کند اگر:

- secret یا متغیر ضروری خالی باشد؛
- placeholder از نوع `CHANGE_ME` باقی مانده باشد؛
- `APP_ENV` برابر production نباشد؛
- Demo Mode روشن باشد؛
- Demo Catalog روشن باشد؛
- Payment Provider برابر `mock` باشد؛
- Digital Goods Provider برابر `mock` باشد؛
- Compose validation یا healthcheck شکست بخورد.

### 3. بررسی وضعیت

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl http://127.0.0.1:8080/healthz
```

---

## 💾 Backup

```bash
./scripts/backup-postgres.sh
```

Backupها به‌صورت gzip + SHA-256 در مسیر زیر ایجاد می‌شوند:

```text
backups/postgres/
```

Retention پیش‌فرض: **14 روز**.

> برای Disaster Recovery حداقل یک نسخه backup باید خارج از همان VPS نگهداری شود.

---

## ⚙️ Environment Production

حداقل متغیرهای حیاتی:

```env
APP_ENV=production
SEED_DEMO_CATALOG=false
NEXT_PUBLIC_ENABLE_DEMO_MODE=false

POSTGRES_PASSWORD=<strong-secret>
REDIS_PASSWORD=<strong-secret>
DATABASE_URL=<production-url>
REDIS_URL=<production-url>

APP_SECRET_KEY=<strong-secret>
DELIVERY_ENCRYPTION_KEY=<strong-secret>
ADMIN_API_KEY=<strong-secret>

NEXT_PUBLIC_API_URL=https://your-domain.example
CORS_ORIGINS=["https://your-domain.example"]
PAYMENT_CALLBACK_URL=https://your-domain.example/api/v1/payments/callback

PAYMENT_PROVIDER=<real-provider>
DIGITAL_GOODS_PROVIDER=<real-provider>
```

فایل مرجع: [`.env.production.example`](.env.production.example)

---

## 🌐 Frontend روی Vercel — اختیاری

اگر Frontend به‌جای VPS روی Vercel قرار بگیرد:

```text
Root Directory = apps/web
Framework = Next.js
Install Command = npm ci
Build Command = npm run build
```

Environment:

```env
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ENABLE_DEMO_MODE=false
```

Backend، PostgreSQL و Redis همچنان باید سرویس مستقل داشته باشند.

---

## 🧰 Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.12 |
| Database | PostgreSQL 17 |
| Cache / Rate Limit | Redis 7 |
| Migrations | Alembic |
| Delivery Security | Fernet / Cryptography |
| Containers | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| TLS | Let's Encrypt / Certbot |
| CI | GitHub Actions |

---

## ✅ Production Gate

قبل از فعال‌کردن پرداخت واقعی:

- [ ] Domain و HTTPS معتبر
- [ ] تمام secretها واقعی و خارج Git
- [ ] `SEED_DEMO_CATALOG=false`
- [ ] `NEXT_PUBLIC_ENABLE_DEMO_MODE=false`
- [ ] Payment Provider واقعی
- [ ] Digital Goods Provider واقعی
- [ ] CORS محدود به دامنه واقعی
- [ ] PostgreSQL migration موفق
- [ ] همه containerها Healthy
- [ ] Payment callback روی دامنه واقعی تست شده
- [ ] Sandbox payment end-to-end موفق
- [ ] Duplicate callback / Idempotency تست شده
- [ ] Fulfillment failure / Retry تست شده
- [ ] Backup موفق
- [ ] Restore آزمایشی موفق
- [ ] Monitoring و Alerting فعال

تا قبل از پاس شدن این Gateها محیط باید **Staging** در نظر گرفته شود، نه Production مالی.

---

## 🧩 Review / Redesign Handoff Artifacts

Artifactهای Audit و Recovery در این مسیر نگهداری می‌شوند:

```text
artifacts/review-redesign/
```

برای اجرای عادی پروژه نیازی به apply مجدد آن‌ها نیست.

---

Built with ❤️ by **Risheh Digital**
