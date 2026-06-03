import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = `
ALTER TABLE public.student_profiles ALTER COLUMN date_of_birth DROP NOT NULL;
`;

async function main() {
  console.log("Applying RPC migration to drop NOT NULL on date_of_birth...");
  const { data, error } = await supabase.rpc("exec_sql", { sql_string: sql });
  if (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
  console.log("Migration succeeded:", data);
}

main();
