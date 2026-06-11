/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/courses/:path*',
        // Aponta para a URL pública do Cloudflare R2 ou para uma pasta de fallback em desenvolvimento
        destination: process.env.NEXT_PUBLIC_R2_URL 
          ? `${process.env.NEXT_PUBLIC_R2_URL}/:path*`
          : 'http://localhost:3000/fallback-courses/:path*',
      },
    ]
  },
}

module.exports = nextConfig
