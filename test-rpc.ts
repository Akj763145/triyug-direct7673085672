import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL || "", process.env.VITE_SUPABASE_ANON_KEY || "");
async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: 'ALTER TABLE batches ADD COLUMN IF NOT EXISTS installment_schemes JSONB DEFAULT \'[]\';' });
  console.log(error, data);
}
run();
