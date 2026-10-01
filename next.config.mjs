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
  // Encabezados de seguridad del sitio público. Sin CSP por ahora: Next y la escena 3D usan
  // scripts en línea; se agrega cuando haya tiempo de probarla.
  async headers() {
    return [
      {
        source: "/:ruta*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  async redirects() {
    const crm = process.env.CRM_URL || "https://capco-crm.vercel.app";
    return [{ source: "/admin/:ruta*", destination: `${crm}/`, permanent: false }];
  },
};

export default nextConfig;
