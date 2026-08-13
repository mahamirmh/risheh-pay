"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function remaining(target: number) {
  return Math.max(0, target - Date.now());
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** Live countdown to a quote's expiry. Calls onExpire once when it hits zero. */
export function Countdown({
  expiresAt,
  onExpire,
  className,
}: {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}) {
  const target = new Date(expiresAt).getTime();
  const [ms, setMs] = useState(() => remaining(target));

  useEffect(() => {
    setMs(remaining(target));
    const id = setInterval(() => {
      const left = remaining(target);
      setMs(left);
      if (left <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const urgent = ms <= 60_000;
  const expired = ms <= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm tabular-nums",
        urgent && !expired ? "text-warning" : "text-muted-foreground",
        expired && "text-destructive",
        className,
      )}
      dir="ltr"
      aria-live="polite"
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          expired ? "bg-destructive" : urgent ? "bg-warning animate-pulse" : "bg-primary",
        )}
        aria-hidden
      />
      {expired ? "منقضی شد" : `${pad(minutes)}:${pad(seconds)}`}
    </span>
  );
}
