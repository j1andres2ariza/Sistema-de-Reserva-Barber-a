import { useMemo } from "react";
import { format, subDays } from "date-fns";
import { LayoutDashboard, Calendar, ShoppingCart, Wallet, Package, AlertTriangle } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { useInventory } from "@/hooks/useInventory";
import { useBookings } from "@/hooks/useBookings";
import { useBarbers } from "@/hooks/useBarbers";
import { formatPrice } from "@/data/barbershop";

export default function DashboardTab() {
  const { sales, expenses } = useFinance();
  const { products, lowStock, inventoryValue } = useInventory();
  const { bookings } = useBookings(true);
  const { barbers } = useBarbers();

  const today = format(new Date(), "yyyy-MM-dd");
  const month = today.slice(0, 7);

  const todaySales = sales.filter((s) => s.date === today);
  const monthSales = sales.filter((s) => s.date.startsWith(month));
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month));

  const todayTotal = todaySales.reduce((s, v) => s + v.total, 0);
  const monthIncome = monthSales.reduce((s, v) => s + v.total, 0);
  const monthOutcome = monthExpenses.reduce((s, v) => s + v.amount, 0);
  const todayBookings = bookings.filter((b) => b.date === today).length;

  const last7 = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), 6 - i), "yyyy-MM-dd");
      const total = sales.filter((s) => s.date === d).reduce((s, v) => s + v.total, 0);
      return { date: d, total };
    });
  }, [sales]);
  const max7 = Math.max(...last7.map((d) => d.total), 1);

  const topBarbers = useMemo(() => {
    return barbers
      .map((b) => ({
        name: b.name,
        total: monthSales.filter((s) => s.barber_id === b.id).reduce((s, v) => s + v.total, 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [barbers, monthSales]);

  const cards = [
    { label: "Ventas de hoy", value: formatPrice(todayTotal), sub: `${todaySales.length} transacción(es)`, icon: ShoppingCart },
    { label: "Reservas de hoy", value: String(todayBookings), sub: "agendadas", icon: Calendar },
    { label: "Utilidad del mes", value: formatPrice(monthIncome - monthOutcome), sub: `${formatPrice(monthIncome)} ingresos`, icon: Wallet },
    { label: "Valor inventario", value: formatPrice(inventoryValue), sub: `${products.length} producto(s)`, icon: Package },
  ];

  return (
    <div className="space-y-8">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <LayoutDashboard size={20} /> Dashboard
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-card p-5 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <c.icon size={12} /> {c.label}
            </p>
            <p className="text-2xl font-display font-bold text-foreground mt-2">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-2 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
          <AlertTriangle size={16} className="text-destructive mt-0.5" />
          <p className="text-foreground">{lowStock.length} producto(s) con stock bajo: {lowStock.map((p) => p.name).join(", ")}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Ventas últimos 7 días</p>
          <div className="flex items-end gap-2 h-40">
            {last7.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-foreground/80 rounded-t" style={{ height: `${(d.total / max7) * 100}%`, minHeight: d.total ? 4 : 2 }} />
                <span className="text-[10px] text-muted-foreground">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Ranking de barberos (mes)</p>
          {topBarbers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas registradas</p>
          ) : (
            topBarbers.map((b, i) => (
              <div key={b.name} className="flex justify-between items-center text-sm py-2 border-b border-border/40 last:border-0">
                <span className="text-foreground">{i + 1}. {b.name}</span>
                <span className="font-bold text-foreground">{formatPrice(b.total)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
