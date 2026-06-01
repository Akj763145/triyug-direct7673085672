import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const [profilesData, oldStudentsData, batchesData] = await Promise.all([
      supabase.from('student_profiles').select('*'),
      supabase.from('students').select('*'),
      supabase.from('student_batches').select('*')
    ]);

    const profiles = profilesData.data || [];
    const oldStudents = oldStudentsData.data || [];
    const studentBatches = batchesData.data || [];

    const studentBatchMap = new Map<string, string>();
    if (studentBatches && studentBatches.length > 0) {
      studentBatches.forEach((sb: any) => {
        if (sb.student_id && sb.batch_id) {
          studentBatchMap.set(sb.student_id, sb.batch_id);
        }
      });
    }
    
    let mappedProfiles: any[] = [];
    const profileIds = new Set();
    const profileStudentIds = new Set();
    
    if (profiles && profiles.length > 0) {
      mappedProfiles = profiles.map((p: any) => {
        if (p.id) profileIds.add(p.id);
        if (p.student_id) profileStudentIds.add(p.student_id);
        
        const sId = p.student_id || p.id;
        return {
          id: sId,
          name: `${p.first_name} ${p.last_name}`,
          grade: p.grade,
          contact: p.parent1_contact || 'N/A',
          status: p.status, // Use actual status
          photo_url: p.photo_url || undefined,
          batch_id: p.batch_id || studentBatchMap.get(sId) || studentBatchMap.get(p.id)
        };
      });
    }
    
    const filteredOldStudents = (oldStudents || []).map((s: any) => ({
      ...s,
      batch_id: s.batch_id || studentBatchMap.get(s.id)
    })).filter((s: any) => {
      if (profileIds.has(s.id) || profileStudentIds.has(s.id)) return false;
      if (profileIds.has(s.student_id) || profileStudentIds.has(s.student_id)) return false;
      return true;
    });
    
    const mapped = [...mappedProfiles, ...filteredOldStudents];

    console.log("Mapped students length:", mapped.length);
    if (mapped.length > 0) {
        console.log("First:", mapped[0]);
    }
}
check();
