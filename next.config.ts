import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp"],
  // No ESLint in this project; `npm run typecheck` and the tests are the gate.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
