import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || "",
  process.env.VITE_SUPABASE_ANON_KEY || ""
);

const sql = fs.readFileSync('supabase_migrations/018_payment_collected_date.sql', 'utf8');

async function main() {
  console.log("Attempting RPC migration to add process_installment_payment_v5...");
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
