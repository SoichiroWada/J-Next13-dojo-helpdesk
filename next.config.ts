import type { NextConfig } from "next";
import { getE2EConfig } from "./utils/next-config";
const nextConfig: NextConfig = {
  images: {
    qualities: [75, 100],
  },

  allowedDevOrigins: ["192.168.1.68"],
};

export default function config(phase: string): NextConfig {
  return {
    ...nextConfig,
    ...getE2EConfig(phase),
  };
}
