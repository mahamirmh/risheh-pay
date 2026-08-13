import { ShieldCheck, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SiteHeader({ demo }: { demo: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 md:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="size-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold tracking-tight">ریشه</p>
            <p className="text-[11px] text-muted-foreground">Digital Goods</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {demo ? (
            <Badge variant="warning">حالت نمایشی</Badge>
          ) : (
            <Badge variant="success">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              متصل
            </Badge>
          )}
          <Badge variant="primary" className="hidden sm:inline-flex">
            <ShieldCheck className="size-3.5" aria-hidden />
            تحویل تضمین‌شده
          </Badge>
        </div>
      </div>
    </header>
  );
}
