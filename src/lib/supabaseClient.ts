import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Criaremos este arquivo no próximo passo

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL or anon key is missing. Make sure to set it in your .env.local file.");
}

// O tipo 'Database' fornece autocompletar e segurança de tipo para suas tabelas
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);