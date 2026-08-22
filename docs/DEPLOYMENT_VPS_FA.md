# 🚀 راهنمای استقرار Production روی VPS — Risheh Pay

این سند مسیر مرجع استقرار Risheh Pay روی یک VPS لینوکسی با Docker، Nginx و TLS است.

> نکته حیاتی: تا زمانی که Payment Provider و Digital Goods Provider واقعی تنظیم نشده‌اند، سامانه برای دریافت پول واقعی Production-ready محسوب نمی‌شود. اسکریپت deploy عمداً Providerهای `mock` را رد می‌کند.

---

## 1) معماری Production

```text
Internet
   ↓
DNS / Cloudflare (اختیاری)
   ↓
Host Nginx :443 + Let's Encrypt
   ↓
127.0.0.1:8080
   ↓
Docker Nginx (proxy)
   ├── /api/* → FastAPI :8000
   └── /*      → Next.js :3000
                   │
FastAPI ───────────┼── PostgreSQL :5432 (private network)
                   └── Redis :6379 (private network + password)
```

PostgreSQL، Redis، API و Web هیچ پورت عمومی روی VPS ندارند. تنها reverse proxy داخلی روی `127.0.0.1:8080` bind می‌شود و Nginx میزبان، TLS عمومی را مدیریت می‌کند.

---

## 2) حداقل VPS پیشنهادی

برای شروع کم‌ترافیک:

- Ubuntu 24.04 LTS
- 2 vCPU
- 4 GB RAM
- حداقل 40 GB SSD
- Docker Engine + Docker Compose v2
- Nginx + Certbot روی Host

برای Production مالی، مانیتورینگ فضای دیسک و backup خارج از همان VPS الزامی است.

---

## 3) آماده‌سازی سرور

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

پس از login مجدد:

```bash
docker --version
docker compose version
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

پورت‌های 3000، 5432، 6379، 8000 و 8080 نباید عمومی باز شوند.

---

## 4) دریافت پروژه

```bash
sudo mkdir -p /opt/risheh-pay
sudo chown "$USER":"$USER" /opt/risheh-pay
cd /opt

git clone https://github.com/mahamirmh/risheh-pay.git
cd risheh-pay
```

برای repository خصوصی از SSH Deploy Key یا credential امن GitHub استفاده شود؛ token داخل command history ذخیره نشود.

---

## 5) ساخت Environment Production

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

برای تولید secretهای تصادفی:

```bash
openssl rand -hex 48
```

حداقل این متغیرها باید واقعی شوند:

```env
APP_ENV=production
SEED_DEMO_CATALOG=false
NEXT_PUBLIC_ENABLE_DEMO_MODE=false

POSTGRES_PASSWORD=<strong-random-secret>
REDIS_PASSWORD=<strong-random-secret>
APP_SECRET_KEY=<strong-random-secret>
DELIVERY_ENCRYPTION_KEY=<strong-random-secret>
ADMIN_API_KEY=<strong-random-secret>

NEXT_PUBLIC_API_URL=https://YOUR_DOMAIN
CORS_ORIGINS=["https://YOUR_DOMAIN"]
PAYMENT_CALLBACK_URL=https://YOUR_DOMAIN/api/v1/payments/callback

DIGITAL_GOODS_PROVIDER=<real-adapter-name>
PAYMENT_PROVIDER=<real-adapter-name>
```

همچنین `DATABASE_URL` و `REDIS_URL` باید دقیقاً با passwordهای انتخاب‌شده هماهنگ شوند.

### قوانین امنیتی Environment

- `.env.production` هرگز commit نشود.
- `PAYMENT_PROVIDER=mock` در Production ممنوع است.
- `DIGITAL_GOODS_PROVIDER=mock` در Production ممنوع است.
- `SEED_DEMO_CATALOG=true` در Production ممنوع است و API نیز fail-fast می‌کند.
- Secretهای Production در Slack/Telegram/Notion/README قرار نگیرند.

---

## 6) Build و اجرای Stack

یک‌بار permission بدهید:

```bash
chmod +x scripts/deploy-prod.sh scripts/backup-postgres.sh
```

سپس:

```bash
./scripts/deploy-prod.sh
```

این script قبل از deploy موارد زیر را کنترل می‌کند:

1. وجود `.env.production`
2. نبودن placeholderهای `CHANGE_ME`
3. `APP_ENV=production`
4. غیرفعال بودن Demo Mode و Demo Seed
5. غیر mock بودن Providerها
6. اعتبار Docker Compose
7. build تصاویر Production
8. health سرویس‌ها
9. health reverse proxy

وضعیت سرویس‌ها:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

لاگ‌ها:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f --tail=200
```

Health داخلی:

```bash
curl -i http://127.0.0.1:8080/healthz
```

---

## 7) اتصال دامنه و TLS

فایل نمونه Host Nginx:

```text
deploy/nginx/host-risheh-pay.conf.example
```

کپی و دامنه را اصلاح کنید:

```bash
sudo cp deploy/nginx/host-risheh-pay.conf.example /etc/nginx/sites-available/risheh-pay
sudo nano /etc/nginx/sites-available/risheh-pay
sudo ln -s /etc/nginx/sites-available/risheh-pay /etc/nginx/sites-enabled/risheh-pay
sudo nginx -t
sudo systemctl reload nginx
```

بعد از اینکه DNS دامنه به IP سرور اشاره کرد:

```bash
sudo certbot --nginx -d YOUR_DOMAIN
```

بررسی renew:

```bash
sudo certbot renew --dry-run
```

---

## 8) Migration

Container API در startup دستور زیر را اجرا می‌کند:

```bash
alembic upgrade head
```

در نتیجه migration قبل از شروع Uvicorn اجرا می‌شود. با این حال قبل از migrationهای destructive باید backup گرفته شود.

نمایش revision فعلی:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec api alembic current
```

---

## 9) Backup PostgreSQL

Backup دستی:

```bash
./scripts/backup-postgres.sh
```

خروجی در مسیر زیر ساخته می‌شود:

```text
backups/postgres/
```

پیش‌فرض retention برابر 14 روز است و با `BACKUP_RETENTION_DAYS` قابل تنظیم است.

### Cron روزانه

```bash
crontab -e
```

مثال اجرای هر شب ساعت 03:20:

```cron
20 3 * * * cd /opt/risheh-pay && ./scripts/backup-postgres.sh >> /var/log/risheh-pay-backup.log 2>&1
```

حداقل یک نسخه backup باید به فضای خارج از VPS منتقل شود؛ backup روی همان دیسک VPS به تنهایی Disaster Recovery محسوب نمی‌شود.

### Restore نمونه

ابتدا maintenance window و backup جدید بگیرید. سپس:

```bash
gunzip -c backups/postgres/risheh-pay-YYYYMMDDTHHMMSSZ.sql.gz | \
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Restore روی Production باید ابتدا روی staging یا یک دیتابیس موقت verify شود.

---

## 10) Update / Redeploy

```bash
cd /opt/risheh-pay
git fetch origin
git pull --ff-only origin main
./scripts/backup-postgres.sh
./scripts/deploy-prod.sh
```

قبل از هر release مالی، smoke test مسیر Checkout، callback و fulfillment انجام شود.

---

## 11) Rollback

به commit قبلی سالم برگردید:

```bash
git log --oneline -10
git checkout <KNOWN_GOOD_COMMIT>
./scripts/deploy-prod.sh
```

اگر migration جدید backward-compatible نباشد، فقط rollback کد کافی نیست. برنامه migration/restore باید برای همان release مشخص باشد.

پس از رفع مشکل:

```bash
git checkout main
```

---

## 12) Production Smoke Test

قبل از دریافت پول واقعی:

- صفحه اصلی با HTTPS باز شود.
- HTTP به HTTPS redirect شود.
- certificate معتبر باشد.
- API callback از Provider قابل دسترسی باشد.
- `docker compose ... ps` همه سرویس‌ها را healthy نشان دهد.
- `/api/v1/...` از طریق دامنه واقعی پاسخ دهد.
- CORS فقط دامنه واقعی را بپذیرد.
- Admin API بدون key معتبر رد شود.
- یک پرداخت sandbox واقعی Provider انتها-به-انتها تست شود.
- duplicate callback باعث double fulfillment نشود.
- failure Provider مسیر retry/recovery صحیح داشته باشد.
- backup تولید و restore آزمایشی verify شده باشد.
- Demo Mode و Demo Catalog خاموش باشند.

---

## 13) Monitoring پیشنهادی

حداقل برای Production:

- Sentry برای exception tracking
- uptime monitor برای URL عمومی و callback
- alert فضای دیسک VPS
- alert RAM/CPU
- log rotation
- backup off-site
- بررسی periodic certificate renewal

---

## 14) دستورهای عملیاتی مهم

Restart API:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart api
```

Restart کل stack:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml restart
```

خاموش کردن بدون حذف volumeها:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

**از `down -v` در Production استفاده نکنید** مگر اینکه عمداً قصد حذف دیتای PostgreSQL و Redis را داشته باشید.

---

## Production Gate

Risheh Pay فقط وقتی برای پول واقعی قابل انتشار است که تمام موارد زیر برقرار باشند:

- Provider پرداخت واقعی و credential معتبر
- Provider محصول واقعی و credential معتبر
- HTTPS معتبر
- Secrets واقعی و خارج Git
- Demo flags خاموش
- migration موفق
- تمام containerها healthy
- smoke test پرداخت و fulfillment موفق
- backup و restore تست‌شده
- monitoring و alerting فعال

اگر یکی از این Gateها برقرار نیست، محیط باید Staging محسوب شود نه Production مالی.
