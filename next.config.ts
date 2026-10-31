import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cache Components is off: the card-detail route renders on demand
     (the checked-in catalogue snapshot can be empty before first
     import, and static generation fails on an empty param list). */
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
