-- SOLO PARA UN PROYECTO NUEVO: ejecutar una vez.
BEGIN;


-- Tabla de reservas (acceso público para crear, admin para ver/eliminar)
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  barber_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de disponibilidad de barberos (admin gestiona)
CREATE TABLE public.barber_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_available BOOLEAN NOT NULL DEFAULT true,
  open_time TEXT NOT NULL DEFAULT '09:00',
  close_time TEXT NOT NULL DEFAULT '19:30',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barber_id, day_of_week)
);

-- Tabla de roles de usuario
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function para checar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Bookings: cualquiera puede insertar (reservar), solo admin puede ver todas y eliminar
CREATE POLICY "Anyone can create bookings"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view bookings"
  ON public.bookings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Barber schedules: cualquiera puede leer, solo admin puede modificar
CREATE POLICY "Anyone can view schedules"
  ON public.barber_schedules FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert schedules"
  ON public.barber_schedules FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update schedules"
  ON public.barber_schedules FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete schedules"
  ON public.barber_schedules FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles: solo lectura propia
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_barber_schedules_updated_at
  BEFORE UPDATE ON public.barber_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar horarios por defecto para los 4 barberos (7 días)
INSERT INTO public.barber_schedules (barber_id, day_of_week, is_available, open_time, close_time) VALUES
  ('jainer', 0, true, '09:00', '17:00'),
  ('jainer', 1, true, '09:00', '19:30'),
  ('jainer', 2, true, '09:00', '19:30'),
  ('jainer', 3, true, '09:00', '19:30'),
  ('jainer', 4, true, '09:00', '19:30'),
  ('jainer', 5, true, '09:00', '19:30'),
  ('jainer', 6, true, '09:00', '19:30'),
  ('edwin', 0, true, '09:00', '17:00'),
  ('edwin', 1, true, '09:00', '19:30'),
  ('edwin', 2, true, '09:00', '19:30'),
  ('edwin', 3, true, '09:00', '19:30'),
  ('edwin', 4, true, '09:00', '19:30'),
  ('edwin', 5, true, '09:00', '19:30'),
  ('edwin', 6, true, '09:00', '19:30'),
  ('diego', 0, true, '09:00', '17:00'),
  ('diego', 1, true, '09:00', '19:30'),
  ('diego', 2, true, '09:00', '19:30'),
  ('diego', 3, true, '09:00', '19:30'),
  ('diego', 4, true, '09:00', '19:30'),
  ('diego', 5, true, '09:00', '19:30'),
  ('diego', 6, true, '09:00', '19:30'),
  ('andres', 0, true, '09:00', '17:00'),
  ('andres', 1, true, '09:00', '19:30'),
  ('andres', 2, true, '09:00', '19:30'),
  ('andres', 3, true, '09:00', '19:30'),
  ('andres', 4, true, '09:00', '19:30'),
  ('andres', 5, true, '09:00', '19:30'),
  ('andres', 6, true, '09:00', '19:30');



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


-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  unit text NOT NULL DEFAULT 'unidad',
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  stock numeric(12,2) NOT NULL DEFAULT 0,
  min_stock numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'in',
  quantity numeric(12,2) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage stock movements" ON public.stock_movements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);

-- SALES
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  barber_id text,
  client_name text,
  payment_method text NOT NULL DEFAULT 'efectivo',
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sales" ON public.sales FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sales_date ON public.sales(date);

-- SALE ITEMS
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'service',
  item_ref text,
  name text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_items TO authenticated;
GRANT ALL ON public.sale_items TO service_role;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sale items" ON public.sale_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_sale_items_sale ON public.sale_items(sale_id);

-- EXPENSES
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- BARBER COMMISSION
ALTER TABLE public.barbers ADD COLUMN IF NOT EXISTS commission_rate numeric(5,2) NOT NULL DEFAULT 50;

-- Reservations and notification jobs commit together. This migration does not delete existing data.
CREATE TABLE public.services (
  id text PRIMARY KEY, name text NOT NULL, price integer NOT NULL CHECK(price >= 0),
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 240),
  is_active boolean NOT NULL DEFAULT true
);
INSERT INTO public.services(id,name,price,duration_minutes) VALUES
 ('recorte','Recorte de cabello',23000,40),
 ('recorte-tijera','Recorte de cabello con tijera',27000,40),
 ('recorte-barba','Recorte de cabello + Barba',34000,60),
 ('recorte-tijera-barba','Recorte con Tijera + Barba',38000,60),
 ('cerquillo','Cerquillo',6000,30),
 ('mascarilla-negra','Mascarilla Black Mask',4000,30),
 ('cerquillo-barba','Cerquillo + Barba',16000,30),
 ('solo-barba','Solo Barba',12000,30),
 ('aliser-lavado','Aliser + lavado de cabello',25000,30);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active services" ON public.services FOR SELECT TO anon,authenticated USING(is_active);
GRANT SELECT ON public.services TO anon,authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.bookings ADD COLUMN request_id uuid UNIQUE,
  ADD COLUMN whatsapp_consent_at timestamptz;
-- Public users cannot bypass the validated server path or request another client's personal data.
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;
REVOKE INSERT,UPDATE ON public.bookings FROM anon,authenticated;
GRANT SELECT,DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT SELECT ON public.barbers,public.barber_schedules TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.barbers,public.barber_schedules TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.barbers,public.barber_schedules,public.user_roles TO service_role;

CREATE TABLE public.whatsapp_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  recipient text NOT NULL CHECK(recipient IN ('admin','client')),
  phone text NOT NULL, payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz, lease_token uuid,
  provider_message_id text, last_error_code text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id,recipient)
);
CREATE INDEX whatsapp_jobs_due ON public.whatsapp_notifications(status,next_attempt_at);
ALTER TABLE public.whatsapp_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads notification status" ON public.whatsapp_notifications FOR SELECT TO authenticated
 USING(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.whatsapp_notifications TO authenticated;
GRANT ALL ON public.whatsapp_notifications TO service_role;

CREATE TABLE public.booking_rate_limits (
  key text NOT NULL, bucket timestamptz NOT NULL, hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY(key,bucket)
);
ALTER TABLE public.booking_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.booking_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
 p_request_id uuid,p_client_name text,p_client_phone text,p_barber_id text,
 p_service_id text,p_date text,p_time text,p_admin_phone text,p_rate_key text,p_consent boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 b public.bookings%ROWTYPE; svc public.services%ROWTYPE; barber public.barbers%ROWTYPE;
 sched public.barber_schedules%ROWTYPE; d date; start_min integer; end_min integer;
 opening text; closing text; payload jsonb; n integer; current_local timestamp;
BEGIN
 IF p_request_id IS NULL OR p_consent IS DISTINCT FROM true
  OR char_length(trim(p_client_name)) NOT BETWEEN 2 AND 100
  OR p_client_phone !~ '^[1-9][0-9]{7,14}$' OR p_admin_phone !~ '^[1-9][0-9]{7,14}$'
  OR p_rate_key IS NULL OR char_length(p_rate_key) < 32
  OR p_date !~ '^\d{4}-\d{2}-\d{2}$' OR p_time !~ '^([01][0-9]|2[0-3]):(00|30)$'
 THEN RAISE EXCEPTION 'INVALID_BOOKING' USING ERRCODE='22023'; END IF;
 -- Serialize retries with the same request, and never return another request's personal data.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
 SELECT * INTO b FROM public.bookings WHERE request_id=p_request_id;
 IF FOUND THEN
  IF b.client_name<>trim(p_client_name) OR b.client_phone<>p_client_phone OR b.barber_id<>p_barber_id
    OR b.service_id<>p_service_id OR b.date<>p_date OR b.time<>p_time THEN
   RAISE EXCEPTION 'REQUEST_MISMATCH' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('id',b.id,'date',b.date,'time',b.time,'notifications','queued');
 END IF;
 d:=p_date::date;
 current_local:=now() AT TIME ZONE 'America/Bogota';
 IF d<current_local::date OR d>current_local::date+13
   OR (d+p_time::time)<=current_local THEN
  RAISE EXCEPTION 'INVALID_DATE' USING ERRCODE='22023'; END IF;
 SELECT * INTO svc FROM public.services WHERE id=p_service_id AND is_active;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_SERVICE' USING ERRCODE='22023'; END IF;
 -- Lock the barber row against concurrent deactivation/deletion while booking.
 SELECT * INTO barber FROM public.barbers WHERE id=p_barber_id AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_BARBER' USING ERRCODE='22023'; END IF;
 SELECT * INTO sched FROM public.barber_schedules
  WHERE barber_id=p_barber_id AND day_of_week=extract(dow FROM d) FOR SHARE;
 IF FOUND AND NOT sched.is_available THEN
  RAISE EXCEPTION 'BARBER_UNAVAILABLE' USING ERRCODE='22023'; END IF;
 opening:=coalesce(sched.open_time,'09:00');
 closing:=coalesce(sched.close_time,CASE WHEN extract(dow FROM d)=0 THEN '17:00' ELSE '19:30' END);
 start_min:=split_part(p_time,':',1)::integer*60+split_part(p_time,':',2)::integer;
 end_min:=start_min+ceil(svc.duration_minutes/30.0)::integer*30;
 IF p_time::time<opening::time OR end_min>(extract(hour FROM closing::time)*60+extract(minute FROM closing::time)) THEN
  RAISE EXCEPTION 'OUTSIDE_SCHEDULE' USING ERRCODE='22023'; END IF;
 -- A unique start-time index alone does not protect overlapping 40/60-minute services.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_barber_id||':'||p_date,1));
 IF EXISTS(SELECT 1 FROM public.bookings x WHERE x.barber_id=p_barber_id AND x.date=p_date
  AND (split_part(x.time,':',1)::integer*60+split_part(x.time,':',2)::integer)<end_min
  AND (split_part(x.time,':',1)::integer*60+split_part(x.time,':',2)::integer
       +ceil(x.duration_minutes/30.0)::integer*30)>start_min) THEN
  RAISE EXCEPTION 'SLOT_TAKEN' USING ERRCODE='23P01'; END IF;
 INSERT INTO public.booking_rate_limits(key,bucket) VALUES(p_rate_key,date_trunc('hour',now()))
  ON CONFLICT(key,bucket) DO UPDATE SET hits=public.booking_rate_limits.hits+1 RETURNING hits INTO n;
 IF n>10 THEN RAISE EXCEPTION 'RATE_LIMIT' USING ERRCODE='P0001'; END IF;
 IF (SELECT count(*) FROM public.bookings WHERE client_phone=p_client_phone AND created_at>now()-interval '1 hour')>=5 THEN
  RAISE EXCEPTION 'RATE_LIMIT' USING ERRCODE='P0001'; END IF;
 INSERT INTO public.bookings(request_id,client_name,client_phone,barber_id,service_id,date,time,duration_minutes,whatsapp_consent_at)
 VALUES(p_request_id,trim(p_client_name),p_client_phone,p_barber_id,p_service_id,p_date,p_time,svc.duration_minutes,now()) RETURNING * INTO b;
 payload:=jsonb_build_object('client_name',b.client_name,'client_phone',b.client_phone,'service_name',svc.name,
  'barber_name',barber.name,'date',b.date,'time',b.time,'price',svc.price,'booking_id',b.id);
 INSERT INTO public.whatsapp_notifications(booking_id,recipient,phone,payload) VALUES
  (b.id,'admin',p_admin_phone,payload),(b.id,'client',p_client_phone,payload);
 RETURN jsonb_build_object('id',b.id,'date',b.date,'time',b.time,'notifications','queued');
END; $$;
REVOKE ALL ON FUNCTION public.create_booking_atomic(uuid,text,text,text,text,text,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(uuid,text,text,text,text,text,text,text,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_whatsapp_jobs(p_booking_id uuid DEFAULT NULL)
RETURNS SETOF public.whatsapp_notifications LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Recover interrupted workers and stop after five attempts.
 UPDATE public.whatsapp_notifications SET status='failed',last_error_code='WORKER_INTERRUPTED',locked_until=NULL
 WHERE status='processing' AND locked_until<now() AND attempts>=5;
 RETURN QUERY WITH candidates AS (
  SELECT id FROM public.whatsapp_notifications
  WHERE (p_booking_id IS NULL OR booking_id=p_booking_id) AND attempts<5
   AND ((status='pending' AND next_attempt_at<=now()) OR (status='processing' AND locked_until<now()))
  ORDER BY created_at LIMIT 8 FOR UPDATE SKIP LOCKED
 ) UPDATE public.whatsapp_notifications j SET status='processing',attempts=j.attempts+1,
  locked_until=now()+interval '2 minutes',lease_token=gen_random_uuid()
 FROM candidates c WHERE j.id=c.id RETURNING j.*;
END; $$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_jobs(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_jobs(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.retry_whatsapp_notification(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
 UPDATE public.whatsapp_notifications SET status='pending',attempts=0,next_attempt_at=now(),
  locked_until=NULL,lease_token=NULL,last_error_code=NULL
 WHERE id=p_id AND status='failed';
END; $$;
REVOKE ALL ON FUNCTION public.retry_whatsapp_notification(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.retry_whatsapp_notification(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_availability()
RETURNS TABLE(barber_id text,booking_date text,booking_time text,duration_minutes integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.barber_id,b.date,b.time,b.duration_minutes FROM public.bookings b
 WHERE b.date>=to_char(now() AT TIME ZONE 'America/Bogota','YYYY-MM-DD')
 AND b.date<=to_char((now() AT TIME ZONE 'America/Bogota')::date+13,'YYYY-MM-DD');
$$;
REVOKE ALL ON FUNCTION public.get_public_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_availability() TO anon,authenticated;

-- New barbers receive editable schedules automatically; they can be booked immediately.
CREATE OR REPLACE FUNCTION public.seed_barber_schedules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.barber_schedules(barber_id,day_of_week,open_time,close_time)
 SELECT NEW.id,d,'09:00',CASE WHEN d=0 THEN '17:00' ELSE '19:30' END FROM generate_series(0,6) d
 ON CONFLICT(barber_id,day_of_week) DO NOTHING;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.seed_barber_schedules() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER seed_barber_schedules AFTER INSERT ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.seed_barber_schedules();
INSERT INTO public.barber_schedules(barber_id,day_of_week,open_time,close_time)
 SELECT b.id,d,'09:00',CASE WHEN d=0 THEN '17:00' ELSE '19:30' END FROM public.barbers b CROSS JOIN generate_series(0,6) d
 ON CONFLICT(barber_id,day_of_week) DO NOTHING;

-- Realtime is supplemental: the public calendar also polls because private booking rows are not broadcast to anonymous clients.
DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['bookings','barbers','barber_schedules','whatsapp_notifications','products','stock_movements','sales','sale_items','expenses'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END; $$;

COMMIT;
