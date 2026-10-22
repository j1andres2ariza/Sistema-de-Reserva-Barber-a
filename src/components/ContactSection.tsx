import { MapPin, Clock, Phone } from "lucide-react";
import { BARBERSHOP_LOCATION, BARBERSHOP_PHONE, BARBERSHOP_FACEBOOK, BARBERSHOP_INSTAGRAM } from "@/data/barbershop";

export default function ContactSection() {
  return (
    <section id="contacto" className="relative py-24 sm:py-32 bg-background overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px hairline" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mb-14 reveal-on-scroll">
          <div className="chip text-foreground/80 mb-6">
            <span className="chip-dot" />
            <span className="uppercase">Encuéntranos</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-[1.05]">
            Contacto
            <span className="block text-foreground/40">y horarios.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: MapPin,
              title: "Ubicación",
              content: <p className="text-muted-foreground text-sm leading-relaxed">{BARBERSHOP_LOCATION}</p>,
            },
            {
              icon: Clock,
              title: "Horarios",
              content: (
                <>
                  <p className="text-muted-foreground text-sm">Lun - Sáb: 9:00am - 7:30pm</p>
                  <p className="text-muted-foreground text-sm">Dom y Festivos: 9:00am - 5:00pm</p>
                </>
              ),
            },
            {
              icon: Phone,
              title: "Contacto",
              content: (
                <a
                  href={`https://wa.me/57${BARBERSHOP_PHONE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground text-sm hover:text-gold transition-colors"
                >
                  WhatsApp: +57 {BARBERSHOP_PHONE}
                </a>
              ),
            },
          ].map(({ icon: Icon, title, content }, i) => (
            <div
              key={title}
              className="surface-card surface-card-hover rounded-3xl p-7 reveal-on-scroll"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="w-11 h-11 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center mb-5">
                <Icon size={18} className="text-gold" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{title}</h3>
              {content}
            </div>
          ))}
        </div>

        <div className="flex justify-center items-center gap-3 mt-12 reveal-on-scroll">
          <a
            href={BARBERSHOP_FACEBOOK}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill btn-ghost-light px-6 py-2.5 text-xs uppercase tracking-[0.2em]"
          >
            Facebook
          </a>
          <a
            href={BARBERSHOP_INSTAGRAM}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill btn-ghost-light px-6 py-2.5 text-xs uppercase tracking-[0.2em]"
          >
            Instagram
          </a>
        </div>
      </div>
    </section>
  );
}
