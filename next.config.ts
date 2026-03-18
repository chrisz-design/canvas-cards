import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure assets resolve correctly when loaded from Tauri file:// protocol
  trailingSlash: true,
};

export default nextConfig;
