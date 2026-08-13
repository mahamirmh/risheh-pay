"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { Product } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categoryLabel, countryLabel, formatIRR } from "@/lib/format";

export interface ProductGroup {
  key: string;
  brand: string;
  name: string;
  category: string;
  country_code: string;
  currency: string;
  variants: Product[];
}

function monogram(brand: string) {
  return brand.trim().slice(0, 2).toUpperCase();
}

/** Rough client-side preview price (fx 100000 + ~6% fees), for display before quoting. */
function previewPrice(denomination: string) {
  return formatIRR(Number(denomination) * 100000 * 1.06);
}

export function ProductCard({
  group,
  onBuy,
}: {
  group: ProductGroup;
  onBuy: (variant: Product) => void;
}) {
  const [selectedId, setSelectedId] = useState(group.variants[0]?.id ?? "");
  const selected =
    group.variants.find((v) => v.id === selectedId) ?? group.variants[0];

  return (
    <article className="group flex flex-col rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-muted/60 font-mono text-sm font-bold text-foreground">
            {monogram(group.brand)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold">{group.brand}</h3>
            <p className="truncate text-xs text-muted-foreground">{group.name}</p>
          </div>
        </div>
        <Badge variant="default">{categoryLabel(group.category)}</Badge>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted/60 px-2 py-0.5 font-mono">
          {group.country_code}
        </span>
        <span>{countryLabel(group.country_code)}</span>
        <span aria-hidden>•</span>
        <span>{group.currency}</span>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-muted-foreground">
          انتخاب مبلغ
        </p>
        <div className="flex flex-wrap gap-2">
          {group.variants.map((v) => {
            const active = v.id === selected?.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                aria-pressed={active}
                className={cn(
                  "min-h-9 rounded-xl border px-3 text-sm font-bold tabular-nums transition-all",
                  active
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                )}
              >
                {Number(v.denomination)} {v.currency}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3 border-t border-border/70 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">قیمت تقریبی</p>
          <p className="truncate font-mono text-lg font-black">
            {selected ? previewPrice(selected.denomination) : "—"}
            <span className="mr-1 text-xs font-normal text-muted-foreground">
              ریال
            </span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => selected && onBuy(selected)}
          disabled={!selected}
        >
          خرید
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      </div>
    </article>
  );
}
