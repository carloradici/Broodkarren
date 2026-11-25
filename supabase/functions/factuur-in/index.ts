import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/factuur-in.js';
start(createClient);
