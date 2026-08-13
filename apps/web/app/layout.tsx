import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Risheh Digital Goods",
  description: "خرید و تحویل آنی محصولات دیجیتال بین‌المللی",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
