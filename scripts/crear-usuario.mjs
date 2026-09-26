// Genera la entrada de un usuario para ADMIN_USUARIOS (panel /admin).
// Uso: node scripts/crear-usuario.mjs <usuario> <dueno|operador>
// Pide la contraseña sin mostrarla y imprime "usuario:rol:sal:hash". Pégala en ADMIN_USUARIOS
// (Vercel → cap-co → Settings → Environment Variables), separando usuarios con ";".
import { createHash, randomBytes } from "node:crypto";
import readline from "node:readline";

const [usuario, rol] = process.argv.slice(2);
if (!/^[a-z0-9._-]{2,30}$/i.test(usuario || "") || !["dueno", "operador"].includes(rol)) {
  console.error("Uso: node scripts/crear-usuario.mjs <usuario> <dueno|operador>");
  process.exit(1);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = (s) => rl.output.write(s.includes("Contraseña") ? s : "");
rl.question("Contraseña (mínimo 12 caracteres): ", (clave) => {
  rl.close();
  process.stdout.write("\n");
  if (clave.length < 12) {
    console.error("La contraseña debe tener al menos 12 caracteres.");
    process.exit(1);
  }
  const sal = randomBytes(8).toString("hex");
  const hash = createHash("sha256").update(`${sal}${clave}`).digest("hex");
  console.log(`${usuario}:${rol}:${sal}:${hash}`);
});
