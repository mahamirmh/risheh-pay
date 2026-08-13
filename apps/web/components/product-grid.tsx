"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/api";
import { ProductCard, type ProductGroup } from "@/components/product-card";
import { cn } from "@/lib/utils";

function groupProducts(products: Product[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const p of products) {
    const key = `${p.product_id}-${p.country_code}-${p.currency}`;
    const existing = map.get(key);
    if (existing) {
      existing.variants.push(p);
    } else {
      map.set(key, {
        key,
        brand: p.brand,
        name: p.name,
        category: p.category,
        country_code: p.country_code,
        currency: p.currency,
        variants: [p],
      });
    }
  }
  for (const g of map.values()) {
    g.variants.sort((a, b) => Number(a.denomination) - Number(b.denomination));
  }
  return [...map.values()];
}

export function ProductGrid({
  products,
  onBuy,
}: {
  products: Product[];
  onBuy: (variant: Product) => void;
}) {
  const groups = useMemo(() => groupProducts(products), [products]);
  const brands = useMemo(
    () => ["همه", ...Array.from(new Set(groups.map((g) => g.brand)))],
    [groups],
  );
  const [brand, setBrand] = useState("همه");

  const visible =
    brand === "همه" ? groups : groups.filter((g) => g.brand === brand);

  return (
    <section id="products" className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">فروشگاه</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {groups.length} محصول آماده تحویل آنی
          </p>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 sm:justify-end">
            {brands.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                aria-pressed={brand === b}
                className={cn(
                  "min-h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                  brand === b
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((group) => (
          <ProductCard key={group.key} group={group} onBuy={onBuy} />
        ))}
      </div>
    </section>
  );
}
