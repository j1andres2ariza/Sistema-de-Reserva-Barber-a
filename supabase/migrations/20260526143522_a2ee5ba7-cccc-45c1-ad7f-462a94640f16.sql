
-- Length checks on bookings
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_client_name_len CHECK (char_length(client_name) BETWEEN 2 AND 100),
  ADD CONSTRAINT bookings_client_phone_len CHECK (char_length(client_phone) BETWEEN 7 AND 20),
  ADD CONSTRAINT bookings_service_id_len CHECK (char_length(service_id) BETWEEN 1 AND 64),
  ADD CONSTRAINT bookings_barber_id_len CHECK (char_length(barber_id) BETWEEN 1 AND 64),
  ADD CONSTRAINT bookings_duration_range CHECK (duration_minutes BETWEEN 15 AND 240);

-- Prevent double-booking the same barber/date/time
CREATE UNIQUE INDEX IF NOT EXISTS bookings_barber_date_time_unique
  ON public.bookings (barber_id, date, time);

-- Trigger helper function should not be API-callable
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
