const apiOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// docs/SECURITY.md calls for a Content-Security-Policy but none was set.
// This is a same-origin-by-default policy plus the storefront's own API
// origin for fetch() calls. `'unsafe-inline'` stays on script-src/style-src
// for now because the App Router's hydration payload and this app's inline
// `style={{ animationDelay }}` usage (see components/hero.tsx) both need it
// without a per-request nonce, which would require adding a middleware.ts
// nonce pipeline - a reasonable follow-up, not something to bolt on
// half-verified. Even without nonces, this still blocks arbitrary
// third-party script/style/frame/form injection, which is the gap that
// mattered here.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
