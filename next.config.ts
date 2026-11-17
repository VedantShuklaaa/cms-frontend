import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Origin of the CMS API. `connect-src` has to list it explicitly; otherwise the
 * browser blocks every `fetch` the app makes to the backend.
 */
function apiOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080/api/v1";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://127.0.0.1:8080";
  }
}

function contentSecurityPolicy(): string {
  const origin = apiOrigin();
  const scriptSrc = ["'self'", "'unsafe-inline'"];
  const connectSrc = ["'self'", origin];

  if (isDev) {
    // React Fast Refresh, Turbopack HMR and the development overlay.
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }

  const directives = [
    "default-src 'self'",
    // App Router streams the RSC payload through inline scripts and, because
    // cacheComponents (PPR) is enabled, a nonce cannot be used.
    `script-src ${scriptSrc.join(" ")}`,
    // Next.js and Tailwind inject inline <style> tags.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  // An HTTPS API means the deployment is expected to be served over HTTPS.
  // Gating on it keeps `next start` over plain HTTP (local testing) working,
  // since upgrade-insecure-requests would otherwise rewrite the asset URLs.
  if (!isDev && origin.startsWith("https://")) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

const securityHeaders: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Legacy clickjacking protection; `frame-ancestors` covers modern browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "browsing-topics=()",
      "camera=()",
      "display-capture=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  // The app loads nothing cross-origin, so there is no reason to leak DNS
  // lookups for linked hosts.
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // Modern browsers removed the XSS auditor; disable it where it still exists.
  { key: "X-XSS-Protection", value: "0" },
  { key: "X-Download-Options", value: "noopen" },
];

if (!isDev) {
  // Only meaningful over HTTPS, so keep it out of local HTTP development.
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  // Do not advertise the framework in responses.
  poweredByHeader: false,
  reactStrictMode: true,
  // Never ship source maps to the browser in production builds.
  productionBrowserSourceMaps: false,
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
