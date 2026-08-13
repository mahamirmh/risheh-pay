"use client";

import { useEffect, useState } from "react";

type Product = { id: string; name: string; country_code: string; currency: string; denomination: string };
type Order = { id: string; state: string; delivery?: string | null };
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/products`).then(r => r.json()).then(setProducts).catch(() => setError("API در دسترس نیست؛ ابتدا Backend را اجرا کنید."));
  }, []);

  async function buy() {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const q = await fetch(`${API}/api/v1/quotes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variant_id: selected.id }) });
      if (!q.ok) throw new Error("دریافت Quote ناموفق بود");
      const quote = await q.json();
      const r = await fetch(`${API}/api/v1/orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quote_id: quote.id }) });
      if (!r.ok) throw new Error("ساخت سفارش ناموفق بود");
      setOrder(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "خطای سفارش"); }
    finally { setBusy(false); }
  }

  async function pay() {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`${API}/api/v1/orders/${order.id}/pay`, { method: "POST" });
      if (!r.ok) throw new Error("تأیید پرداخت ناموفق بود");
      setOrder(await r.json());
    } catch (e) { setError(e instanceof Error ? e.message : "خطای پرداخت"); }
    finally { setBusy(false); }
  }

  return <main dir="rtl"><section className="hero"><div className="container">
    <nav className="nav"><div className="brand">ریشه / DIGITAL GOODS</div><div className="badge">MVP • Checkout Live</div></nav>
    <div className="grid">
      <div className="card"><div className="badge">Digital Goods Infrastructure</div><h1>خرید دیجیتال،<br />سریع و مطمئن.</h1><p className="lead">قیمت‌گذاری ریالی، Quote منقضی‌شونده، پرداخت idempotent و تحویل خودکار؛ از انتخاب تا Delivery در یک جریان کنترل‌شده.</p><div className="actions"><a className="button" href="#products">انتخاب محصول</a><a className="button secondary" href={`${API}/docs`} target="_blank">API Docs</a></div>{error && <div className="error">{error}</div>}</div>
      <div className="card" id="products"><div className="badge">محصولات منتخب</div><div className="products">{products.map(p => <button className={`product ${selected?.id === p.id ? "selected" : ""}`} key={p.id} onClick={() => setSelected(p)}><strong>{p.name}</strong><span>{p.country_code} • {p.denomination} {p.currency}</span><b>انتخاب</b></button>)}</div>
        {selected && <div className="checkout"><div><small>انتخاب شما</small><strong>{selected.name} — {selected.denomination} {selected.currency}</strong></div><button className="button" disabled={busy} onClick={buy}>{busy ? "در حال پردازش…" : "ایجاد سفارش"}</button></div>}
        {order && <div className="order"><div><small>Order</small><strong>وضعیت: {order.state}</strong></div>{order.state === "PAYMENT_PENDING" && <button className="button" disabled={busy} onClick={pay}>پرداخت آزمایشی</button>}{order.delivery && <div className="delivery"><small>تحویل دیجیتال</small><code>{order.delivery}</code></div>}</div>}
      </div>
    </div>
  </div></section><footer className="footer container">Risheh Digital • Transaction-safe digital delivery</footer></main>;
}
