export type OrderState =
  | "CREATED"
  | "PREFLIGHT_OK"
  | "PAYMENT_PENDING"
  | "PAID"
  | "FULFILLMENT_PENDING"
  | "PROCESSING"
  | "RETRYING"
  | "RECONCILIATION_REQUIRED"
  | "FULFILLMENT_FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "DELIVERED"
  | "CANCELLED";

export type StateTone = "pending" | "active" | "success" | "warning" | "error";

export interface StateMeta {
  label: string;
  description: string;
  /** Progress step: 0 = payment, 1 = processing, 2 = delivered. -1 = off-track. */
  step: number;
  tone: StateTone;
}

export const ORDER_STATE_META: Record<OrderState, StateMeta> = {
  CREATED: {
    label: "ایجاد شده",
    description: "سفارش ثبت شد و در انتظار پرداخت است.",
    step: 0,
    tone: "pending",
  },
  PREFLIGHT_OK: {
    label: "بررسی اولیه موفق",
    description: "موجودی و شرایط تحویل تأیید شد.",
    step: 0,
    tone: "pending",
  },
  PAYMENT_PENDING: {
    label: "در انتظار پرداخت",
    description: "منتظر تکمیل و تأیید پرداخت شما هستیم.",
    step: 0,
    tone: "active",
  },
  PAID: {
    label: "پرداخت تأیید شد",
    description: "پرداخت با موفقیت تأیید شد؛ آماده‌سازی تحویل آغاز می‌شود.",
    step: 1,
    tone: "active",
  },
  FULFILLMENT_PENDING: {
    label: "در صف تحویل",
    description: "سفارش در صف پردازش تحویل قرار گرفت.",
    step: 1,
    tone: "active",
  },
  PROCESSING: {
    label: "در حال آماده‌سازی",
    description: "در حال دریافت کد از تأمین‌کننده هستیم.",
    step: 1,
    tone: "active",
  },
  RETRYING: {
    label: "تلاش مجدد",
    description: "پردازش با تأخیر مواجه شد و در حال تلاش دوباره است.",
    step: 1,
    tone: "warning",
  },
  RECONCILIATION_REQUIRED: {
    label: "نیازمند بررسی",
    description:
      "به دلیل عدم قطعیت پاسخ تأمین‌کننده، سفارش برای بررسی دستی نگه داشته شد؛ بدون خطر خرید مجدد.",
    step: 1,
    tone: "warning",
  },
  DELIVERED: {
    label: "تحویل شد",
    description: "کد دیجیتال شما آماده است.",
    step: 2,
    tone: "success",
  },
  FULFILLMENT_FAILED: {
    label: "تحویل ناموفق",
    description: "تحویل انجام نشد؛ مبلغ پرداختی قابل بازگشت است.",
    step: -1,
    tone: "error",
  },
  REFUND_PENDING: {
    label: "بازگشت وجه در جریان",
    description: "درخواست بازگشت وجه ثبت شد و در حال پردازش است.",
    step: -1,
    tone: "warning",
  },
  REFUNDED: {
    label: "بازگشت داده شد",
    description: "مبلغ پرداختی به شما بازگردانده شد.",
    step: -1,
    tone: "success",
  },
  CANCELLED: {
    label: "لغو شد",
    description: "این سفارش لغو شده است.",
    step: -1,
    tone: "error",
  },
};

export const TIMELINE_STEPS = [
  { label: "پرداخت", hint: "تأیید تراکنش" },
  { label: "آماده‌سازی", hint: "دریافت کد از تأمین‌کننده" },
  { label: "تحویل", hint: "کد دیجیتال شما" },
] as const;

export function stateMeta(state: string): StateMeta {
  return (
    ORDER_STATE_META[state as OrderState] ?? {
      label: state,
      description: "",
      step: 0,
      tone: "pending" as StateTone,
    }
  );
}
