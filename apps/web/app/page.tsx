"use client";

import { useEffect, useState } from "react";
import { getProducts, isDemoMode, type Product } from "@/lib/api";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { ProductGrid } from "@/components/product-grid";
import { CheckoutSheet } from "@/components/checkout-sheet";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [demo, setDemo] = useState(false);
  const [checkoutVariant, setCheckoutVariant] = useState<Product | null>(null);

  useEffect(() => {
    getProducts().then((items) => {
      setProducts(items);
      setDemo(isDemoMode());
    });
  }, []);

  return (
    <main dir="rtl">
      <SiteHeader demo={demo} />
      <Hero />
      <ProductGrid products={products} onBuy={setCheckoutVariant} />
      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        ریشه دیجیتال — تحویل امن و آنی محصولات دیجیتال
      </footer>
      {checkoutVariant && (
        <CheckoutSheet
          variant={checkoutVariant}
          onClose={() => setCheckoutVariant(null)}
        />
      )}
    </main>
  );
}
