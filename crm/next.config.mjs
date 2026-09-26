import { fileURLToPath } from "node:url";
import path from "node:path";

// El CRM usa la lógica del sitio (../lib): agenda, leads, comisión, clasificación. Una sola
// fuente de verdad para las dos apps; externalDir permite importar fuera de crm/.
const aqui = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(aqui, ".."),
  experimental: { externalDir: true },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
};

export default nextConfig;
