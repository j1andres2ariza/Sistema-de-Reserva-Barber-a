import logoWhite from "@/assets/logo-white.jpeg";
import heroBg from "@/assets/hero-bg.jpeg";
import { BARBERSHOP_SLOGAN } from "@/data/barbershop";

const stats = [
  { value: "4", label: "Barberos" },
  { value: "7", label: "Días a la semana" },
  { value: "30s", label: "Reservar online" },
];

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center bg-background overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Layered overlays for cinematic depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80" />

      {/* Soft gold glow */}
      <div className="absolute -left-32 top-1/3 w-[520px] h-[520px] glow-gold rounded-full" />

      {/* Hex pattern overlay */}
      <div className="absolute inset-0 opacity-[0.05]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="hex" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66Z" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>
      </div>

      {/* Logo top-left with gold ring */}
      <div className="absolute top-20 left-6 z-20 animate-fade-in">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
          <div className="absolute -inset-1 hexagon-clip bg-gradient-to-br from-gold via-gold/40 to-gold/80" />
          <div className="relative w-full h-full hexagon-clip overflow-hidden bg-secondary/10 flex items-center justify-center">
            <img src={logoWhite} alt="Edwin Zambrano Barbería" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-32 pb-20">
        <div className="max-w-2xl animate-fade-in">
          <div className="chip text-foreground/80 mb-8">
            <span className="chip-dot" />
            <span className="uppercase">Barbería en Santa Marta</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-[1.02] mb-6">
            Edwin <span className="text-gradient-gold">Zambrano</span>
            <span className="block text-foreground/40">Barbería.</span>
          </h1>

          <p className="text-muted-foreground text-lg sm:text-xl font-light leading-relaxed max-w-lg">
            {BARBERSHOP_SLOGAN}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#reservar" className="btn-pill btn-gold px-8 py-4 text-sm">
              Reservar Cita
            </a>
            <a href="#servicios" className="btn-pill btn-ghost-light px-8 py-4 text-sm">
              Ver Servicios
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/70 tracking-wide">
            Sin llamadas · Confirmación inmediata por WhatsApp
          </p>

          <div className="mt-12 grid grid-cols-3 gap-3 max-w-lg">
            {stats.map((s) => (
              <div key={s.label} className="surface-card rounded-2xl px-4 py-4">
                <p className="font-display text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-float-slow">
        <div className="w-px h-10 bg-gradient-to-b from-transparent to-gold/70" />
      </div>
    </section>
  );
}
