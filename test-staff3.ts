import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: staffsData, error: staffError } = await supabase
    .from('staffs')
    .select('id, first_name, last_name, staff_designations(designations(name))');
  
  console.log("Error:", staffError);
  console.log("Data:", JSON.stringify(staffsData, null, 2));
}
test();
