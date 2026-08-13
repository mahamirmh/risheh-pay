"use client";

import { AlertTriangle, Check, Loader2, RotateCcw } from "lucide-react";
import { stateMeta, TIMELINE_STEPS, type OrderState } from "@/lib/order-state";
import { cn } from "@/lib/utils";

export function OrderTimeline({ state }: { state: OrderState }) {
  const meta = stateMeta(state);
  const offTrack = meta.step < 0;

  return (
    <div>
      {!offTrack && (
        <ol className="flex items-stretch">
          {TIMELINE_STEPS.map((step, i) => {
            const done = i < meta.step;
            const active = i === meta.step;
            const isLast = i === TIMELINE_STEPS.length - 1;
            const deliveredDone = active && meta.tone === "success";
            return (
              <li key={step.label} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span className="flex-1" aria-hidden>
                    {i > 0 && (
                      <span
                        className={cn(
                          "block h-0.5 w-full rounded-full",
                          done || active ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      done || deliveredDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : active
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {done || deliveredDone ? (
                      <Check className="size-4" aria-hidden />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1" aria-hidden>
                    {!isLast && (
                      <span
                        className={cn(
                          "block h-0.5 w-full rounded-full",
                          done ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </span>
                </div>
                <span
                  className={cn(
                    "mt-2 text-center text-xs font-bold",
                    done || active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div
        className={cn(
          "mt-5 flex items-start gap-3 rounded-2xl border p-4",
          meta.tone === "success" && "border-success/30 bg-success/10",
          meta.tone === "error" && "border-destructive/30 bg-destructive/10",
          meta.tone === "warning" && "border-warning/30 bg-warning/10",
          (meta.tone === "active" || meta.tone === "pending") &&
            "border-border bg-muted/40",
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
            meta.tone === "success" && "bg-success/20 text-success",
            meta.tone === "error" && "bg-destructive/20 text-destructive",
            meta.tone === "warning" && "bg-warning/20 text-warning",
            (meta.tone === "active" || meta.tone === "pending") &&
              "bg-primary/15 text-primary",
          )}
        >
          {meta.tone === "success" ? (
            <Check className="size-4" aria-hidden />
          ) : meta.tone === "error" ? (
            <AlertTriangle className="size-4" aria-hidden />
          ) : meta.tone === "warning" ? (
            <RotateCcw className="size-4" aria-hidden />
          ) : (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{meta.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </div>
    </div>
  );
}
