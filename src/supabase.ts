import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://truocxofyhrrlwpgikxj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRydW9jeG9meWhycmx3cGdpa3hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDYyOTYsImV4cCI6MjA4ODkyMjI5Nn0.TX5XOqqU2IzHzQ61MbsUvfrAa4OJDgiPZQimUSH2z2E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
