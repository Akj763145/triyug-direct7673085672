export interface Batch {
  id: string;
  name: string;
  description?: string;
  totalBatchAmount: number;
  minInstallments?: number;
  maxInstallments?: number;
  durationMonths?: number;
  facultyAssign?: string;
  thumbnail?: string;
  totalSeats?: number;
  availableSeats?: number;
  subject?: string;
  streamCategory?: string;
  boardTarget?: string;
  teachingMedium?: string;
  timing?: string;
  batchMode?: string;
  curriculumModules?: { title: string; topics: string }[];
  status: 'Active' | 'Archived' | 'Draft' | 'Running (Active Admissions)';
  createdAt?: string;
  updatedAt?: string;
}

export interface Student {
  id: string;
  created_at?: string;
  student_id?: string;
  name: string;
  grade: string;
  contact: string;
  status: "Active" | "Graduated";
  photo_url?: string;
  
  fee_per_installment?: number | null;
  fee_interval_months?: number | null;
  fee_duration_value?: number | null;
  fee_as_long_as_continues?: boolean;

  // Demographics
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  nationality?: string;
  is_international?: boolean;
  passport_number?: string;
  visa_status?: string;
  mother_tongue?: string;
  primary_language?: string;

  // Parent/Guardian 1
  parent1_name?: string;
  parent1_relation?: string;
  parent1_occupation?: string;
  parent1_income?: string;
  parent1_whatsapp?: string;
  parent1_contact?: string;

  // Parent/Guardian 2
  parent2_name?: string;
  parent2_relation?: string;
  parent2_occupation?: string;
  parent2_income?: string;
  parent2_email?: string;
  parent2_contact?: string;

  // Address
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;

  // Academic History
  previous_school?: string;
  last_grade_completed?: string;
  reason_for_leaving?: string;
  previous_gpa?: string;

  // Medical & Emergency
  allergies?: string;
  medical_conditions?: string;
  daily_medications?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_number?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: "Teacher" | "Admin";
  contact: string;
  department: string;
  salary: number;
}

export interface FeeTemplate {
  id: string;
  name: string; // e.g. "Computer Science 101"
  baseAmount: number;
}

export interface LedgerLineItem {
  id: string;
  title: string;
  amount: number;
}

export interface LedgerInvoice {
  id: string;
  studentId: string;
  templateId?: string;
  title: string; // e.g. "Tuition Fee - Core"
  totalAmount: number;
  dueDate: string;
  status: "Upcoming" | "Unpaid" | "Partial" | "Paid" | "Overdue";
  type: "Primary" | "Incidental";
  lineItems?: LedgerLineItem[];
}

export interface LedgerTransaction {
  id: string;
  invoiceId?: string;
  studentId?: string;
  date: string;
  amount: number;
  paymentMethod?: "UPI" | "Cash" | "Cheque" | "Card" | "Bank Transfer" | string;
  referenceId?: string;
  status?: "Success" | "Failed" | "Pending" | string;
  description?: string;
  type?: string;
  category?: string;
}


export interface Resource {
  id: string;
  name: string;
  category: "Physical" | "Digital";
  status: "Available" | "In Use" | "Damaged";
  location: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  module: string;
  time: string;
  user: string;
}

export interface PerformanceRecord {
  date: string;
  score: number;
  subject: string;
}

export interface SessionAttendance {
  subject: string;
  time: string;
  status: "Present" | "Absent" | "Late";
}

export interface AttendanceRecord {
  id?: string;
  student_id?: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Holiday" | "Excused";
  subject?: string;
  topics?: string;
  marked_by?: string;
  created_at?: string;
  sessions?: SessionAttendance[];
}

export interface CommunicationLog {
  id: string;
  date: string;
  type: "Teacher Note" | "Parent SMS" | "System Alert";
  sender: string;
  message: string;
}

export interface TeacherRemark {
  id: string;
  date: string;
  teacherName: string;
  comment: string;
  category: "Academic" | "Behavior" | "Attendance";
}

export interface StudentAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: "Pending" | "Submitted" | "Late" | "Graded";
  score?: number;
}

// Global Legacy / Page Utility compatibility aliases
export interface Invoice {
  id: string;
  studentId: string;
  studentName?: string;
  studentContact?: string;
  studentWhatsapp?: string;
  title?: string;
  category?: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Partial" | "Unpaid" | "Upcoming" | "Overdue";
  paymentMethod?: string;
  batchIds?: string[];
}

export type Transaction = LedgerTransaction;

