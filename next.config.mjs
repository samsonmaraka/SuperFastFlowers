/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'sendagift.ug'
          }
        ],
        destination: 'https://www.sendagift.ug/:path*',
        permanent: true
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com'
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com'
      }
    ]
  }
};

export default nextConfig;
