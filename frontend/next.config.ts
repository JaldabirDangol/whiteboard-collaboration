import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unsplash.com', // Added wildcard to catch 'images.unsplash.com'
        port: '',
        pathname: '/**',
      },
      {
        protocol:'https',
        hostname:'en.wikipedia.org',
        port:'',
        pathname:'/**'
      }
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;