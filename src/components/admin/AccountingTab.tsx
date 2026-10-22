import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Wallet, Plus, Trash2, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useFinance } from "@/hooks/useFinance";
import { formatPrice } from "@/data/barbershop";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["general", "insumos", "arriendo", "servicios públicos", "nómina", "publicidad", "mantenimiento", "impuestos"];

export default function AccountingTab() {
  const { sales, expenses, loading, createExpense, deleteExpense } = useFinance();
  const { toast } = useToast();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [form, setForm] = useState({ date: format(new Date(), "yyyy-MM-dd"), category: "general", description: "", amount: "" });
  const [saving, setSaving] = useState(false);

  const monthSales = useMemo(() => sales.filter((s) => s.date.startsWith(month)), [sales, month]);
  const monthExpenses = useMemo(() => expenses.filter((e) => e.date.startsWith(month)), [expenses, month]);

  const income = monthSales.reduce((s, v) => s + v.total, 0);
  const outcome = monthExpenses.reduce((s, v) => s + v.amount, 0);
  const balance = income - outcome;

  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    monthSales.forEach((s) => { map[s.payment_method] = (map[s.payment_method] ?? 0) + s.total; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthSales]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  async function handleCreate() {
    const amount = Number(form.amount);
    if (!form.description.trim() || !amount) return;
    setSaving(true);
    try {
      await createExpense({ date: form.date, category: form.category, description: form.description.trim(), amount });
      setForm({ ...form, description: "", amount: "" });
      toast({ title: "Gasto registrado" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e instanceof Error ? e.message : null) ?? "No se pudo registrar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Wallet size={20} /> Contabilidad
        </h2>
        <input type="month" className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp size={12} /> Ingresos</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatPrice(income)}</p>
          <p className="text-xs text-muted-foreground">{monthSales.length} venta(s)</p>
        </div>
        <div className="bg-card p-5 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingDown size={12} /> Gastos</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatPrice(outcome)}</p>
          <p className="text-xs text-muted-foreground">{monthExpenses.length} registro(s)</p>
        </div>
        <div className={`p-5 rounded-lg border ${balance >= 0 ? "bg-card border-border" : "border-destructive/50 bg-destructive/10"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><PiggyBank size={12} /> Utilidad</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatPrice(balance)}</p>
          <p className="text-xs text-muted-foreground">{income > 0 ? Math.round((balance / income) * 100) : 0}% margen</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Ingresos por método de pago</p>
          {byPayment.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos</p> : byPayment.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
              <span className="capitalize text-foreground">{k}</span>
              <span className="font-bold text-foreground">{formatPrice(v)}</span>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Gastos por categoría</p>
          {byCategory.length === 0 ? <p className="text-sm text-muted-foreground">Sin datos</p> : byCategory.map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
              <span className="capitalize text-foreground">{k}</span>
              <span className="font-bold text-foreground">{formatPrice(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Registrar gasto</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className={inputCls} placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Monto" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !form.description.trim() || !Number(form.amount)}
          className="px-4 py-2 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded hover:bg-foreground/90 transition-colors disabled:opacity-30 flex items-center gap-1"
        >
          <Plus size={14} /> {saving ? "Guardando..." : "Agregar gasto"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : monthExpenses.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-3 px-3">Fecha</th>
                <th className="text-left py-3 px-3">Categoría</th>
                <th className="text-left py-3 px-3">Descripción</th>
                <th className="text-right py-3 px-3">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {monthExpenses.map((e) => (
                <tr key={e.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-3 font-mono text-muted-foreground">{e.date}</td>
                  <td className="py-3 px-3 capitalize text-foreground">{e.category}</td>
                  <td className="py-3 px-3 text-foreground">{e.description}</td>
                  <td className="py-3 px-3 text-right font-display font-bold text-foreground">{formatPrice(e.amount)}</td>
                  <td className="py-3 px-3">
                    <button onClick={() => deleteExpense(e.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
