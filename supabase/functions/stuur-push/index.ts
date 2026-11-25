import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { start } from '../_shared/stuur-push.js';
start(webpush, createClient);
