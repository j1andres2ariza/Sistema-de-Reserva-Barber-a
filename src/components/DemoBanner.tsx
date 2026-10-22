export default function DemoBanner() {
  return (
    <aside
      aria-label="Modo de demostración"
      className="fixed bottom-0 inset-x-0 z-[100] border-t border-amber-400/30 bg-zinc-950 text-amber-100 px-4 py-3 text-center text-xs sm:text-sm shadow-lg"
    >
      <strong>Demostración local.</strong> Los datos se guardan en este equipo.
      WhatsApp está simulado.
      <a href="/admin" className="ml-3 underline underline-offset-4">
        Abrir administrador
      </a>
    </aside>
  );
}
