/** @type {import('next').NextConfig} */
const path = require('path')

const nextConfig = {
  // Fix Turbopack en monorepo
  outputFileTracingRoot: path.join(__dirname, '../../'),

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
  },

  reactStrictMode: true,
  transpilePackages: ['@servasmar/ui', '@servasmar/utils'],
}

module.exports = nextConfig
