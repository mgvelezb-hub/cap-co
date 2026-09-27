import Logo from "@/components/Logo";
import Reveal from "@/components/Reveal";
import { WHATSAPP_URL, SOCIAL, BRAND, CORREO_CONTACTO } from "@/lib/constants";

function IconFacebook(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <circle cx="16" cy="16" r="12.5" />
      <path d="M18.5 12h-2a1.8 1.8 0 0 0-1.8 1.8V15h3.6l-.5 3h-3.1v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconInstagram(props) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" {...props}>
      <rect x="4.5" y="4.5" width="23" height="23" rx="6.5" />
      <circle cx="16" cy="16" r="5.8" />
      <circle cx="22.6" cy="9.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="bg-esmeralda text-sobre-verde">
      <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <h2 className="max-w-[18ch] font-serif text-[clamp(2rem,4.5vw,3.6rem)] leading-tight">
              ¿Tienes una boleta que no entiendes?
            </h2>
            <a
              href={WHATSAPP_URL}
              className="mt-10 inline-block rounded-full bg-sobre-verde px-8 py-4 font-sans text-sm font-medium tracking-wide text-esmeralda transition-transform duration-300 ease-expo hover:scale-[1.03]"
            >
              Escríbenos por WhatsApp
            </a>
            <p className="mt-4 font-sans text-sm text-sobre-verde/70">
              Lunes a viernes, de 9:00 a 17:00 ·{" "}
              <a href={`mailto:${CORREO_CONTACTO}`} className="underline underline-offset-4">
                {CORREO_CONTACTO}
              </a>
            </p>
            {(SOCIAL.facebook !== "#" || SOCIAL.instagram !== "#") && (
            <div className="mt-10 flex items-center gap-4">
              <span className="font-sans text-xs uppercase tracking-[0.2em] text-sobre-verde/50">
                Síguenos
              </span>
              {SOCIAL.facebook !== "#" && <a
                href={SOCIAL.facebook}
                aria-label="Facebook de CAP & Co."
                className="text-sobre-verde/70 transition-colors hover:text-sobre-verde"
              >
                <IconFacebook className="h-6 w-6" />
              </a>}
              {SOCIAL.instagram !== "#" && <a
                href={SOCIAL.instagram}
                aria-label="Instagram de CAP & Co."
                className="text-sobre-verde/70 transition-colors hover:text-sobre-verde"
              >
                <IconInstagram className="h-6 w-6" />
              </a>}
            </div>
            )}
          </Reveal>
          <Reveal delay={200} className="hidden justify-end lg:col-span-4 lg:flex">
            <Logo className="h-40 w-auto" color="#F4F6F1" />
          </Reveal>
        </div>
        <div className="mt-20 flex flex-col items-start justify-between gap-4 border-t border-sobre-verde/15 pt-8 font-sans text-xs text-sobre-verde/60 md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} {BRAND.nombre} · {BRAND.slogan}
          </span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <a href="/#preguntas" className="inline-block py-2 underline-offset-4 hover:underline">
              Preguntas frecuentes
            </a>
            <a href="/glosario" className="inline-block py-2 underline-offset-4 hover:underline">
              Glosario
            </a>
            <a href="/aviso-de-privacidad" className="inline-block py-2 underline-offset-4 hover:underline">
              Aviso de privacidad
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
