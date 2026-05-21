import { supabase } from './supabase'
import { Student, Staff, LedgerInvoice, LedgerTransaction, Resource, ActivityLog } from '../types'

// Database generic fetcher
async function fetchFromSupabase(table: string) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.error(`Error fetching from ${table}:`, error)
        return []
      }
      return data || []
    } catch (e) {
      console.error(`Exception fetching from ${table}:`, e)
    }
  }
  return []
}

// Database generic inserter
async function insertToSupabase(table: string, payload: any) {
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
    const profiles = await fetchFromSupabase('student_profiles');
    const oldStudents = await fetchFromSupabase('students');
    
    let mappedProfiles: any[] = [];
    const profileIds = new Set();
    const profileStudentIds = new Set();
    
    if (profiles && profiles.length > 0) {
      mappedProfiles = profiles.map((p: any) => {
        if (p.id) profileIds.add(p.id);
        if (p.student_id) profileStudentIds.add(p.student_id);
        
        return {
          id: p.student_id || p.id,
          name: `${p.first_name} ${p.last_name}`,
          grade: p.grade,
          contact: p.parent1_contact || 'N/A',
          status: p.status, // Use actual status
          photo_url: p.photo_url || undefined
        };
      });
    }
    
    const filteredOldStudents = (oldStudents || []).filter((s: any) => {
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
  
  getStaff: () => fetchFromSupabase('staff'),
  
  getBatches: () => fetchFromSupabase('batches'),
  getInvoices: () => fetchFromSupabase('invoices'),
  
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

    return { success: false, error: new Error('Invalid credentials or Supabase not connected') }
  }
}
