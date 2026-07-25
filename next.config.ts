import type { NextConfig } from 'next';

const authUrl = process.env.AUTH_URL;
const codespaceName = process.env.CODESPACE_NAME;

const allowedDevOrigins: string[] = [
  ...(authUrl ? [new URL(authUrl).host] : []),
  // Codespaces forwards each port as https://{name}-{port}.app.github.dev.
  // Next.js blocks cross-origin dev requests unless the host is listed here.
  ...(codespaceName ? [`${codespaceName}-3000.app.github.dev`] : []),
];

const nextConfig: NextConfig = {
  images: {
    domains: ['static.usernames.app-backend.toolsforhumanity.com'],
  },
  allowedDevOrigins,
  reactStrictMode: false,
};

export default nextConfig;
