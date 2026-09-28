import type { NextConfig } from 'next';
import { join } from 'node:path';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Self-contained server bundle for Docker; ignored by Vercel.
  output: 'standalone',
  outputFileTracingRoot: join(__dirname, '..'),
  // Product images are served by the API (/static/...). We render them with <img>, so no image domains are needed.
};

export default config;
