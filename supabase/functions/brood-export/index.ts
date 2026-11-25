import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/brood-export.js';
// koppelcode staat als geheim in Supabase (Edge Functions › Secrets), niet in de openbare repo
start(createClient, Deno.env.get('BROOD_SLEUTEL'));
