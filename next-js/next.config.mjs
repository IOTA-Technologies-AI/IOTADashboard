import { execSync } from 'node:child_process';

import { withSentryConfig } from '@sentry/nextjs';

// ----------------------------------------------------------------------
// Build stamp — the commit and date this bundle was built from. Baked in at
// build time because git is not available at runtime on the deploy target.
// Falls back to the CI-provided SHA, then to 'unknown', so a build never
// fails just because git is missing.
// ----------------------------------------------------------------------
const buildSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return (process.env.VERCEL_GIT_COMMIT_SHA || 'unknown').slice(0, 7);
  }
})();

const buildDate = new Date().toISOString().slice(0, 10);

/**
 * Static Exports in Next.js
 *
 * 1. Set `isStaticExport = true` in `next.config.{mjs|ts}`.
 * 2. This allows `generateStaticParams()` to pre-render dynamic routes at build time.
 *
 * For more details, see:
 * https://nextjs.org/docs/app/building-your-application/deploying/static-exports
 *
 * NOTE: Remove all "generateStaticParams()" functions if not using static exports.
 */
const isStaticExport = false;

// ----------------------------------------------------------------------

const nextConfig = {
  trailingSlash: true,
  output: isStaticExport ? 'export' : undefined,
  env: {
    BUILD_STATIC_EXPORT: JSON.stringify(isStaticExport),
    NEXT_PUBLIC_BUILD_SHA: buildSha,
    NEXT_PUBLIC_BUILD_DATE: buildDate,
  },
  // Allow Vercel builds to proceed even if ESLint finds warnings/errors
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['framer-motion', 'motion-dom', 'motion-utils'],
  // Without --turbopack (next dev)
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    if (isServer) {
      config.externals = [...(config.externals || []), 'motion-dom', 'motion-utils'];
    }
    // Reduce parallelism on memory-constrained CI/Vercel builds
    config.parallelism = 1;
    return config;
  },
  // With --turbopack (next dev --turbopack)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

const sentryConfig = {
  org: 'iota-technologies',
  project: 'javascript-nextjs',
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // Disable source map upload — no auth token is configured on Vercel,
  // and uploading source maps during build significantly increases memory usage.
  sourcemaps: {
    disable: true,
  },
  // Disable the Sentry webpack plugin's telemetry bundle injection on Vercel
  // to avoid a third parallel webpack pass that causes OOM on 8 GB build machines.
  disableServerWebpackPlugin: !!process.env.VERCEL,
  disableClientWebpackPlugin: !!process.env.VERCEL,
};

export default withSentryConfig(nextConfig, sentryConfig);
