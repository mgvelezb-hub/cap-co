import { Marcellus, Inter } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({ weight: "400", subsets: ["latin"], variable: "--font-marcellus" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: { default: "CRM · CAP & Co.", template: "%s · CRM CAP & Co." },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${marcellus.variable} ${inter.variable} min-h-screen bg-papel font-sans text-esmeralda antialiased`}>{children}</body>
    </html>
  );
}
