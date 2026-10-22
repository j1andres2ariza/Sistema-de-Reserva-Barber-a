import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reason: string | null;
  created_at: string;
}

const num = (v: unknown) => Number(v ?? 0);

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    setProducts(
      (p ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        unit: r.unit,
        price: num(r.price),
        cost: num(r.cost),
        stock: num(r.stock),
        min_stock: num(r.min_stock),
        is_active: r.is_active,
      })),
    );
    setMovements((m ?? []).map((r) => ({ ...r, quantity: num(r.quantity) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`inventory-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        fetchAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_movements" },
        fetchAll,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createProduct = useCallback(async (p: Partial<Product>) => {
    const { error } = await supabase.from("products").insert({
      name: p.name!,
      category: p.category ?? "general",
      unit: p.unit ?? "unidad",
      price: p.price ?? 0,
      cost: p.cost ?? 0,
      stock: p.stock ?? 0,
      min_stock: p.min_stock ?? 0,
    });
    if (error) throw error;
  }, []);

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Product>) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    [],
  );

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const registerMovement = useCallback(
    async (
      productId: string,
      type: "in" | "out" | "adjust",
      quantity: number,
      reason?: string,
    ) => {
      const product = products.find((p) => p.id === productId);
      if (!product) throw new Error("Producto no encontrado");
      const newStock =
        type === "in"
          ? product.stock + quantity
          : type === "out"
            ? product.stock - quantity
            : quantity;
      const { error } = await supabase.from("stock_movements").insert({
        product_id: productId,
        type,
        quantity,
        reason: reason ?? null,
      });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("products")
        .update({ stock: Math.max(newStock, 0) })
        .eq("id", productId);
      if (upErr) throw upErr;
    },
    [products],
  );

  const lowStock = products.filter(
    (p) => p.is_active && p.stock <= p.min_stock,
  );
  const inventoryValue = products.reduce((s, p) => s + p.stock * p.cost, 0);

  return {
    products,
    movements,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    registerMovement,
    lowStock,
    inventoryValue,
    refresh: fetchAll,
  };
}
