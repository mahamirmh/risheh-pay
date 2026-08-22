const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim();
const demoModeEnabled = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

if (process.env.NODE_ENV === "production" && !apiOrigin && !demoModeEnabled) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is required for production builds unless NEXT_PUBLIC_ENABLE_DEMO_MODE=true",
  );
}

// Same-origin-by-default CSP plus the configured API origin for fetch calls.
// Demo deployments intentionally need no external connect-src origin.
const connectSources = ["'self'", ...(apiOrigin ? [apiOrigin] : [])].join(" ");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  `connect-src ${connectSources}`,
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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
