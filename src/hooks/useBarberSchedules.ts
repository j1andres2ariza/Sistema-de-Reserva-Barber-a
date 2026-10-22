import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type BarberSchedule = Tables<"barber_schedules">;

export function useBarberSchedules() {
  const [schedules, setSchedules] = useState<BarberSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from("barber_schedules")
      .select("*")
      .order("barber_id")
      .order("day_of_week");
    if (!error && data) setSchedules(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();

    const channel = supabase
      .channel(`schedules-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "barber_schedules" },
        () => {
          fetchSchedules();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSchedules]);

  const getBarberSchedule = useCallback(
    (barberId: string, dayOfWeek: number) =>
      schedules.find(
        (s) => s.barber_id === barberId && s.day_of_week === dayOfWeek,
      ),
    [schedules],
  );

  const isBarberAvailable = useCallback(
    (barberId: string, dayOfWeek: number) => {
      const schedule = getBarberSchedule(barberId, dayOfWeek);
      return schedule ? schedule.is_available : false;
    },
    [getBarberSchedule],
  );

  const getBarberOpenTime = useCallback(
    (barberId: string, dayOfWeek: number) =>
      getBarberSchedule(barberId, dayOfWeek)?.open_time ?? "09:00",
    [getBarberSchedule],
  );

  const getBarberCloseTime = useCallback(
    (barberId: string, dayOfWeek: number) => {
      const schedule = getBarberSchedule(barberId, dayOfWeek);
      return schedule?.close_time ?? "19:30";
    },
    [getBarberSchedule],
  );

  const updateSchedule = useCallback(
    async (
      barberId: string,
      dayOfWeek: number,
      updates: {
        is_available?: boolean;
        open_time?: string;
        close_time?: string;
      },
    ) => {
      const { error } = await supabase
        .from("barber_schedules")
        .update(updates)
        .eq("barber_id", barberId)
        .eq("day_of_week", dayOfWeek);
      if (error) throw error;
    },
    [],
  );

  return {
    schedules,
    loading,
    getBarberSchedule,
    isBarberAvailable,
    getBarberOpenTime,
    getBarberCloseTime,
    updateSchedule,
  };
}
