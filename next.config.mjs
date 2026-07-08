/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  transpilePackages: ['xlsx', 'exceljs'],
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
