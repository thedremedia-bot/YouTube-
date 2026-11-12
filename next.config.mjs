/** @type {import('next').NextConfig} */
// Builds plain static files into out/ so GitHub Pages can host the site.
// The deploy workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo name>".
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
