export interface Student {
  id: string;
  name: string;
  grade: string;
  contact: string;
  status: "Active" | "Graduated";
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
  date: string;
  status: "Present" | "Absent" | "Late" | "Holiday";
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
