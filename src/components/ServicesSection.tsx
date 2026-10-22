import { SERVICES, formatPrice } from "@/data/barbershop";
import { Scissors, Clock } from "lucide-react";
import servicesBg from "@/assets/services-bg.jpeg";

export default function ServicesSection() {
  return (
    <section id="servicios" className="relative py-24 sm:py-32 bg-background overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
        style={{ backgroundImage: `url(${servicesBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
      <div className="absolute inset-x-0 top-0 h-px hairline" />
      <div className="absolute right-0 top-1/4 w-[420px] h-[420px] glow-gold rounded-full" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mb-14 reveal-on-scroll">
          <div className="chip text-foreground/80 mb-6">
            <span className="chip-dot" />
            <span className="uppercase">Nuestros servicios</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.05]">
            Todo lo que necesitas,
            <span className="block text-foreground/40">un solo lugar.</span>
          </h2>
          <p className="text-muted-foreground mt-5 text-base sm:text-lg font-light">
            Precios claros y tiempos reales de cada servicio.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl reveal-on-scroll">
          {SERVICES.map((service) => (
            <div
              key={service.id}
              className="group surface-card surface-card-hover rounded-3xl p-6 flex flex-col justify-between min-h-[168px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-foreground/5 border border-border/60 flex items-center justify-center group-hover:bg-gold/15 group-hover:border-gold/40 transition-colors">
                  <Scissors size={17} className="text-muted-foreground group-hover:text-gold transition-colors" />
                </div>
                {service.duration ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
                    <Clock size={12} /> {service.duration} min
                  </span>
                ) : null}
              </div>
              <div className="mt-6">
                <p className="font-medium text-foreground text-base">{service.name}</p>
                <p className="font-display text-2xl font-bold text-gradient-gold mt-1">
                  {formatPrice(service.price)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
