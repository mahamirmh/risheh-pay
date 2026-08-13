# Risheh Digital Goods

پلتفرم هوشمند فروش و تحویل آنی محصولات دیجیتال بین‌المللی.

## وضعیت فعلی

- ✅ Next.js storefront در `apps/web`
- ✅ FastAPI backend در `apps/api`
- ✅ PostgreSQL + Redis در Docker Compose
- ✅ `/health` برای liveness
- ✅ `/ready` برای بررسی واقعی PostgreSQL و Redis
- ✅ CI برای API و Web
- ✅ تنظیمات Vercel برای deploy فرانت‌اند

## Core Flow

Customer → Product Selection → Availability Check → Rial Pricing → Payment → Payment Verification → Provider API → Automatic Fulfillment → Instant Digital Delivery

## Transaction-Safe Architecture

> Payment Success ≠ Order Delivered

پرداخت و تحویل دو مرحله مستقل هستند و سیستم باید Failure، Retry، Refund و Provider Failover را مدیریت کند.

## Repository Structure

```text
apps/
├── api/       # FastAPI, PostgreSQL, Redis, fulfillment/payment adapters
└── web/       # Next.js mobile-first storefront

.github/workflows/
├── api-ci.yml
└── web-ci.yml
```

## Local Development

### Full stack

```bash
docker compose up --build
```

API: `http://localhost:8000`  
Swagger: `http://localhost:8000/docs`

### Web

```bash
cd apps/web
npm install
npm run dev
```

Web: `http://localhost:3000`

## Vercel

برای پروژه Vercel، Root Directory را روی `apps/web` قرار بده. فایل `vercel.json` نیز build/install را برای همین workspace تنظیم کرده است.

## Stack

- Next.js + TypeScript
- FastAPI + Python
- PostgreSQL
- Redis
- Docker
- GitHub Actions

Built by Risheh Digital.
