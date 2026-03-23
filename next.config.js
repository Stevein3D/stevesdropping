/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org', // for future TMDB poster integration
      },
    ],
  },
}

module.exports = nextConfig
