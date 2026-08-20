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

const API = process.env.NEXT_PUBLIC_API_URL?.trim();
const DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";
const BASE = API ? `${API.replace(/\/$/, "")}/api/v1` : "";

if (process.env.NODE_ENV === "production" && !API && !DEMO_ENABLED) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required in production unless NEXT_PUBLIC_ENABLE_DEMO_MODE=true",
  );
}

/** Tracks whether the live backend has responded. Demo fallback is opt-in only. */
let liveMode: boolean | null = API ? null : false;

export function isDemoMode(): boolean {
  return DEMO_ENABLED && liveMode === false;
}

function backendUnavailable(operation: string, cause?: unknown): Error {
  const message = `سرویس پرداخت موقتاً در دسترس نیست (${operation}). لطفاً دوباره تلاش کنید.`;
  return cause instanceof Error ? new Error(message, { cause }) : new Error(message);
}

function allowDemoFallback(operation: string, cause?: unknown): void {
  if (!DEMO_ENABLED) {
    throw backendUnavailable(operation, cause);
  }
  liveMode = false;
}

async function tryFetch(input: string, init?: RequestInit): Promise<Response> {
  if (!API) {
    throw backendUnavailable("API configuration");
  }

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
 * Demo data + in-memory order engine.
 * This path is available only when NEXT_PUBLIC_ENABLE_DEMO_MODE=true.
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

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await tryFetch(`${BASE}/products`);
    if (!res.ok) throw new Error(`products returned ${res.status}`);
    return (await res.json()) as Product[];
  } catch (error) {
    allowDemoFallback("products", error);
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
      if (!res.ok) throw new Error(`quote returned ${res.status}`);
      return (await res.json()) as Quote;
    } catch (error) {
      allowDemoFallback("quote", error);
    }
  } else if (!DEMO_ENABLED) {
    throw backendUnavailable("quote");
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
      if (!res.ok) throw new Error(`order returned ${res.status}`);
      return (await res.json()) as Order;
    } catch (error) {
      allowDemoFallback("order", error);
    }
  } else if (!DEMO_ENABLED) {
    throw backendUnavailable("order");
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
      if (!res.ok) throw new Error(`pay returned ${res.status}`);
      return (await res.json()) as Order;
    } catch (error) {
      allowDemoFallback("payment", error);
    }
  } else if (!DEMO_ENABLED && !demoOrders.has(orderId)) {
    throw backendUnavailable("payment");
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
      if (!res.ok) throw new Error(`get order returned ${res.status}`);
      return (await res.json()) as Order;
    } catch (error) {
      allowDemoFallback("order status", error);
    }
  } else if (!DEMO_ENABLED && !demoOrders.has(orderId)) {
    throw backendUnavailable("order status");
  }

  const rec = demoOrders.get(orderId);
  if (!rec) throw new Error("سفارش یافت نشد");
  return progressDemoOrder(rec);
}
