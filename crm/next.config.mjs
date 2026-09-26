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
  // Nadie puede incrustar el CRM en otra página (clickjacking) ni adivinar tipos de archivo.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
