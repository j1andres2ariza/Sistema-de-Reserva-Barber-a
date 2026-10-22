import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import logoWhite from "@/assets/logo-white.jpeg";
import { BARBERSHOP_NAME } from "@/data/barbershop";

const navLinks = [
  { href: "#inicio", label: "Inicio" },
  { href: "#servicios", label: "Servicios" },
  { href: "#barberos", label: "Barberos" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/60"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-[72px]">
        <a href="#inicio" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <div className="absolute -inset-0.5 hexagon-clip bg-gradient-to-br from-gold via-gold/40 to-gold/80 opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-full h-full hexagon-clip overflow-hidden bg-primary">
              <img src={logoWhite} alt={BARBERSHOP_NAME} className="w-full h-full object-cover" />
            </div>
          </div>
          <span className="font-display font-semibold text-foreground text-base hidden sm:inline">
            Edwin <span className="text-gold">Zambrano</span>
          </span>
        </a>

        <ul className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          <a href="#reservar" className="btn-pill btn-gold px-5 py-2.5 text-sm">
            Reservar
          </a>
        </div>

        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border/60 animate-fade-in">
          <ul className="flex flex-col py-3">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="px-6 pt-3">
              <a
                href="#reservar"
                onClick={() => setOpen(false)}
                className="btn-pill btn-gold w-full py-3 text-sm"
              >
                Reservar
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
