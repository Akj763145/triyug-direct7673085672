import { api } from "./src/lib/api";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Assuming api.getStudents doesn't crash in node
async function test() {
  const students = await api.getStudents();
  console.log("Total students returned by api:", students.length);
  const pending = students.filter(s => s.status === 'Pending');
  console.log("Pending students:", pending.length);
  if (pending.length > 0) {
    console.log("First pending student:", pending[0]);
  }
}
test();
