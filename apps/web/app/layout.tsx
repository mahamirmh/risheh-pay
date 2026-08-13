import type { Metadata, Viewport } from "next";
import { Vazirmatn, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ریشه | تحویل آنی محصولات دیجیتال",
  description:
    "خرید و تحویل آنی گیفت‌کارت و محصولات دیجیتال بین‌المللی؛ قیمت‌گذاری ریالی شفاف، پرداخت امن و تحویل خودکار در یک جریان کنترل‌شده.",
  applicationName: "ریشه",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#07131f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${mono.variable} bg-background`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
