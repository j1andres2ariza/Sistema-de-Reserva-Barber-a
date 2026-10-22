
-- Add duration to bookings (computed from service in code, but store for slot-blocking accuracy)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

-- Create barbers table
CREATE TABLE IF NOT EXISTS public.barbers (
  id text PRIMARY KEY,
  name text NOT NULL,
  position integer NOT NULL,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view barbers" ON public.barbers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins can insert barbers" ON public.barbers FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update barbers" ON public.barbers FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete barbers" ON public.barbers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_barbers_updated_at BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed barbers (matching current ids in code/schedules)
INSERT INTO public.barbers (id, name, position) VALUES
  ('jainer', 'Jainer Cuenta', 1),
  ('edwin', 'Edwin Zambrano', 2),
  ('diego', 'Diego Pérez', 3),
  ('andres', 'Andrés García', 4)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket for barber photos
INSERT INTO storage.buckets (id, name, public) VALUES ('barber-photos', 'barber-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view barber photos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'barber-photos');
CREATE POLICY "Admins can upload barber photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update barber photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete barber photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'barber-photos' AND has_role(auth.uid(), 'admin'::app_role));
