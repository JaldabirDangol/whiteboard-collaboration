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
};

export default nextConfig;