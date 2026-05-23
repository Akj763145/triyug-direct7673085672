import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: staffsData, error: staffError } = await supabase
    .from('staffs')
    .select('id, basic_info, designation_id, designations(title)');
  
  console.log("Error:", staffError);
  console.log("Data:", staffsData);
}
test();
