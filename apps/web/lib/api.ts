import type { OrderState } from "./order-state";

export interface Product {
  id: string;
  product_id: string;
  brand: string;
  name: string;
  category: string;
  country_code: string;
  currency: string;
  denomination: string;
}

export interface Quote {
  id: string;
  amount: string;
  currency: string;
  expires_at: string;
}

export interface Order {
  id: string;
  state: OrderState;
  correlation_id: string;
  payment_url?: string;
  payment_reference?: string;
  amount?: string;
  currency?: string;
  delivery?: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BASE = `${API}/api/v1`;

/** Whether the live backend responded at least once. Falls back to demo mode. */
let liveMode: boolean | null = null;

export function isDemoMode(): boolean {
  return liveMode === false;
}

async function tryFetch(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    liveMode = true;
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------------------
 * Demo data + in-memory order engine (used only when the backend is offline).
 * Mirrors the FastAPI contract so the full flow is previewable end-to-end.
 * ------------------------------------------------------------------------- */

const DEMO_PRODUCTS: Product[] = [
  demo("Apple", "اپل گیفت‌کارت", "gift_card", "US", "USD", "25"),
  demo("Apple", "اپل گیفت‌کارت", "gift_card", "US", "USD", "50"),
  demo("Apple", "اپل گیفت‌کارت", "gift_card", "US", "USD", "100"),
  demo("Steam", "استیم والت", "game", "US", "USD", "20"),
  demo("Steam", "استیم والت", "game", "US", "USD", "50"),
  demo("Google Play", "گوگل پلی", "gift_card", "US", "USD", "25"),
  demo("Spotify", "اسپاتیفای پرمیوم", "subscription", "US", "USD", "30"),
  demo("Amazon", "آمازون گیفت‌کارت", "gift_card", "US", "USD", "50"),
  demo("PlayStation", "پلی‌استیشن استور", "game", "GB", "GBP", "25"),
  demo("Netflix", "نتفلیکس", "subscription", "TR", "TRY", "500"),
];

function demo(
  brand: string,
  name: string,
  category: string,
  country: string,
  currency: string,
  denomination: string,
): Product {
  const id = `demo-${brand}-${denomination}-${country}`.toLowerCase().replace(/\s+/g, "-");
  return {
    id,
    product_id: `p-${brand}`.toLowerCase(),
    brand,
    name,
    category,
    country_code: country,
    currency,
    denomination,
  };
}

/** Approximate the backend pricing: fx 100000, +1% risk, +5% margin. */
function demoPrice(denomination: string): string {
  const cost = Number(denomination) * 100000;
  return (cost * 1.06).toFixed(0);
}

interface DemoOrderRecord {
  order: Order;
  paidAt: number | null;
}

const demoQuotes = new Map<string, Quote>();
const demoOrders = new Map<string, DemoOrderRecord>();

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Advance a demo order through PAID → PROCESSING → DELIVERED based on elapsed time. */
function progressDemoOrder(rec: DemoOrderRecord): Order {
  if (rec.paidAt == null) return rec.order;
  const elapsed = Date.now() - rec.paidAt;
  if (elapsed < 1400) {
    rec.order.state = "PAID";
  } else if (elapsed < 3200) {
    rec.order.state = "PROCESSING";
  } else {
    rec.order.state = "DELIVERED";
    rec.order.delivery =
      rec.order.delivery ?? `XY9K-${uid("d").slice(2, 6).toUpperCase()}-4F7Q-DEMO`;
  }
  return { ...rec.order };
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await tryFetch(`${BASE}/products`);
    if (!res.ok) throw new Error("bad status");
    return (await res.json()) as Product[];
  } catch {
    liveMode = false;
    return DEMO_PRODUCTS;
  }
}

export async function createQuote(variantId: string): Promise<Quote> {
  if (liveMode !== false) {
    try {
      const res = await tryFetch(`${BASE}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId }),
      });
      if (!res.ok) throw new Error("quote failed");
      return (await res.json()) as Quote;
    } catch {
      liveMode = false;
    }
  }
  const product = DEMO_PRODUCTS.find((p) => p.id === variantId) ?? DEMO_PRODUCTS[0];
  const quote: Quote = {
    id: uid("q"),
    amount: demoPrice(product.denomination),
    currency: "IRR",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
  demoQuotes.set(quote.id, quote);
  return quote;
}

export async function createOrder(quoteId: string): Promise<Order> {
  if (liveMode !== false) {
    try {
      const res = await tryFetch(`${BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quoteId }),
      });
      if (!res.ok) throw new Error("order failed");
      return (await res.json()) as Order;
    } catch {
      liveMode = false;
    }
  }
  const quote = demoQuotes.get(quoteId);
  const order: Order = {
    id: uid("o"),
    state: "PAYMENT_PENDING",
    correlation_id: `rg-${uid("").slice(1, 18)}`,
    amount: quote?.amount,
    currency: quote?.currency ?? "IRR",
    delivery: null,
  };
  demoOrders.set(order.id, { order, paidAt: null });
  return order;
}

export async function payOrder(orderId: string): Promise<Order> {
  if (liveMode !== false && !demoOrders.has(orderId)) {
    try {
      const res = await tryFetch(`${BASE}/orders/${orderId}/pay`, { method: "POST" });
      if (!res.ok) throw new Error("pay failed");
      return (await res.json()) as Order;
    } catch {
      liveMode = false;
    }
  }
  const rec = demoOrders.get(orderId);
  if (!rec) throw new Error("سفارش یافت نشد");
  rec.paidAt = Date.now();
  rec.order.state = "PAID";
  return { ...rec.order };
}

export async function getOrder(orderId: string): Promise<Order> {
  if (liveMode !== false && !demoOrders.has(orderId)) {
    try {
      const res = await tryFetch(`${BASE}/orders/${orderId}`);
      if (!res.ok) throw new Error("get order failed");
      return (await res.json()) as Order;
    } catch {
      liveMode = false;
    }
  }
  const rec = demoOrders.get(orderId);
  if (!rec) throw new Error("سفارش یافت نشد");
  return progressDemoOrder(rec);
}
