import { withSentryConfig } from '@sentry/nextjs';

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
