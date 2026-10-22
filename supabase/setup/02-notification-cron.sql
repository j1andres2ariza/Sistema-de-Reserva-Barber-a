-- Execute ONCE in your OWN Supabase SQL Editor after deploying functions and setting secrets.
-- Enable pg_cron, pg_net and Vault in Database > Extensions first if necessary.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Replace these values before running. worker_secret MUST match WHATSAPP_WORKER_SECRET.
SELECT vault.create_secret('https://TU_PROYECTO.supabase.co','barberia_project_url');
SELECT vault.create_secret('REEMPLAZAR_CON_EL_MISMO_WHATSAPP_WORKER_SECRET','barberia_worker_secret');
SELECT cron.schedule('barberia-whatsapp-every-minute','* * * * *',$job$
 SELECT net.http_post(
  url:=(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='barberia_project_url')||'/functions/v1/whatsapp-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='barberia_worker_secret')),
  body:='{}'::jsonb, timeout_milliseconds:=30000
 );
$job$);
SELECT cron.schedule('barberia-rate-limit-cleanup','17 3 * * *',$job$
 DELETE FROM public.booking_rate_limits WHERE bucket<now()-interval '2 days';
$job$);
