/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    serverActions: { bodySizeLimit: "15mb" },
    // @google/genai ships ESM that Next 14's bundler resolver sometimes fails to
    // resolve against node_modules (Module not found: Can't resolve '@google/genai').
    // Forcing it through Next's own transpiler fixes the resolution.
    transpilePackages: ["@google/genai"],
  },
};
export default nextConfig;
