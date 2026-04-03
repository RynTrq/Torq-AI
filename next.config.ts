import type { NextConfig } from "next";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "models.dev",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { 
            key: "Cross-Origin-Embedder-Policy", value: "credentialless"
          },
          { 
            key: "Cross-Origin-Opener-Policy", value: "same-origin"
          },
        ],
      }
    ];
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@opentelemetry/winston-transport": false,
    };
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /@opentelemetry\/instrumentation/,
      },
    ];

    return config;
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG!,
  project: process.env.SENTRY_PROJECT!,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
};

const shouldUseSentry =
  !!process.env.SENTRY_AUTH_TOKEN &&
  !!process.env.SENTRY_ORG &&
  !!process.env.SENTRY_PROJECT;

export default shouldUseSentry
  ? require("@sentry/nextjs").withSentryConfig(nextConfig, sentryConfig)
  : nextConfig;
