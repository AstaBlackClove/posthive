import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/features/reels-and-stories",
        destination: "/features/instagram-reels-scheduler",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
