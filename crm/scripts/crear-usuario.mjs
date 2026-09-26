// Crea o actualiza un usuario del CRM en la base de DATABASE_URL.
// Uso (local):      npm run usuario --workspace crm -- <usuario> <dueno|asesor> "<Nombre>"
// Uso (producción): vercel env pull .env.produccion (en cap-co) y
//                   node --env-file=../.env.produccion scripts/crear-usuario.mjs <usuario> <rol> "<Nombre>"
// Pide la contraseña sin mostrarla (mínimo 12 caracteres).
import { pbkdf2Sync, randomBytes } from "node:crypto";
import readline from "node:readline";
import pg from "pg";

const [usuarioCrudo, rol, nombre] = process.argv.slice(2);
const usuario = (usuarioCrudo || "").toLowerCase();
if (!/^[a-z0-9._-]{2,30}$/.test(usuario) || !["dueno", "asesor"].includes(rol) || !nombre) {
  console.error('Uso: crear-usuario.mjs <usuario> <dueno|asesor> "<Nombre>"');
  process.exit(1);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => rl.output.write(s.includes("Contraseña") ? s : "");
rl.question("Contraseña (mínimo 12 caracteres): ", async (clave) => {
  rl.close();
  process.stdout.write("\n");
  if (clave.length < 12) {
    console.error("La contraseña debe tener al menos 12 caracteres.");
    process.exit(1);
  }
  const sal = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(clave, sal, 210_000, 32, "sha256").toString("hex");
  const url = process.env.DATABASE_URL;
  const cliente = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: true } });
  await cliente.connect();
  await cliente.query(
    `INSERT INTO crm_usuario (usuario, nombre, rol, sal, hash) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario) DO UPDATE SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, sal = EXCLUDED.sal, hash = EXCLUDED.hash, activo = true`,
    [usuario, nombre, rol, sal, hash],
  );
  await cliente.end();
  console.log(`Listo: ${usuario} (${rol}).`);
});
