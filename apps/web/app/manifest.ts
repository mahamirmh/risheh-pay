import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ریشه | تحویل آنی محصولات دیجیتال",
    short_name: "ریشه",
    description: "خرید و تحویل آنی محصولات دیجیتال بین‌المللی",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfd",
    theme_color: "#fbfbfd",
    lang: "fa",
    dir: "rtl",
    icons: [],
  };
}
