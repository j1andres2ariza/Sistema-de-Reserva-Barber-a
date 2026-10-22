import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SaleItem {
  id?: string;
  sale_id?: string;
  item_type: "service" | "product";
  item_ref: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string;
  barber_id: string | null;
  client_name: string | null;
  payment_method: string;
  total: number;
  notes: string | null;
  created_at: string;
  items: SaleItem[];
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

const num = (v: unknown) => Number(v ?? 0);

export function useFinance() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [{ data: s }, { data: si }, { data: e }] = await Promise.all([
      supabase
        .from("sales")
        .select("*")
        .order("date", { ascending: false })
        .limit(500),
      supabase.from("sale_items").select("*"),
      supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false })
        .limit(500),
    ]);
    const itemsBySale = new Map<string, SaleItem[]>();
    (si ?? []).forEach((r) => {
      const arr = itemsBySale.get(r.sale_id) ?? [];
      arr.push({
        id: r.id,
        sale_id: r.sale_id,
        item_type: r.item_type as "service" | "product",
        item_ref: r.item_ref,
        name: r.name,
        quantity: num(r.quantity),
        unit_price: num(r.unit_price),
        subtotal: num(r.subtotal),
      });
      itemsBySale.set(r.sale_id, arr);
    });
    setSales(
      (s ?? []).map((r) => ({
        ...r,
        total: num(r.total),
        items: itemsBySale.get(r.id) ?? [],
      })),
    );
    setExpenses((e ?? []).map((r) => ({ ...r, amount: num(r.amount) })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel(`finance-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        fetchAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sale_items" },
        fetchAll,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        fetchAll,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createSale = useCallback(
    async (
      sale: {
        date: string;
        barber_id: string | null;
        client_name: string | null;
        payment_method: string;
        notes?: string | null;
      },
      items: SaleItem[],
    ) => {
      const total = items.reduce((s, i) => s + i.subtotal, 0);
      const { data, error } = await supabase
        .from("sales")
        .insert({ ...sale, notes: sale.notes ?? null, total })
        .select("id")
        .single();
      if (error) throw error;
      const saleId = data.id;
      if (items.length) {
        const { error: iErr } = await supabase.from("sale_items").insert(
          items.map((i) => ({
            sale_id: saleId,
            item_type: i.item_type,
            item_ref: i.item_ref,
            name: i.name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
          })),
        );
        if (iErr) throw iErr;
      }
      return saleId;
    },
    [],
  );

  const deleteSale = useCallback(async (id: string) => {
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const createExpense = useCallback(
    async (e: {
      date: string;
      category: string;
      description: string;
      amount: number;
    }) => {
      const { error } = await supabase.from("expenses").insert(e);
      if (error) throw error;
    },
    [],
  );

  const deleteExpense = useCallback(async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  }, []);

  return {
    sales,
    expenses,
    loading,
    createSale,
    deleteSale,
    createExpense,
    deleteExpense,
    refresh: fetchAll,
  };
}
