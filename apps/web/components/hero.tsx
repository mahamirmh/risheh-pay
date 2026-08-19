import { BadgeCheck, Clock, Lock, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TRUST = [
  { icon: Clock, title: "تحویل آنی", desc: "میانگین کمتر از ۶۰ ثانیه" },
  { icon: Lock, title: "پرداخت امن", desc: "تراکنش idempotent" },
  { icon: RefreshCcw, title: "بازگشت وجه", desc: "در صورت عدم تحویل" },
  { icon: BadgeCheck, title: "قیمت شفاف", desc: "ریالی و بدون کارمزد پنهان" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="grain absolute inset-0 opacity-40" aria-hidden />
      <div
        className="absolute -top-40 left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-10 pt-14 text-center md:px-6 md:pb-16 md:pt-24">
        <Badge variant="primary" className="animate-fade-up">
          زیرساخت تحویل محصولات دیجیتال
        </Badge>
        <h1
          className="mt-6 text-balance text-4xl font-bold leading-[1.08] tracking-tight animate-fade-up md:text-[3.75rem]"
          style={{ animationDelay: "60ms" }}
        >
          گیفت‌کارت و اشتراک بین‌المللی،
          <br className="hidden md:block" />
          <span className="text-primary"> آنی و مطمئن</span>.
        </h1>
        <p
          className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground animate-fade-up md:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          محصول را انتخاب کنید، قیمت ریالی شفاف با نرخ لحظه‌ای بگیرید و پس از
          پرداخت، کد دیجیتال خود را در یک جریان امن و قابل‌پیگیری تحویل بگیرید.
        </p>

        <dl
          className="mt-10 grid w-full grid-cols-2 gap-3 animate-fade-up md:grid-cols-4"
          style={{ animationDelay: "180ms" }}
        >
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl bg-card p-4 text-right shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] ring-1 ring-border/60"
            >
              <Icon className="size-5 text-primary" aria-hidden />
              <dt className="mt-3 text-sm font-bold">{title}</dt>
              <dd className="mt-0.5 text-xs text-muted-foreground">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
