import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable automatic static optimization
  staticPageGenerationTimeout: 0,
  
  // Configure headers for auth routes
  async headers() {
    return [
      {
        source: '/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/(admin|student)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },

  // Configure redirects for auth flow
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/student',
        destination: '/student/dashboard',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
