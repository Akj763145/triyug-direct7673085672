export interface Student {
  id: string;
  student_id?: string;
  name: string;
  grade: string;
  contact: string;
  status: "Active" | "Graduated";
  photo_url?: string;
  
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
  parent1_email?: string;
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

export interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  category: string;
  amount: number;
  dueDate: string;
  status: "Paid" | "Unpaid" | "Partial";
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "Income" | "Expense";
  category: "Fees" | "Payroll" | "Utilities" | "Resources" | "Rent";
  amount: number;
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
