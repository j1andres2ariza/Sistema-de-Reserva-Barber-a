import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Percent, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "@/hooks/useFinance";
import { useBarbers } from "@/hooks/useBarbers";
import { formatPrice } from "@/data/barbershop";
import { useToast } from "@/hooks/use-toast";

export default function CommissionsTab() {
  const { sales } = useFinance();
  const { barbers, refresh } = useBarbers();
  const { toast } = useToast();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [rates, setRates] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const monthSales = useMemo(() => sales.filter((s) => s.date.startsWith(month)), [sales, month]);

  const rows = useMemo(() => {
    return barbers.map((b) => {
      const bSales = monthSales.filter((s) => s.barber_id === b.id);
      const services = bSales.reduce(
        (sum, s) => sum + s.items.filter((i) => i.item_type === "service").reduce((x, i) => x + i.subtotal, 0),
        0
      );
      const productsTotal = bSales.reduce(
        (sum, s) => sum + s.items.filter((i) => i.item_type === "product").reduce((x, i) => x + i.subtotal, 0),
        0
      );
      const rate = Number(b.commission_rate ?? 50);
      return { barber: b, count: bSales.length, services, productsTotal, rate, commission: (services * rate) / 100 };
    });
  }, [barbers, monthSales]);

  async function saveRate(id: string) {
    const value = Number(rates[id]);
    if (isNaN(value) || value < 0 || value > 100) {
      toast({ title: "Porcentaje inválido", description: "Debe estar entre 0 y 100", variant: "destructive" });
      return;
    }
    setSavingId(id);
    try {
      const { error } = await supabase.from("barbers").update({ commission_rate: value }).eq("id", id);
      if (error) throw error;
      setRates((r) => { const c = { ...r }; delete c[id]; return c; });
      await refresh();
      toast({ title: "Comisión actualizada" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e instanceof Error ? e.message : null) ?? "No se pudo actualizar", variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  }

  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  const inputCls = "px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Percent size={20} /> Comisiones de barberos
        </h2>
        <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>
      <p className="text-sm text-muted-foreground">
        La comisión se calcula sobre las ventas de servicios registradas en Caja para cada barbero.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-3 px-3">Barbero</th>
              <th className="text-right py-3 px-3">Ventas</th>
              <th className="text-right py-3 px-3">Servicios</th>
              <th className="text-right py-3 px-3">Productos</th>
              <th className="text-center py-3 px-3">% Comisión</th>
              <th className="text-right py-3 px-3">A pagar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.barber.id} className="border-b border-border/50 hover:bg-muted/50">
                <td className="py-3 px-3 text-foreground font-medium">{r.barber.name}</td>
                <td className="py-3 px-3 text-right text-muted-foreground">{r.count}</td>
                <td className="py-3 px-3 text-right text-foreground">{formatPrice(r.services)}</td>
                <td className="py-3 px-3 text-right text-muted-foreground">{formatPrice(r.productsTotal)}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      type="number"
                      value={rates[r.barber.id] ?? String(r.rate)}
                      onChange={(e) => setRates((s) => ({ ...s, [r.barber.id]: e.target.value }))}
                      className="w-16 px-2 py-1 border border-border rounded bg-background text-foreground text-xs text-center"
                    />
                    <button
                      onClick={() => saveRate(r.barber.id)}
                      disabled={savingId === r.barber.id || rates[r.barber.id] === undefined}
                      className="p-1 text-foreground hover:bg-muted rounded disabled:opacity-30"
                      title="Guardar"
                    >
                      <Save size={14} />
                    </button>
                  </div>
                </td>
                <td className="py-3 px-3 text-right font-display font-bold text-foreground">{formatPrice(r.commission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right">
        <p className="text-muted-foreground text-sm">Total comisiones del mes</p>
        <p className="font-display text-2xl font-bold text-foreground">{formatPrice(totalCommission)}</p>
      </div>
    </div>
  );
}
