"use client";

import { useEffect, useState } from "react";
import Logo from "./Logo";
import { WHATSAPP_URL, BRAND } from "@/lib/constants";

const LINKS = [
  ["/#quienes-somos", "¿Quiénes somos?"],
  ["/#decide-bien", "Decide bien"],
  ["/#boleta", "Tu boleta"],
  ["/#calculadora", "Calcula"],
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-500 ease-expo ${
        scrolled
          ? "border-b border-esmeralda/10 bg-papel/95 shadow-[0_1px_0_rgba(20,64,47,0.04)] backdrop-blur"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <a href="/" className="flex items-center gap-3">
          <Logo className={`w-auto transition-all duration-500 ease-expo ${scrolled ? "h-9" : "h-11"}`} />
          <div className="leading-tight">
            <div className="font-serif text-lg tracking-wide md:text-xl">{BRAND.nombre}</div>
            <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-esmeralda/60">
              {BRAND.slogan}
            </div>
          </div>
        </a>
        <nav className="hidden items-center gap-7 font-sans text-[15px] lg:flex">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="group relative text-esmeralda/75 transition-colors hover:text-esmeralda">
              {label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-esmeralda transition-all duration-300 ease-expo group-hover:w-full" />
            </a>
          ))}
          <a
            href={WHATSAPP_URL}
            className="rounded-full bg-esmeralda px-5 py-2.5 text-sm font-medium text-sobre-verde transition-transform duration-300 ease-expo hover:scale-[1.03]"
          >
            Cotiza por WhatsApp
          </a>
        </nav>
        <a
          href={WHATSAPP_URL}
          className="rounded-full bg-esmeralda px-4 py-2 text-sm font-medium text-sobre-verde lg:hidden"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}
