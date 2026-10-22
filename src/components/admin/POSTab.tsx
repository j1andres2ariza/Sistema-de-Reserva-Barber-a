import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ShoppingCart, Plus, Trash2, Receipt } from "lucide-react";
import { useFinance, type SaleItem } from "@/hooks/useFinance";
import { useInventory } from "@/hooks/useInventory";
import { useBarbers } from "@/hooks/useBarbers";
import { SERVICES, formatPrice } from "@/data/barbershop";
import { useToast } from "@/hooks/use-toast";

const PAYMENTS = ["efectivo", "nequi", "daviplata", "transferencia", "tarjeta"];

export default function POSTab() {
  const { sales, loading, createSale, deleteSale } = useFinance();
  const { products, registerMovement } = useInventory();
  const { barbers } = useBarbers();
  const { toast } = useToast();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [barberId, setBarberId] = useState("");
  const [clientName, setClientName] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  function addService(id: string) {
    const s = SERVICES.find((x) => x.id === id);
    if (!s) return;
    setCart((c) => [...c, { item_type: "service", item_ref: s.id, name: s.name, quantity: 1, unit_price: s.price, subtotal: s.price }]);
  }

  function addProduct(id: string) {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setCart((c) => [...c, { item_type: "product", item_ref: p.id, name: p.name, quantity: 1, unit_price: p.price, subtotal: p.price }]);
  }

  function setQty(index: number, qty: number) {
    setCart((c) => c.map((i, idx) => (idx === index ? { ...i, quantity: qty, subtotal: qty * i.unit_price } : i)));
  }

  function removeItem(index: number) {
    setCart((c) => c.filter((_, idx) => idx !== index));
  }

  async function handleSave() {
    if (!cart.length) return;
    setSaving(true);
    try {
      await createSale(
        { date, barber_id: barberId || null, client_name: clientName.trim() || null, payment_method: payment },
        cart
      );
      // Descontar stock de los productos vendidos
      for (const item of cart) {
        if (item.item_type === "product" && item.item_ref) {
          try {
            await registerMovement(item.item_ref, "out", item.quantity, "Venta");
          } catch { /* stock ya en cero */ }
        }
      }
      setCart([]);
      setClientName("");
      toast({ title: "Venta registrada", description: formatPrice(total) });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e instanceof Error ? e.message : null) ?? "No se pudo registrar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const daySales = useMemo(() => sales.filter((s) => s.date === filterDate), [sales, filterDate]);
  const dayTotal = daySales.reduce((s, v) => s + v.total, 0);

  const inputCls = "px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground";

  return (
    <div className="space-y-8">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <ShoppingCart size={20} /> Caja / Ventas
      </h2>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <div className="grid sm:grid-cols-4 gap-2">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          <select className={inputCls} value={barberId} onChange={(e) => setBarberId(e.target.value)}>
            <option value="">Barbero (opcional)</option>
            {barbers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input className={inputCls} placeholder="Cliente (opcional)" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          <select className={inputCls} value={payment} onChange={(e) => setPayment(e.target.value)}>
            {PAYMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <select className={inputCls} value="" onChange={(e) => e.target.value && addService(e.target.value)}>
            <option value="">+ Agregar servicio</option>
            {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatPrice(s.price)}</option>)}
          </select>
          <select className={inputCls} value="" onChange={(e) => e.target.value && addProduct(e.target.value)}>
            <option value="">+ Agregar producto</option>
            {products.filter((p) => p.is_active).map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)} (stock {p.stock})</option>
            ))}
          </select>
        </div>

        {cart.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Agrega servicios o productos a la venta</p>
        ) : (
          <div className="space-y-2">
            {cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 border-b border-border/50 pb-2">
                <span className="flex-1 text-sm text-foreground">
                  {item.name}
                  <span className="ml-2 text-xs text-muted-foreground uppercase">{item.item_type === "service" ? "servicio" : "producto"}</span>
                </span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => setQty(idx, Number(e.target.value) || 1)}
                  className="w-16 px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                />
                <span className="w-28 text-right text-sm font-bold text-foreground">{formatPrice(item.subtotal)}</span>
                <button onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive/80">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Total</span>
              <span className="font-display text-2xl font-bold text-foreground">{formatPrice(total)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !cart.length}
          className="px-4 py-2 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded hover:bg-foreground/90 transition-colors disabled:opacity-30 flex items-center gap-1"
        >
          <Plus size={14} /> {saving ? "Guardando..." : "Registrar venta"}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <Receipt size={18} className="text-muted-foreground" />
          <input type="date" className={inputCls} value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          <span className="text-sm text-muted-foreground">{daySales.length} venta(s) · {formatPrice(dayTotal)}</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando ventas...</div>
        ) : daySales.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No hay ventas en esta fecha</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-3 px-3">Hora</th>
                  <th className="text-left py-3 px-3">Cliente</th>
                  <th className="text-left py-3 px-3">Barbero</th>
                  <th className="text-left py-3 px-3">Detalle</th>
                  <th className="text-left py-3 px-3">Pago</th>
                  <th className="text-right py-3 px-3">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {daySales.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="py-3 px-3 font-mono text-muted-foreground">{new Date(s.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3 px-3 text-foreground">{s.client_name ?? "—"}</td>
                    <td className="py-3 px-3 text-foreground">{barbers.find((b) => b.id === s.barber_id)?.name ?? "—"}</td>
                    <td className="py-3 px-3 text-muted-foreground text-xs">{s.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                    <td className="py-3 px-3 text-muted-foreground capitalize">{s.payment_method}</td>
                    <td className="py-3 px-3 text-right font-display font-bold text-foreground">{formatPrice(s.total)}</td>
                    <td className="py-3 px-3">
                      <button onClick={() => deleteSale(s.id)} className="text-destructive hover:text-destructive/80">
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
    </div>
  );
}
