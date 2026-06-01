import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = `
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS fee_per_installment DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS fee_interval_months INT,
ADD COLUMN IF NOT EXISTS fee_duration_value INT,
ADD COLUMN IF NOT EXISTS fee_as_long_as_continues BOOLEAN DEFAULT false;

ALTER TABLE public.student_batches 
ADD COLUMN IF NOT EXISTS fee_per_installment DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS fee_interval_months INT,
ADD COLUMN IF NOT EXISTS fee_duration_value INT,
ADD COLUMN IF NOT EXISTS fee_as_long_as_continues BOOLEAN DEFAULT false;
`;

async function main() {
  console.log("Applying RPC migration to add fee structure columns...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration succeeded");
}

main();

