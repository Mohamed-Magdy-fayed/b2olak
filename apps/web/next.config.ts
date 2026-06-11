import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@workspace/ui",
    "@workspace/api",
    "@workspace/auth",
    "@workspace/db",
    "@workspace/i18n",
    "@workspace/integrations",
    "@workspace/theme",
    "@workspace/validators",
  ],
};

export default nextConfig;
