import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Single Docker image: `next build` emits a self-contained server in .next/standalone
  output: 'standalone',
  images: { formats: ['image/avif', 'image/webp'] },
  // The dev-mode badge sits in the bottom-left corner, on top of Home's ‹ › (1.2.1)
  devIndicators: false,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
