/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    const apiOrigin =
      process.env.API_ORIGIN ||
      process.env.BACKEND_URL ||
      (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '')

    if (!apiOrigin) {
      return []
    }

    const base = apiOrigin.replace(/\/$/, '')
    return [
      {
        source: '/api/:path*',
        destination: `${base}/api/:path*`,
      },
    ]
  },
  reactStrictMode: true,
  transpilePackages: ['@servasmar/ui', '@servasmar/utils'],
  experimental: {
    turbopack: {
      root: '../../',
    },
  },
}

module.exports = nextConfig