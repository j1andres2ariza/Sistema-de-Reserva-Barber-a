
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
