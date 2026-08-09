import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Verbly handles Tier 1 data (child names, diagnosis notes, assessment
  // responses). Keep the server the source of truth; nothing sensitive should
  // be computed or trusted client-side (see API.md → "Two Access Patterns").
  reactStrictMode: true,
};

export default nextConfig;
