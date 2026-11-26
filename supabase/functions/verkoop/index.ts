import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/verkoop.js';
start(createClient);
