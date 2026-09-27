import { fileURLToPath } from "node:url";
import path from "node:path";

// Fija la raíz del proyecto. Sin esto, Next detecta /Users/vpconsulting/package-lock.json
// y toma el home completo como workspace: el build y el dev server se cuelgan.
const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
  // Un build local con el servidor de desarrollo prendido pisaba .next (404 en los chunks):
  // npm run build:local compila en .next-build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // El panel interno se mudó al CRM (app crm/). Los links viejos llevan ahí.
  async redirects() {
    const crm = process.env.CRM_URL || "https://capco-crm.vercel.app";
    return [{ source: "/admin/:ruta*", destination: `${crm}/`, permanent: false }];
  },
};

export default nextConfig;
