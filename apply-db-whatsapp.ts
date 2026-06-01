import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = `
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS parent1_whatsapp TEXT;
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS fee_per_installment DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS fee_interval_months INT,
ADD COLUMN IF NOT EXISTS fee_duration_value INT,
ADD COLUMN IF NOT EXISTS fee_as_long_as_continues BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS enrollment_date DATE;
`;

async function main() {
  console.log("Attempting RPC migration to add db columns...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });
  if (error) {
    console.log("\n=================================");
    console.log("PLEASE RUN THIS SQL IN YOUR SUPABASE SQL EDITOR:");
    console.log("=================================");
    console.log(sql);
    console.log("=================================\n");
  } else {
    console.log("Migration succeeded.");
  }
}

main();
