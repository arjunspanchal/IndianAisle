/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Static save-the-date lives at public/save-the-date.html; serve it
      // from the clean path guests are given.
      { source: "/save-the-date", destination: "/save-the-date.html" },
    ];
  },
};

module.exports = nextConfig;
