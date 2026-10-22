import logoWhite from "@/assets/logo-white.jpeg";

export default function Footer() {
  return (
    <footer className="relative bg-background py-14 border-t border-border/60">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11">
            <div className="absolute -inset-0.5 hexagon-clip bg-gradient-to-br from-gold via-gold/40 to-gold/80" />
            <div className="relative w-full h-full hexagon-clip overflow-hidden bg-primary">
              <img src={logoWhite} alt="Edwin Zambrano Barbería" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <p className="font-display font-semibold text-foreground">Edwin Zambrano</p>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Santa Marta · Colombia</p>
          </div>
        </div>

        <p className="text-muted-foreground/70 text-xs">
          © {new Date().getFullYear()} Barbería Edwin Zambrano. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
