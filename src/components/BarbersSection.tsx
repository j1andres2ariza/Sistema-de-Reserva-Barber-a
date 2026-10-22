import { useBarbers } from "@/hooks/useBarbers";

export default function BarbersSection() {
  const { barbers } = useBarbers(true);

  return (
    <section id="barberos" className="relative py-24 sm:py-32 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px hairline" />
      <div className="absolute inset-0 opacity-[0.035]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="hex-barbers" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
              <path d="M28 66L0 50L0 16L28 0L56 16L56 50L28 66Z" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex-barbers)" />
        </svg>
      </div>
      <div className="absolute left-1/4 bottom-0 w-[460px] h-[460px] glow-gold rounded-full" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mb-14 reveal-on-scroll">
          <div className="chip text-foreground/80 mb-6">
            <span className="chip-dot" />
            <span className="uppercase">Conoce al equipo</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.05]">
            Nuestros
            <span className="block text-foreground/40">Barberos.</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 reveal-on-scroll">
          {barbers.map((barber, i) => (
            <div
              key={barber.id}
              className="group surface-card surface-card-hover rounded-3xl p-6 text-center reveal-on-scroll"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="relative mx-auto w-28 h-28 mb-5">
                <div className="absolute -inset-1 hexagon-clip bg-gradient-to-br from-gold via-gold/30 to-gold/80 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-full h-full hexagon-clip overflow-hidden bg-secondary/40 group-hover:scale-[1.04] transition-transform duration-500">
                  <img src={barber.photo} alt={barber.name} className="w-full h-full object-cover object-top" />
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{barber.name}</h3>
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em] mt-1">
                Puesto {barber.position}
              </p>
              <a
                href="#reservar"
                className="btn-pill btn-ghost-light mt-5 w-full py-2.5 text-xs"
              >
                Reservar
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
