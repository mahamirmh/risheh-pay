"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DeliveryReveal({ secret }: { secret: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  const masked = secret.replace(/[^-]/g, "•");

  return (
    <div className="animate-scale-in rounded-2xl border border-success/30 bg-success/10 p-4">
      <div className="flex items-center gap-2 text-success">
        <Gift className="size-4" aria-hidden />
        <p className="text-sm font-bold">کد دیجیتال شما</p>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <code
          className={cn(
            "flex-1 select-all rounded-xl border border-border bg-background/70 px-3 py-3 text-center font-mono text-base font-bold tracking-widest",
            !revealed && "text-muted-foreground",
          )}
          dir="ltr"
          aria-label={revealed ? "کد تحویل" : "کد تحویل مخفی"}
        >
          {revealed ? secret : masked}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "پنهان کردن کد" : "نمایش کد"}
        >
          {revealed ? (
            <EyeOff className="size-5" aria-hidden />
          ) : (
            <Eye className="size-5" aria-hidden />
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={copy}
          aria-label="کپی کد"
        >
          {copied ? (
            <Check className="size-5 text-success" aria-hidden />
          ) : (
            <Copy className="size-5" aria-hidden />
          )}
        </Button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        این کد را در جای امنی نگه دارید. پس از خروج از این صفحه، بازیابی آن تنها از
        طریق پشتیبانی و با کد پیگیری ممکن است.
      </p>
    </div>
  );
}
