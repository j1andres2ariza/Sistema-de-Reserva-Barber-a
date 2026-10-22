import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
const LABELS: Record<string, string> = {
  simulated: "Simulado (sin envío)",
  pending: "Pendiente",
  processing: "En proceso",
  accepted: "Aceptado por WhatsApp",
  failed: "Falló",
};
export default function NotificationsTab() {
  const [rows, setRows] = useState<Tables<"whatsapp_notifications">[]>([]);
  const [error, setError] = useState(false);
  const { toast } = useToast();
  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("whatsapp_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setError(Boolean(error));
    if (data) setRows(data);
  }, []);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  async function retry(id: string) {
    const { error } = await supabase.rpc("retry_whatsapp_notification", {
      p_id: id,
    });
    toast({
      title: error ? "No se pudo reintentar" : "Aviso pendiente de reenvío",
      description: error?.message,
      variant: error ? "destructive" : "default",
    });
    await refresh();
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-display font-bold">
        Notificaciones de WhatsApp
      </h2>
      <p className="text-sm text-muted-foreground">
        Cada reserva genera un aviso para la barbería y otro para el cliente.
        Los fallos se reintentan hasta cinco veces. “Aceptado” indica que
        WhatsApp recibió la solicitud de envío; no confirma la entrega al
        teléfono.
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          No se pudieron cargar los avisos. Revisa la configuración de la base
          de datos.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {[
                "Reserva",
                "Destinatario",
                "WhatsApp",
                "Estado",
                "Intentos",
                "Código",
                "",
              ].map((h, i) => (
                <th key={i} className="p-3 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border/50">
                <td className="p-3 font-mono text-xs" title={row.booking_id}>
                  {row.booking_id.slice(0, 8)}
                </td>
                <td className="p-3">
                  {row.recipient === "admin" ? "Barbería" : "Cliente"}
                </td>
                <td className="p-3">+{row.phone}</td>
                <td className="p-3">{LABELS[row.status] ?? row.status}</td>
                <td className="p-3">{row.attempts}</td>
                <td className="p-3">{row.last_error_code ?? "—"}</td>
                <td className="p-3">
                  {row.status === "failed" && (
                    <button
                      onClick={() => void retry(row.id)}
                      className="underline"
                    >
                      Reintentar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!error && rows.length === 0 && (
        <p className="text-muted-foreground">Todavía no hay avisos.</p>
      )}
      <button
        onClick={() => void refresh()}
        className="px-4 py-2 border rounded-lg"
      >
        Actualizar
      </button>
    </div>
  );
}
