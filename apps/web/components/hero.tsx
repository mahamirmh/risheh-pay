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
      <div className="grain absolute inset-0 opacity-60" aria-hidden />
      <div
        className="absolute -top-32 right-0 size-[380px] rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pb-8 pt-12 md:px-6 md:pb-12 md:pt-20">
        <Badge variant="primary" className="animate-fade-up">
          زیرساخت تحویل محصولات دیجیتال
        </Badge>
        <h1
          className="mt-5 max-w-3xl text-balance text-4xl font-black leading-[1.1] tracking-tight animate-fade-up md:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          گیفت‌کارت و اشتراک بین‌المللی،
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
          className="mt-9 grid grid-cols-2 gap-3 animate-fade-up md:grid-cols-4"
          style={{ animationDelay: "180ms" }}
        >
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/60 p-4"
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
