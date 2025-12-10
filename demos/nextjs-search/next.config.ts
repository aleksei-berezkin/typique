import type { NextConfig } from 'next'
import path from 'path'

const projectBasename = path.basename(import.meta.dirname)

const nextConfig: NextConfig = {
  output: 'export',
  assetPrefix: `/typique-demos/${projectBasename}`,
}

export default nextConfig;
