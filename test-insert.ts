import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
      const payload = {
        first_name: "Test",
        last_name: "Test",
        date_of_birth: "2010-01-01",
        enrollment_date: "2024-01-01",
        gender: "Male",
        nationality: "Domestic",
        is_international: false,
        passport_number: null,
        visa_status: null,
        grade: "10TH",
        batch_id: "BAT-1033",
        installments_count: 1, 
        parent1_name: "Test Parent",
        parent1_relation: "FATHER",
        parent1_occupation: "Test",
        parent1_contact: "1234567890",
        address_line1: "Test Address",
        city: "Test",
        state: "Test",
        zip_code: "123456",
        status: "Pending"
      };

      const { data, error } = await supabase.from("student_profiles").insert([payload]).select();
      console.log("Error:", error);
}
check();
