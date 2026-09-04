import type { NextConfig } from 'next';

const isWindows = process.platform === 'win32';
const useStandalone = process.env.OUTPUT_STANDALONE === 'true' || !isWindows;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(useStandalone ? { output: 'standalone' } : {}),
  devIndicators: false,
  async rewrites() {
    const apiTarget = process.env.API_INTERNAL_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
