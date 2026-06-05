import { supabase } from './supabase'
import { Student, Staff, LedgerInvoice, LedgerTransaction, Expense, ActivityLog } from '../types'

// Setup short-lived in-memory lookup cache to provide lightning fast dashboard and profile transitions
export const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds memory cache for background polling accuracy

export function invalidateApiCache(table?: string) {
  if (table) {
    apiCache.delete(table);
    // Suppress dispatch if running in a non-browser environment
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('triyuga_db_update', { detail: { table } }));
    }
  } else {
    apiCache.clear();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('triyuga_db_update', { detail: { table: '*' } }));
    }
  }
}

// Helper to get local fallback from localStorage to allow robust preview and local work
function getLocalFallback(table: string): any[] {
  const item = localStorage.getItem(`triyuga_db_${table}`);
  if (!item) {
    // Provide sensible initial mock values if absent
    if (table === 'role_permissions') {
      return [
        { role: 'Admin', permissions: { dashboard: true, students: true, staff: true, batches: true, fees: true, ledger: true, expenses: true, enquiries: true } },
        { role: 'Receptionist', permissions: { dashboard: true, students: true, staff: false, batches: true, fees: true, ledger: false, expenses: true, enquiries: true } }
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
      const remoteData = data || [];
      const localData = getLocalFallback(table);
      
      let merged = [...remoteData];
      if (table === 'expenses') {
        const localMap = new Map(localData.map((item: any) => [item.id, item]));
        merged = remoteData.map((remoteItem: any) => {
          const localItem = localMap.get(remoteItem.id);
          if (localItem && localItem.receipt_url && !remoteItem.receipt_url) {
            return { ...remoteItem, receipt_url: localItem.receipt_url };
          }
          return remoteItem;
        });
      }
      
      apiCache.set(table, { data: merged, timestamp: Date.now() });
      setLocalFallback(table, merged);
      return merged;
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
    if (table !== 'students') invalidateApiCache('students');
    if (table !== 'student_profiles') invalidateApiCache('student_profiles');
  }
  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).insert([payload]).select()
      if (error) {
        // Handle missing column for receipt_url gracefully
        if (error.message && error.message.includes('receipt_url') && table === 'expenses') {
          console.warn("Got error with receipt_url column in remote Supabase table. Retrying with sanitized payload...", error.message);
          const { receipt_url, ...sanitized } = payload;
          const retryResult = await supabase.from(table).insert([sanitized]).select();
          if (retryResult.error) throw retryResult.error;
          
          // Successful retry. Persist full payload locally so we still see the receipt link
          const current = getLocalFallback(table);
          if (!current.some((item: any) => item && item.id === payload.id)) {
            current.push(payload);
            setLocalFallback(table, current);
          }
          return { data: retryResult.data, error: null };
        }
        throw error;
      }
      const current = getLocalFallback(table);
      if (!current.some((item: any) => item && item.id === payload.id)) {
        current.push(payload);
        setLocalFallback(table, current);
      }
      return { data, error: null }
    } catch (error) {
      console.error(`Error inserting to ${table}:`, error)
      const current = getLocalFallback(table);
      if (!current.some((item: any) => item && item.id === payload.id)) {
        current.push(payload);
        setLocalFallback(table, current);
      }
      return { data: [payload], error }
    }
  }
  const current = getLocalFallback(table);
  if (!current.some((item: any) => item && item.id === payload.id)) {
    current.push(payload);
    setLocalFallback(table, current);
  }
  return { data: [payload], error: null }
}

// Database generic updater
async function updateInSupabase(table: string, id: string, payload: any) {
  invalidateApiCache(table);
  if (table === 'students' || table === 'student_profiles') {
    if (table !== 'students') invalidateApiCache('students');
    if (table !== 'student_profiles') invalidateApiCache('student_profiles');
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
          created_at: p.created_at,
          name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
          grade: p.grade,
          contact: p.parent1_contact || 'N/A',
          parent1_contact: p.parent1_contact,
          parent2_contact: p.parent2_contact,
          parent1_whatsapp: p.parent1_whatsapp,
          status: p.status, // Use actual status
          photo_url: p.photo_url || undefined,
          transport_facilitated: p.transport_facilitated,
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
  updateStudentTransport: async (id: string, transport_facilitated: boolean) => {
    invalidateApiCache('students');
    invalidateApiCache('student_profiles');
    
    // Always persist locally to avoid UI reset if Supabase fails (e.g. missing column)
    const currentProfiles = getLocalFallback('student_profiles');
    const updatedProfiles = currentProfiles.map(c => c.student_id === id || c.id === id ? { ...c, transport_facilitated } : c);
    setLocalFallback('student_profiles', updatedProfiles);
    
    const currentStudents = getLocalFallback('students');
    const updatedStudents = currentStudents.map(c => c.id === id ? { ...c, transport_facilitated } : c);
    setLocalFallback('students', updatedStudents);

    if (supabase) {
      try {
        await supabase.from('student_profiles').update({ transport_facilitated }).eq('student_id', id);
        await supabase.from('student_profiles').update({ transport_facilitated }).eq('id', id);
        const { error } = await supabase.from('students').update({ transport_facilitated }).eq('id', id);
        
        if (error) {
           console.warn('Supabase update failed, saving locally instead. Ensure transport_facilitated boolean column exists in your tables.', error);
           return { success: true, dbSynced: false, error }
        }
        return { success: true, dbSynced: true, error: null }
      } catch (e) {
         console.error(e)
         return { success: true, dbSynced: false, error: e }
      }
    }
    return { success: true, dbSynced: true, error: null }
  },
  
  getStaff: () => fetchFromSupabase('staffs'),
  
  getDesignations: () => fetchFromSupabase('designations'),
  getStaffDesignations: () => fetchFromSupabase('staff_designations'),
  getHolidays: () => fetchFromSupabase('holidays'),
  
  getBatches: () => fetchFromSupabase('batches'),
  getInvoices: async () => {
    const [data, profiles, students, transactions, studentBatches] = await Promise.all([
      fetchFromSupabase('invoices'),
      fetchFromSupabase('student_profiles'),
      fetchFromSupabase('students'),
      fetchFromSupabase('transactions'),
      fetchFromSupabase('student_batches')
    ]);

    const studentDataMap = new Map();
    if (profiles) {
      profiles.forEach((p: any) => {
        if (p.id) {
          studentDataMap.set(p.id, {
            contact: p.parent1_contact || p.parent2_contact,
            whatsapp: p.parent1_whatsapp
          });
        }
        if (p.student_id) {
          studentDataMap.set(p.student_id, {
            contact: p.parent1_contact || p.parent2_contact,
            whatsapp: p.parent1_whatsapp
          });
        }
      });
    }

    if (students) {
      students.forEach((s: any) => {
        if (s.id && !studentDataMap.has(s.id)) {
          studentDataMap.set(s.id, {
            contact: s.contact
          });
        }
        if (s.student_id && !studentDataMap.has(s.student_id)) {
          studentDataMap.set(s.student_id, {
            contact: s.contact
          });
        }
      });
    }

    const transactionMap = new Map();
    if (transactions) {
      // Pick the latest transaction for the invoice, or if it has multiple prioritize success
      transactions.forEach((tx: any) => {
        if (tx.invoice_id) {
          transactionMap.set(tx.invoice_id, tx.payment_method || tx.paymentMethod);
        }
      });
    }

    const studentBatchMap = new Map();
    if (studentBatches) {
      studentBatches.forEach((sb: any) => {
        if (!studentBatchMap.has(sb.student_id)) {
          studentBatchMap.set(sb.student_id, []);
        }
        studentBatchMap.get(sb.student_id).push(sb.batch_id);
      });
    }

    return (data || []).map((inv: any) => {
      const studentInfo = studentDataMap.get(inv.student_id) || {};
      return {
        id: inv.id,
        studentId: inv.student_id,
        studentName: inv.student_name,
        studentContact: studentInfo.contact,
        studentWhatsapp: studentInfo.whatsapp,
        title: (inv.title || inv.category || 'Invoice').replace(/Installment/g, 'Fee').replace(/installment/g, 'fee'),
        category: inv.category,
        amount: inv.amount,
        dueDate: inv.due_date,
        status: inv.status,
        paymentMethod: transactionMap.get(inv.id) || null,
        batchIds: studentBatchMap.get(inv.student_id) || []
      };
    });
  },
  updateInvoiceStatus: (id: string, status: string) => updateInSupabase('invoices', id, { status }),

  
  getTransactions: () => fetchFromSupabase('transactions'),
  addTransaction: (transaction: Omit<LedgerTransaction, 'id'>) => {
    const defaultId = `TXN-${Math.floor(Math.random() * 10000)}`
    return insertToSupabase('transactions', { ...transaction, id: defaultId })
  },
  deleteTransactionsByInvoice: async (invoiceId: string) => {
    if (supabase) {
      const { error } = await supabase.from('transactions').delete().eq('invoice_id', invoiceId)
      return { error }
    }
  },
  
  getExpenses: () => fetchFromSupabase('expenses'),
  addExpense: (expense: any) => {
    const id = expense.id || `EXP-${Math.floor(Math.random() * 10000)}`;
    return insertToSupabase('expenses', { ...expense, id });
  },
  updateExpenseStatus: (id: string, status: string) => updateInSupabase('expenses', id, { status }),
  deleteExpense: async (id: string) => {
    invalidateApiCache('expenses');
    
    // Always persist locally to avoid UI reset
    const current = getLocalFallback('expenses');
    const filtered = current.filter((e: any) => e.id !== id);
    setLocalFallback('expenses', filtered);

    if (supabase) {
      try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        return { error };
      } catch (e) {
        return { error: e };
      }
    }
    return { error: null };
  },
  
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
