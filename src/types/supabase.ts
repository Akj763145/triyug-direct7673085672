export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      students: {
        Row: {
          id: string
          name: string
          grade: string
          contact: string
          status: string
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          grade: string
          contact: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          grade?: string
          contact?: string
          status?: string
          created_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          name: string
          role: string
          contact: string
          department: string
          salary: number
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          role: string
          contact: string
          department: string
          salary: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          contact?: string
          department?: string
          salary?: number
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          student_id: string
          student_name: string
          category: string
          amount: number
          due_date: string
          status: string
          created_at?: string
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          category: string
          amount: number
          due_date: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          category?: string
          amount?: number
          due_date?: string
          status?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          date: string
          description: string
          type: string
          category: string
          amount: number
          created_at?: string
        }
        Insert: {
          id?: string
          date: string
          description: string
          type: string
          category: string
          amount: number
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          description?: string
          type?: string
          category?: string
          amount?: number
          created_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          name: string
          category: string
          status: string
          location: string
          created_at?: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          status?: string
          location: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          status?: string
          location?: string
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: number
          action: string
          module: string
          time: string
          user: string
          created_at?: string
        }
        Insert: {
          id?: number
          action: string
          module: string
          time: string
          user: string
          created_at?: string
        }
        Update: {
          id?: number
          action?: string
          module?: string
          time?: string
          user?: string
          created_at?: string
        }
      }
    }
  }
}
