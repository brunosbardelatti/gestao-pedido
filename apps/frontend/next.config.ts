import type { NextConfig } from 'next';

const backendUrl =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
