import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getOccupiedSlots } from "@/data/barbershop";

interface AvailabilityRow {
  barber_id: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
}
export interface NewBooking {
  request_id: string;
  client_name: string;
  client_phone: string;
  barber_id: string;
  service_id: string;
  date: string;
  time: string;
  whatsapp_consent: true;
}
const ERRORS: Record<string, string> = {
  SLOT_TAKEN: "Ese horario acaba de ser reservado. Elige otro.",
  RATE_LIMIT:
    "Se alcanzó el límite de reservas. Intenta más tarde o contacta la barbería.",
  INVALID_PHONE:
    "Escribe un WhatsApp válido. Para otros países incluye el código de país.",
  INVALID_BOOKING:
    "Revisa tus datos y la autorización para recibir la confirmación.",
  INVALID_DATE:
    "La fecha u hora ya no está disponible. Elige un nuevo horario.",
  INVALID_SERVICE: "El servicio ya no está disponible.",
  INVALID_BARBER: "El barbero ya no está disponible.",
  BARBER_UNAVAILABLE: "El barbero no trabaja ese día.",
  OUTSIDE_SCHEDULE: "El horario del barbero cambió. Elige otra hora.",
  SERVER_CONFIGURATION:
    "El sistema de reservas no está configurado. Contacta la barbería.",
};
export function useBookings(admin = false) {
  const [bookings, setBookings] = useState<Tables<"bookings">[]>([]);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const fetchBookings = useCallback(async () => {
    if (!admin) {
      setBookings([]);
      return;
    }
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date")
      .order("time");
    if (error) throw error;
    setBookings(data ?? []);
  }, [admin]);
  const fetchAvailability = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_public_availability");
    setAvailabilityError(Boolean(error));
    if (error) throw error;
    setAvailability(data ?? []);
  }, []);
  useEffect(() => {
    setLoading(true);
    const refresh = () =>
      Promise.allSettled([fetchBookings(), fetchAvailability()]).finally(() =>
        setLoading(false),
      );
    void refresh();
    const channel = supabase
      .channel(`bookings-${admin ? "admin" : "public"}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          void refresh();
        },
      )
      .subscribe();
    // Anonymous users cannot receive private rows through Realtime. Poll the PII-free RPC as well.
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 20000);
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
      void supabase.removeChannel(channel);
    };
  }, [admin, fetchBookings, fetchAvailability]);
  const addBooking = useCallback(
    async (booking: NewBooking) => {
      const { data, error } = await supabase.functions.invoke(
        "create-booking",
        { body: booking },
      );
      if (error) {
        let code = "";
        try {
          if (error.context instanceof Response)
            code = (await error.context.json()).error;
        } catch {
          /* network failure */
        }
        throw new Error(
          ERRORS[code] ??
            "No pudimos confirmar el resultado. Intenta otra vez con los mismos datos; no se duplicará la reserva.",
        );
      }
      if (!data?.booking?.id)
        throw new Error(
          "No se recibió una confirmación válida. Intenta otra vez con los mismos datos.",
        );
      // A refresh failure after saving must never report the booking itself as failed.
      void fetchAvailability().catch(() => undefined);
      return data.booking as {
        id: string;
        date: string;
        time: string;
        notifications: "queued" | "simulated";
      };
    },
    [fetchAvailability],
  );
  const getBookingsByDate = useCallback(
    (date: string) => bookings.filter((b) => b.date === date),
    [bookings],
  );
  const getOccupiedSlotsForBarber = useCallback(
    (barberId: string, date: string) => {
      const occupied = new Set<string>();
      availability
        .filter((b) => b.barber_id === barberId && b.booking_date === date)
        .forEach((b) => {
          getOccupiedSlots(b.booking_time, b.duration_minutes).forEach((s) =>
            occupied.add(s),
          );
        });
      return occupied;
    },
    [availability],
  );
  const deleteBooking = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      await fetchBookings();
      void fetchAvailability().catch(() => undefined);
    },
    [fetchBookings, fetchAvailability],
  );
  return {
    bookings,
    loading,
    availabilityError,
    addBooking,
    getBookingsByDate,
    getOccupiedSlotsForBarber,
    deleteBooking,
  };
}
