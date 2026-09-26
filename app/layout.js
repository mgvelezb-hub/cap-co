import { Marcellus, Inter } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/chat/ChatWidget";

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
  title: "CAP & Co. — Casa de Asesoramiento Prendario",
  // Mientras el contenido sea provisional, no se indexa (SITE_INDEXABLE=true cuando sea definitivo).
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  description:
    "Te explicamos exactamente qué firmaste al empeñar, cuánto vas a pagar y qué opciones tienes — con datos reales y evaluación justa, sin letras chiquitas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="motion-safe:scroll-smooth">
      <body className={`${marcellus.variable} ${inter.variable} font-sans bg-papel text-esmeralda antialiased`}>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
