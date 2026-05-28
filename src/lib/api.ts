import { supabase } from './supabase'
import { Student, Staff, LedgerInvoice, LedgerTransaction, Resource, ActivityLog } from '../types'

// Setup short-lived in-memory lookup cache to provide lightning fast dashboard and profile transitions
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds memory cache for repeated views

export function invalidateApiCache(table?: string) {
  if (table) {
    apiCache.delete(table);
  } else {
    apiCache.clear();
  }
}

// Database generic fetcher with intelligent cache lookup
export async function fetchFromSupabase(table: string) {
  // Check cache first for passive loads
  const cached = apiCache.get(table);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`Error fetching from ${table}:`, error)
        return []
      }
      const result = data || [];
      apiCache.set(table, { data: result, timestamp: Date.now() });
      return result;
    } catch (e) {
      console.error(`Exception fetching from ${table}:`, e)
    }
  }
  return []
}

// Database generic inserter
async function insertToSupabase(table: string, payload: any) {
  invalidateApiCache(table);
  // Clear related caches
  if (table === 'students' || table === 'student_profiles') {
    apiCache.delete('students');
    apiCache.delete('student_profiles');
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).insert([payload])
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error(`Error inserting to ${table}:`, error)
      return { data: null, error }
    }
  }
  return { data: null, error: new Error('Supabase not configured') }
}

// Database generic updater
async function updateInSupabase(table: string, id: string, payload: any) {
  invalidateApiCache(table);
  if (table === 'students' || table === 'student_profiles') {
    apiCache.delete('students');
    apiCache.delete('student_profiles');
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select()
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error(`Error updating in ${table}:`, error)
      return { data: null, error }
    }
  }
  return { data: null, error: new Error('Supabase not configured') }
}

// Services
export const api = {
  getStudents: async () => {
    const [profiles, oldStudents, studentBatches] = await Promise.all([
      fetchFromSupabase('student_profiles'),
      fetchFromSupabase('students'),
      fetchFromSupabase('student_batches')
    ]);
    
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
    
    return [...mappedProfiles, ...filteredOldStudents];
  },
  addStudent: (student: Omit<Student, 'id'>) => {
    const defaultId = `STU-${Math.floor(Math.random() * 10000)}`
    return insertToSupabase('students', { ...student, id: defaultId })
  },
  
  getStaff: () => fetchFromSupabase('staffs'),
  
  getDesignations: () => fetchFromSupabase('designations'),
  getStaffDesignations: () => fetchFromSupabase('staff_designations'),
  getHolidays: () => fetchFromSupabase('holidays'),
  
  getBatches: () => fetchFromSupabase('batches'),
  getInvoices: async () => {
    const data = await fetchFromSupabase('invoices');
    return data.map((inv: any) => ({
      id: inv.id,
      studentId: inv.student_id,
      studentName: inv.student_name,
      title: inv.title || inv.category,
      category: inv.category,
      amount: inv.amount,
      dueDate: inv.due_date,
      status: inv.status
    }));
  },
  updateInvoiceStatus: (id: string, status: string) => updateInSupabase('invoices', id, { status }),

  
  getTransactions: () => fetchFromSupabase('transactions'),
  addTransaction: (transaction: Omit<LedgerTransaction, 'id'>) => {
    const defaultId = `TXN-${Math.floor(Math.random() * 10000)}`
    return insertToSupabase('transactions', { ...transaction, id: defaultId })
  },
  
  getResources: () => fetchFromSupabase('resources'),
  updateResourceStatus: (id: string, status: string) => updateInSupabase('resources', id, { status }),
  
  getActivityLogs: () => fetchFromSupabase('activity_logs'),
  addActivityLog: (log: Omit<ActivityLog, 'id'>) => insertToSupabase('activity_logs', log),

  addStudentProfile: (profile: any) => insertToSupabase('student_profiles', profile),

  uploadFile: async (path: string, file: File) => {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('student-documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true
          })
        if (error) throw error
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('student-documents')
          .getPublicUrl(path)
          
        return { url: publicUrl, error: null }
      } catch (error) {
        console.error('Error uploading file:', error)
        return { url: null, error }
      }
    }
    return { url: null, error: new Error('Supabase not configured') }
  },

  login: async (username: string, password: string) => {
    // 1. Try Supabase first if available
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('password', password)
          .single()
        
        if (data && !error) {
          return { success: true, user: data }
        }
      } catch (error) {
        console.error('Database login failed.', error)
      }
    }

    // Fallback credentials for preview & environment comfort
    const lUsername = username.toLowerCase();
    if (lUsername === "admin" && password === "admin123") {
      return {
        success: true,
        user: {
          id: "USR-001",
          username: "admin",
          full_name: "System Administrator",
          role: "Admin"
        }
      };
    } else if (lUsername === "receptionist" && password === "reception123") {
      return {
        success: true,
        user: {
          id: "USR-002",
          username: "receptionist",
          full_name: "Office Receptionist",
          role: "Receptionist"
        }
      };
    }

    return { success: false, error: new Error('Invalid credentials or Supabase not connected') }
  },
  
  getUsers: () => fetchFromSupabase('users'),
  
  addUser: async (user: any) => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{ ...user, id: crypto.randomUUID() }])
          .select()
        return { data, success: !error, error }
      } catch (e) {
        return { data: null, success: false, error: e }
      }
    }
    return { data: null, success: false, error: new Error('Supabase not configured') }
  },

  deleteUser: async (id: string) => {
    if (supabase) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id)
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    return { success: false, error: new Error('Supabase not configured') }
  },
  
  getRolePermissions: async () => {
    const data = await fetchFromSupabase('role_permissions');
    const result: Record<string, any> = {};
    if (data && data.length > 0) {
      data.forEach((rp: any) => {
        result[rp.role] = rp.permissions;
      });
    }
    return result;
  },
  
  saveRolePermissions: async (role: string, permissions: any) => {
    if (supabase) {
      try {
        const { error } = await supabase
          .from('role_permissions')
          .upsert({ role, permissions, updated_at: new Date().toISOString() })
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    return { success: false, error: new Error('Supabase not configured') }
  },

  deleteRole: async (role: string) => {
    if (supabase) {
      try {
        const { error } = await supabase.from('role_permissions').delete().eq('role', role)
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    return { success: false, error: new Error('Supabase not configured') }
  }
}
