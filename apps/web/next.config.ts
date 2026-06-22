import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/api",
    "@workspace/auth",
    "@workspace/db",
    "@workspace/forms",
    "@workspace/i18n",
    "@workspace/integrations",
    "@workspace/theme",
    "@workspace/validators",
  ],
  images:{remotePatterns: [{hostname: "images.unsplash.com"}]}
};

export default nextConfig;
