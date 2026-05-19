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
