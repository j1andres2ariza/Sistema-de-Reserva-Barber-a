import { useState } from "react";
import { Package, Plus, Trash2, AlertTriangle, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { useInventory, type Product } from "@/hooks/useInventory";
import { formatPrice } from "@/data/barbershop";
import { useToast } from "@/hooks/use-toast";

const emptyForm = { name: "", category: "general", unit: "unidad", price: "", cost: "", stock: "", min_stock: "" };

export default function InventoryTab() {
  const { products, movements, loading, createProduct, updateProduct, deleteProduct, registerMovement, lowStock, inventoryValue } = useInventory();
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [moveQty, setMoveQty] = useState<Record<string, string>>({});

  async function handleCreate() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProduct({
        name: form.name.trim(),
        category: form.category.trim() || "general",
        unit: form.unit.trim() || "unidad",
        price: Number(form.price) || 0,
        cost: Number(form.cost) || 0,
        stock: Number(form.stock) || 0,
        min_stock: Number(form.min_stock) || 0,
      });
      setForm(emptyForm);
      toast({ title: "Producto agregado" });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e instanceof Error ? e.message : null) ?? "No se pudo agregar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleMove(p: Product, type: "in" | "out") {
    const qty = Number(moveQty[p.id]);
    if (!qty || qty <= 0) {
      toast({ title: "Cantidad inválida", variant: "destructive" });
      return;
    }
    try {
      await registerMovement(p.id, type, qty, type === "in" ? "Entrada manual" : "Salida manual");
      setMoveQty((m) => ({ ...m, [p.id]: "" }));
      toast({ title: type === "in" ? "Entrada registrada" : "Salida registrada", description: `${p.name} · ${qty}` });
    } catch (e: unknown) {
      toast({ title: "Error", description: (e instanceof Error ? e.message : null) ?? "No se pudo registrar", variant: "destructive" });
    }
  }

  async function handleDelete(p: Product) {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return;
    try {
      await deleteProduct(p.id);
      toast({ title: "Producto eliminado" });
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  }

  const inputCls = "px-3 py-2 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:border-foreground";

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <Package size={20} /> Inventario
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Productos</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{products.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Unidades en stock</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{products.reduce((s, p) => s + p.stock, 0)}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor inventario</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{formatPrice(inventoryValue)}</p>
        </div>
        <div className={`p-4 rounded-lg border ${lowStock.length ? "border-destructive/50 bg-destructive/10" : "bg-card border-border"}`}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Bajo stock</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{lowStock.length}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-2 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
          <AlertTriangle size={16} className="text-destructive mt-0.5" />
          <p className="text-foreground">
            Reponer: {lowStock.map((p) => `${p.name} (${p.stock} ${p.unit})`).join(", ")}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Nuevo producto</p>
        <div className="grid sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <input className={inputCls} placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className={inputCls} placeholder="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Costo" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Precio venta" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Stock inicial" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input className={inputCls} type="number" placeholder="Stock mínimo" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !form.name.trim()}
          className="px-4 py-2 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded hover:bg-foreground/90 transition-colors disabled:opacity-30 flex items-center gap-1"
        >
          <Plus size={14} /> {saving ? "Guardando..." : "Agregar producto"}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Cargando inventario...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <p>Aún no hay productos registrados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-3 px-3">Producto</th>
                <th className="text-left py-3 px-3">Categoría</th>
                <th className="text-right py-3 px-3">Costo</th>
                <th className="text-right py-3 px-3">Precio</th>
                <th className="text-right py-3 px-3">Stock</th>
                <th className="text-right py-3 px-3">Mín.</th>
                <th className="text-center py-3 px-3">Movimiento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/50 ${p.stock <= p.min_stock ? "bg-destructive/5" : ""}`}>
                  <td className="py-3 px-3 text-foreground font-medium">{p.name}</td>
                  <td className="py-3 px-3 text-muted-foreground">{p.category}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{formatPrice(p.cost)}</td>
                  <td className="py-3 px-3 text-right text-foreground">{formatPrice(p.price)}</td>
                  <td className="py-3 px-3 text-right font-bold text-foreground">{p.stock}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{p.min_stock}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        value={moveQty[p.id] ?? ""}
                        onChange={(e) => setMoveQty((m) => ({ ...m, [p.id]: e.target.value }))}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-border rounded bg-background text-foreground text-xs"
                      />
                      <button onClick={() => handleMove(p, "in")} className="p-1 text-foreground hover:bg-muted rounded" title="Entrada">
                        <ArrowDownCircle size={16} />
                      </button>
                      <button onClick={() => handleMove(p, "out")} className="p-1 text-foreground hover:bg-muted rounded" title="Salida">
                        <ArrowUpCircle size={16} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button onClick={() => handleDelete(p)} className="text-destructive hover:text-destructive/80">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {movements.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Últimos movimientos</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {movements.slice(0, 20).map((m) => {
              const p = products.find((x) => x.id === m.product_id);
              return (
                <div key={m.id} className="flex justify-between text-xs border-b border-border/40 py-2">
                  <span className="text-foreground">{p?.name ?? "Producto"}</span>
                  <span className={m.type === "in" ? "text-foreground" : "text-muted-foreground"}>
                    {m.type === "in" ? "+" : m.type === "out" ? "-" : "="} {m.quantity} · {m.reason ?? ""}
                  </span>
                  <span className="text-muted-foreground">{new Date(m.created_at).toLocaleString("es-CO")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
