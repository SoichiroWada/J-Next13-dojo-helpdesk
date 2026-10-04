/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    qualities: [75, 100],
  },

  allowedDevOrigins: ["192.168.1.68"],
};

module.exports = nextConfig;
