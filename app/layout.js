import { Marcellus, Inter } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "CAP & Co. — Casa de Asesoramiento Prendario",
  description:
    "Te explicamos exactamente qué firmaste al empeñar, cuánto vas a pagar y qué opciones tienes — con datos reales y evaluación justa, sin letras chiquitas.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${marcellus.variable} ${inter.variable} font-sans bg-papel text-esmeralda antialiased`}>
        {children}
      </body>
    </html>
  );
}
