/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@scholaris/types', '@scholaris/shared', '@scholaris/validation'],
  reactStrictMode: true,
};

export default nextConfig;
