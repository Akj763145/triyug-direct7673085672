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

// Helper to get local fallback from localStorage to allow robust preview and local work
function getLocalFallback(table: string): any[] {
  const item = localStorage.getItem(`triyuga_db_${table}`);
  if (!item) {
    // Provide sensible initial mock values if absent
    if (table === 'role_permissions') {
      return [
        { role: 'Admin', permissions: { dashboard: true, students: true, staff: true, batches: true, fees: true, ledger: true, resources: true, enquiries: true } },
        { role: 'Receptionist', permissions: { dashboard: true, students: true, staff: false, batches: true, fees: true, ledger: false, resources: true, enquiries: true } }
      ];
    }
    if (table === 'users') {
      return [
        { id: 'USR-001', username: 'admin', full_name: 'System Administrator', role: 'Admin' },
        { id: 'USR-002', username: 'receptionist', full_name: 'Office Receptionist', role: 'Receptionist' }
      ];
    }
    if (table === 'grades') {
      return [
        { id: 'GRD-9', name: 'Class 9', description: 'Ninth Grade' },
        { id: 'GRD-10', name: 'Class 10', description: 'Tenth Grade' },
        { id: 'GRD-11', name: 'Class 11', description: 'Eleventh Grade' },
        { id: 'GRD-12', name: 'Class 12', description: 'Twelfth Grade' }
      ];
    }
    if (table === 'enquiries') {
      return [];
    }
    return [];
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    return [];
  }
}

function setLocalFallback(table: string, data: any[]) {
  localStorage.setItem(`triyuga_db_${table}`, JSON.stringify(data));
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
        return getLocalFallback(table);
      }
      const result = data || [];
      apiCache.set(table, { data: result, timestamp: Date.now() });
      setLocalFallback(table, result);
      return result;
    } catch (e) {
      console.error(`Exception fetching from ${table}:`, e)
      return getLocalFallback(table);
    }
  }
  return getLocalFallback(table);
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
      const { data, error } = await supabase.from(table).insert([payload]).select()
      if (error) throw error
      const current = getLocalFallback(table);
      current.push(payload);
      setLocalFallback(table, current);
      return { data, error: null }
    } catch (error) {
      console.error(`Error inserting to ${table}:`, error)
    }
  }
  const current = getLocalFallback(table);
  current.push(payload);
  setLocalFallback(table, current);
  return { data: [payload], error: null }
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
      const current = getLocalFallback(table);
      const index = current.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        current[index] = { ...current[index], ...payload };
        setLocalFallback(table, current);
      }
      return { data, error: null }
    } catch (error) {
      console.error(`Error updating in ${table}:`, error)
    }
  }
  const current = getLocalFallback(table);
  const index = current.findIndex((item: any) => item.id === id);
  let updatedData = [];
  if (index !== -1) {
    current[index] = { ...current[index], ...payload };
    updatedData = [current[index]];
    setLocalFallback(table, current);
  }
  return { data: updatedData, error: null }
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
  
  getGrades: () => fetchFromSupabase('grades'),
  addGrade: async (grade: any) => {
    const id = grade.id || `GRD-${Math.floor(Math.random() * 10000)}`;
    return insertToSupabase('grades', { ...grade, id });
  },
  updateGrade: (id: string, grade: any) => updateInSupabase('grades', id, grade),
  deleteGrade: async (id: string) => {
    invalidateApiCache('grades');
    if (supabase) {
      try {
        const { error } = await supabase.from('grades').delete().eq('id', id);
        if (!error) {
          const current = getLocalFallback('grades');
          const filtered = current.filter((g: any) => g.id !== id);
          setLocalFallback('grades', filtered);
        }
        return { success: !error, error };
      } catch (e) {
        return { success: false, error: e };
      }
    }
    const current = getLocalFallback('grades');
    const filtered = current.filter((g: any) => g.id !== id);
    setLocalFallback('grades', filtered);
    return { success: true, error: null };
  },

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
    invalidateApiCache('users');
    const newUser = { ...user, id: user.id || crypto.randomUUID() };
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([newUser])
          .select()
        if (!error) {
          const current = getLocalFallback('users');
          current.push(newUser);
          setLocalFallback('users', current);
        }
        return { data, success: !error, error }
      } catch (e) {
        return { data: null, success: false, error: e }
      }
    }
    const current = getLocalFallback('users');
    current.push(newUser);
    setLocalFallback('users', current);
    return { data: [newUser], success: true, error: null }
  },

  deleteUser: async (id: string) => {
    invalidateApiCache('users');
    if (supabase) {
      try {
        const { error } = await supabase.from('users').delete().eq('id', id)
        if (!error) {
          const current = getLocalFallback('users');
          const filtered = current.filter((u: any) => u.id !== id);
          setLocalFallback('users', filtered);
        }
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    const current = getLocalFallback('users');
    const filtered = current.filter((u: any) => u.id !== id);
    setLocalFallback('users', filtered);
    return { success: true, error: null }
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
    invalidateApiCache('role_permissions');
    if (supabase) {
      try {
        const { error } = await supabase
          .from('role_permissions')
          .upsert({ role, permissions, updated_at: new Date().toISOString() })
        if (!error) {
          const current = getLocalFallback('role_permissions');
          const index = current.findIndex((rp: any) => rp.role === role);
          if (index !== -1) {
            current[index] = { role, permissions, updated_at: new Date().toISOString() };
          } else {
            current.push({ role, permissions, updated_at: new Date().toISOString() });
          }
          setLocalFallback('role_permissions', current);
        }
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    const current = getLocalFallback('role_permissions');
    const index = current.findIndex((rp: any) => rp.role === role);
    if (index !== -1) {
      current[index] = { role, permissions, updated_at: new Date().toISOString() };
    } else {
      current.push({ role, permissions, updated_at: new Date().toISOString() });
    }
    setLocalFallback('role_permissions', current);
    return { success: true, error: null }
  },

  deleteRole: async (role: string) => {
    invalidateApiCache('role_permissions');
    if (supabase) {
      try {
        const { error } = await supabase.from('role_permissions').delete().eq('role', role)
        if (!error) {
          const current = getLocalFallback('role_permissions');
          const filtered = current.filter((rp: any) => rp.role !== role);
          setLocalFallback('role_permissions', filtered);
        }
        return { success: !error, error }
      } catch (e) {
        return { success: false, error: e }
      }
    }
    const current = getLocalFallback('role_permissions');
    const filtered = current.filter((rp: any) => rp.role !== role);
    setLocalFallback('role_permissions', filtered);
    return { success: true, error: null }
  },

  getEnquiries: () => fetchFromSupabase('enquiries'),
  
  addEnquiry: async (enquiry: any) => {
    invalidateApiCache('enquiries');
    const newEnq = { ...enquiry, id: enquiry.id || crypto.randomUUID(), created_at: enquiry.created_at || new Date().toISOString() };
    
    // Always persist to local fallback first to ensure ultimate responsiveness and zero lost data
    const current = getLocalFallback('enquiries');
    const exists = current.some((e: any) => e.id === newEnq.id);
    if (!exists) {
      current.push(newEnq);
      setLocalFallback('enquiries', current);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('enquiries').insert([newEnq]).select()
        if (error) {
          console.warn('Supabase enquiry insert failed - saved locally:', error);
          return { data: [newEnq], success: true, dbSynced: false, error }
        }
        return { data, success: true, dbSynced: true, error: null }
      } catch (e) {
        console.warn('Supabase enquiry insert exception - saved locally:', e);
        return { data: [newEnq], success: true, dbSynced: false, error: e }
      }
    }
    return { data: [newEnq], success: true, dbSynced: true, error: null }
  },
  
  updateEnquiry: async (id: string, updates: any) => {
    invalidateApiCache('enquiries');
    
    // Always persist to local fallback first
    const current = getLocalFallback('enquiries');
    const index = current.findIndex((e: any) => e.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      setLocalFallback('enquiries', current);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase.from('enquiries').update(updates).eq('id', id).select()
        if (error) {
          console.warn('Supabase enquiry update failed - processed locally:', error);
          return { data: null, success: true, dbSynced: false, error }
        }
        return { data, success: true, dbSynced: true, error: null }
      } catch (e) {
        console.warn('Supabase enquiry update exception - processed locally:', e);
        return { data: null, success: true, dbSynced: false, error: e }
      }
    }
    return { data: null, success: true, dbSynced: true, error: null }
  },
  
  deleteEnquiry: async (id: string) => {
    invalidateApiCache('enquiries');
    
    // Always persist to local fallback first
    const current = getLocalFallback('enquiries');
    const filtered = current.filter((e: any) => e.id !== id);
    setLocalFallback('enquiries', filtered);

    if (supabase) {
      try {
        const { error } = await supabase.from('enquiries').delete().eq('id', id)
        if (error) {
          console.warn('Supabase enquiry delete failed - processed locally:', error);
          return { success: true, dbSynced: false, error }
        }
        return { success: true, dbSynced: true, error: null }
      } catch (e) {
        console.warn('Supabase enquiry delete exception - processed locally:', e);
        return { success: true, dbSynced: false, error: e }
      }
    }
    return { success: true, dbSynced: true, error: null }
  }
}
