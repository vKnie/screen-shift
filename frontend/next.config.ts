import type { NextConfig } from "next";

let imageConfig = {};
if (process.env.NEXT_PUBLIC_EXPRESS_API_URL) {
  const { hostname, protocol, port } = new URL(process.env.NEXT_PUBLIC_EXPRESS_API_URL);
  imageConfig = {
    remotePatterns: [
      {
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        port: port || '',
        pathname: '/**',
      },
    ],
  };
} else {
  console.warn('NEXT_PUBLIC_EXPRESS_API_URL is not defined in environment variables');
  imageConfig = {
    remotePatterns: [],
  };
}

const nextConfig: NextConfig = {
  images: imageConfig,
  allowedDevOrigins: ['local-origin.dev', '*.local-origin.dev'],
  
  // Ajout du proxy pour résoudre le problème CORS
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_EXPRESS_API_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;