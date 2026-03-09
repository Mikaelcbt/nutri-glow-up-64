import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpubzpnzdyhqrvoahkwj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdWJ6cG56ZHlocXJ2b2Foa3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODIwODgsImV4cCI6MjA4ODY1ODA4OH0.MWB1kfECInSSj3EGP364uqM3Pm7U1wfGkxuhMAgu86k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
