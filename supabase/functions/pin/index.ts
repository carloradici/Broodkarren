import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/pin.js';
start(createClient);
