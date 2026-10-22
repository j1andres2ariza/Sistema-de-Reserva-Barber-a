-- First create your user in Authentication > Users > Add user (auto-confirm enabled).
-- Replace the email; this script grants admin rights without exposing a password in the site.
DO $$
DECLARE admin_id uuid;
BEGIN
 SELECT id INTO admin_id FROM auth.users WHERE email='TU_CORREO@EJEMPLO.COM';
 IF admin_id IS NULL THEN RAISE EXCEPTION 'Primero crea el usuario en Authentication > Users'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(admin_id,'admin') ON CONFLICT(user_id,role) DO NOTHING;
END; $$;
