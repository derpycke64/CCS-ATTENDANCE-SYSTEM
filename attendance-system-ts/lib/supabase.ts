import { createClient } from "@supabase/supabase-js";
import { error } from "console";

const SupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SupabaseAnonkey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if(!SupabaseUrl || !SupabaseAnonkey){
    throw new Error('Something is missing probably in the .env.local');
}

export const supabase = createClient(SupabaseUrl, SupabaseAnonkey);