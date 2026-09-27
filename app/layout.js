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
        {children}
        <ChatWidget />
        <Visitas />
      </body>
    </html>
  );
}
