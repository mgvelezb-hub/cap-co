import { fileURLToPath } from "node:url";
import path from "node:path";

// Fija la raíz del proyecto. Sin esto, Next detecta /Users/vpconsulting/package-lock.json
// y toma el home completo como workspace: el build y el dev server se cuelgan.
const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
};

export default nextConfig;
