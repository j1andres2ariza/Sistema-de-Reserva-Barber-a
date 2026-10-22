
DROP POLICY IF EXISTS "Anyone can view bookings" ON public.bookings;

CREATE POLICY "Admins can view bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_public_availability()
RETURNS TABLE (
  barber_id text,
  booking_date text,
  booking_time text,
  duration_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.barber_id, b.date AS booking_date, b.time AS booking_time, b.duration_minutes
  FROM public.bookings b
  WHERE b.date >= to_char((now() AT TIME ZONE 'UTC')::date - INTERVAL '1 day', 'YYYY-MM-DD');
$$;

REVOKE ALL ON FUNCTION public.get_public_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_availability() TO anon, authenticated;
