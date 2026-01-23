import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  productionBrowserSourceMaps: true,
  experimental: {
    reactDebugChannel: process.env.REACT_DEBUG_CHANNEL ? true : false,
  },
}

export default nextConfig
