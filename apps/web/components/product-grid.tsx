"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/api";
import { ProductCard, type ProductGroup } from "@/components/product-card";
import { categoryLabel } from "@/lib/format";
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

  // Category is the primary browsing axis (PRD: "search/category/brand
  // discovery"); brand is a secondary filter scoped to whatever category is
  // selected, so a customer never sees a brand chip with zero results in it.
  const categories = useMemo(
    () => ["همه", ...Array.from(new Set(groups.map((g) => g.category)))],
    [groups],
  );
  const [category, setCategory] = useState("همه");
  const byCategory = useMemo(
    () => (category === "همه" ? groups : groups.filter((g) => g.category === category)),
    [groups, category],
  );

  const brands = useMemo(
    () => ["همه", ...Array.from(new Set(byCategory.map((g) => g.brand)))],
    [byCategory],
  );
  const [brand, setBrand] = useState("همه");
  useEffect(() => {
    if (!brands.includes(brand)) setBrand("همه");
  }, [brands, brand]);

  const visible =
    brand === "همه" ? byCategory : byCategory.filter((g) => g.brand === brand);

  return (
    <section id="products" className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6">
      <div className="border-b border-border/60 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">فروشگاه</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {groups.length} محصول آماده تحویل آنی
          </p>
        </div>

        <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div role="tablist" aria-label="دسته‌بندی محصولات" className="flex gap-6 border-b border-border/60">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  "relative shrink-0 pb-3 text-sm font-semibold transition-colors",
                  category === c
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "همه" ? "همه دسته‌ها" : categoryLabel(c)}
                {category === c && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </div>

        {brands.length > 2 && (
          <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-2">
              {brands.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  aria-pressed={brand === b}
                  className={cn(
                    "min-h-8 shrink-0 rounded-full border px-3.5 text-xs font-semibold transition-colors",
                    brand === b
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((group) => (
            <ProductCard key={group.key} group={group} onBuy={onBuy} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          محصولی در این دسته پیدا نشد.
        </p>
      )}
    </section>
  );
}
