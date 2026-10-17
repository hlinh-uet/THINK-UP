import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Multipart requests include the 2 MB avatar plus form fields and boundaries.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
