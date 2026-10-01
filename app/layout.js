import { Marcellus, Inter } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/chat/ChatWidget";
import Visitas from "@/components/Visitas";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const indexable = process.env.SITE_INDEXABLE === "true";

export const metadata = {
  title: "Revisa tu boleta de empeño sin costo — CAP & Co.",
  // Mientras el contenido sea provisional, no se indexa (SITE_INDEXABLE=true cuando sea definitivo).
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  description:
    "Revisamos tu boleta de empeño sin costo: qué firmaste, cuánto vas a pagar y si hay una opción que te convenga más. Asesoría prendaria en la Ciudad de México.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="motion-safe:scroll-smooth">
      <body className={`${marcellus.variable} ${inter.variable} font-sans bg-papel text-esmeralda antialiased`}>
        {/* Con el chat abierto, todo lo de la página queda inerte (ChatWidget le pone inert): el foco
            y el lector de pantalla no se salen del diálogo. */}
        <div id="pagina">
          {/* Primero en el orden de tabulación: brinca el encabezado. El destino es el <main> de cada
              página (id="contenido"; el encabezado se lo pone a los que no lo traen). */}
          <a
            href="#contenido"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-esmeralda focus:px-5 focus:py-3 focus:font-sans focus:text-sm focus:text-sobre-verde"
          >
            Saltar al contenido
          </a>
          {children}
        </div>
        <ChatWidget />
        <Visitas />
      </body>
    </html>
  );
}
