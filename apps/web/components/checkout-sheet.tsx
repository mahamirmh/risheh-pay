"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Lock, ShieldCheck, X } from "lucide-react";
import {
  createOrder,
  createQuote,
  getOrder,
  payOrder,
  type Order,
  type Product,
  type Quote,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Countdown } from "@/components/countdown";
import { OrderTimeline } from "@/components/order-timeline";
import { DeliveryReveal } from "@/components/delivery-reveal";
import { formatIRR } from "@/lib/format";
import { stateMeta } from "@/lib/order-state";

type Phase = "quoting" | "ready" | "paying" | "tracking" | "error";

const TERMINAL = new Set([
  "DELIVERED",
  "FULFILLMENT_FAILED",
  "REFUNDED",
  "CANCELLED",
  "RECONCILIATION_REQUIRED",
]);

export function CheckoutSheet({
  variant,
  onClose,
}: {
  variant: Product;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("quoting");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQuote = useCallback(async () => {
    setPhase("quoting");
    setError("");
    setExpired(false);
    try {
      const q = await createQuote(variant.id);
      setQuote(q);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "دریافت قیمت ناموفق بود");
      setPhase("error");
    }
  }, [variant.id]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  // Esc to close + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function pay() {
    if (!quote) return;
    setPhase("paying");
    setError("");
    try {
      const created = await createOrder(quote.id);
      setOrder(created);
      const paid = await payOrder(created.id);
      setOrder(paid);
      setPhase("tracking");
      if (!TERMINAL.has(paid.state)) startPolling(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "پرداخت ناموفق بود");
      setPhase("error");
    }
  }

  function startPolling(orderId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const fresh = await getOrder(orderId);
        setOrder(fresh);
        if (TERMINAL.has(fresh.state) && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        /* keep polling */
      }
    }, 1200);
  }

  const amount = quote ? formatIRR(quote.amount) : null;
  const showFooterPay = phase === "ready" || phase === "paying";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="تکمیل خرید"
    >
      <button
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        aria-label="بستن"
        onClick={onClose}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl animate-scale-in sm:rounded-3xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/70 p-5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">تکمیل خرید</p>
            <h2 className="truncate text-lg font-black">
              {variant.brand} — {Number(variant.denomination)} {variant.currency}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="بستن">
            <X className="size-5" aria-hidden />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* price block */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">مبلغ قابل پرداخت</span>
              {quote && !order && (
                <Countdown
                  expiresAt={quote.expires_at}
                  onExpire={() => setExpired(true)}
                />
              )}
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              {phase === "quoting" ? (
                <span className="inline-flex h-8 w-40 rounded-lg bg-muted animate-shimmer" />
              ) : (
                <>
                  <span className="font-mono text-3xl font-black tabular-nums">
                    {amount ?? "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">ریال</span>
                </>
              )}
            </div>
            {quote && !order && (
              <p className="mt-2 text-xs text-muted-foreground">
                این قیمت تا پایان شمارش معکوس معتبر است و شامل نرخ ارز لحظه‌ای و
                کارمزد است.
              </p>
            )}
          </div>

          {/* tracking / timeline */}
          {order && <OrderTimeline state={order.state} />}

          {/* delivery */}
          {order?.state === "DELIVERED" && order.delivery && (
            <DeliveryReveal secret={order.delivery} />
          )}

          {/* correlation id for support */}
          {order && (
            <p className="text-center text-xs text-muted-foreground">
              کد پیگیری:{" "}
              <code className="font-mono text-foreground" dir="ltr">
                {order.correlation_id}
              </code>
            </p>
          )}

          {/* errors */}
          {error && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {expired && !order && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm text-warning">قیمت منقضی شد.</p>
              <Button size="sm" variant="secondary" onClick={loadQuote}>
                دریافت قیمت جدید
              </Button>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-border/70 p-5">
          {showFooterPay ? (
            <>
              <Button
                className="w-full"
                size="lg"
                onClick={pay}
                disabled={phase === "paying" || expired || !quote}
              >
                {phase === "paying" ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                    در حال پردازش…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" aria-hidden />
                    پرداخت امن
                  </>
                )}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden />
                پرداخت idempotent — تراکنش شما هرگز دوبار ثبت نمی‌شود
              </p>
            </>
          ) : order && TERMINAL.has(order.state) ? (
            <Button className="w-full" size="lg" variant="secondary" onClick={onClose}>
              {order.state === "DELIVERED" ? "پایان" : "بستن"}
            </Button>
          ) : phase === "tracking" ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {order ? stateMeta(order.state).label : "در حال پیگیری…"}
            </div>
          ) : phase === "error" ? (
            <Button className="w-full" size="lg" variant="secondary" onClick={loadQuote}>
              تلاش مجدد
            </Button>
          ) : (
            <Badge variant="default" className="mx-auto">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              در حال آماده‌سازی
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
