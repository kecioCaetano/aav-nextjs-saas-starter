import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
  ...(process.env.PLAYWRIGHT_DIST_DIR
    ? { distDir: process.env.PLAYWRIGHT_DIST_DIR }
    : {}),
  ...(process.env.PLAYWRIGHT_TSCONFIG
    ? { typescript: { tsconfigPath: process.env.PLAYWRIGHT_TSCONFIG } }
    : {}),
  experimental: {
    ppr: true,
    clientSegmentCache: true
  }
};

export default withNextIntl(nextConfig);