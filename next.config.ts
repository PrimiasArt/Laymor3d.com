import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'img.vietqr.io',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: '*.bblmw.com',
      },
      {
        protocol: 'https',
        hostname: 'makerworld.bblmw.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.thingiverse.com',
      },
      {
        protocol: 'https',
        hostname: 'media.printables.com',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'fal.media',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const simBackendUrl = process.env.SIMULATOR_BACKEND_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/3dsim',
        destination: '/3dsim/index.html',
      },
      {
        source: '/3dsim/',
        destination: '/3dsim/index.html',
      },
      {
        source: '/api/v1/:path*',
        destination: `${simBackendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
