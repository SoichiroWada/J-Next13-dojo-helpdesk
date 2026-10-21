import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
const nextConfig: NextConfig = {
  images: {
    qualities: [75, 100],
  },

  allowedDevOrigins: ["192.168.1.68"],
};

export default function config(phase: string): NextConfig {
  // Refuse flagged production builds/start even with a misleading NODE_ENV.
  if (process.env.NEXT_PUBLIC_E2E_TEST && phase !== PHASE_DEVELOPMENT_SERVER) {
    throw new Error("E2E emulator mode is forbidden in production builds and servers.");
  }
  return {
    ...nextConfig,
    ...(process.env.NEXT_PUBLIC_E2E_TEST === "true" ? { distDir: ".next-e2e" } : {}),
  };
}
