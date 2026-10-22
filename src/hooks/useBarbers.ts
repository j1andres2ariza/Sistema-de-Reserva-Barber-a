import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BARBER_FALLBACK_PHOTOS, type Barber } from "@/data/barbershop";

interface BarberRow {
  id: string;
  name: string;
  position: number;
  photo_url: string | null;
  is_active: boolean;
  commission_rate: number;
}

export function useBarbers(activeOnly = false) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBarbers = useCallback(async () => {
    let query = supabase.from("barbers").select("*").order("position");
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (!error && data) {
      setBarbers(
        (data as BarberRow[]).map((b) => ({
          id: b.id,
          name: b.name,
          position: b.position,
          photo: b.photo_url ?? BARBER_FALLBACK_PHOTOS[b.id] ?? "",
          is_active: b.is_active,
          commission_rate: Number(b.commission_rate),
        })),
      );
    }
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => {
    fetchBarbers();
    const channel = supabase
      .channel(`barbers-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "barbers" },
        () => {
          fetchBarbers();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBarbers]);

  const updateBarber = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        photo_url?: string | null;
        is_active?: boolean;
        position?: number;
      },
    ) => {
      const { error } = await supabase
        .from("barbers")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    [],
  );

  const createBarber = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Nombre requerido");
    const slug =
      trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "barbero";
    const id = `${slug}-${Date.now().toString(36)}`;
    const { data: existing } = await supabase
      .from("barbers")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = ((existing?.[0]?.position as number | undefined) ?? 0) + 1;
    const { error } = await supabase
      .from("barbers")
      .insert({ id, name: trimmed, position: nextPos, is_active: true });
    if (error) throw error;
    return id;
  }, []);

  const deleteBarber = useCallback(async (id: string) => {
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const uploadPhoto = useCallback(async (id: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("barber-photos")
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("barber-photos").getPublicUrl(path);
    const { error: saveError } = await supabase
      .from("barbers")
      .update({ photo_url: data.publicUrl })
      .eq("id", id);
    if (saveError) throw saveError;
    return data.publicUrl;
  }, []);

  return {
    barbers,
    loading,
    updateBarber,
    uploadPhoto,
    createBarber,
    deleteBarber,
    refresh: fetchBarbers,
  };
}
