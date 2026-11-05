import type { NextConfig } from "next";
const pages = process.env.GITHUB_PAGES === "true";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  ...(pages ? { output: "export", trailingSlash: true, images: { unoptimized: true } } : {}),
};
export default nextConfig;
