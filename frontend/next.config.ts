import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  
  // Ajoutez cette configuration de proxy
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:9999/:path*', // Redirection vers votre backend Express
      },
    ];
  },
}

export default nextConfig