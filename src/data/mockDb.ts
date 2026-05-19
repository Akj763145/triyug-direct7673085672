import {
  Student,
  Staff,
  Invoice,
  Transaction,
  Resource,
  ActivityLog,
} from "../types";

export const mockStudents: Student[] = [
  { id: "STU-1001", name: "Aarav Sharma", grade: "10th Grade", contact: "+91 9876543210", status: "Active" },
  { id: "STU-1002", name: "Priya Patel", grade: "12th Grade", contact: "+91 9876543211", status: "Active" },
  { id: "STU-1003", name: "Rohan Gupta", grade: "11th Grade", contact: "+91 9876543212", status: "Active" },
  { id: "STU-1004", name: "Neha Singh", grade: "9th Grade", contact: "+91 9876543213", status: "Graduated" },
  { id: "STU-1005", name: "Vikram Mehta", grade: "10th Grade", contact: "+91 9876543214", status: "Active" },
];

export const mockStaff: Staff[] = [
  { id: "STF-201", name: "Dr. Anil Kumar", role: "Teacher", contact: "+91 9998887770", department: "Mathematics", salary: 75000 },
  { id: "STF-202", name: "Sunita Verma", role: "Admin", contact: "+91 9998887771", department: "Office", salary: 45000 },
  { id: "STF-203", name: "Ravi Desai", role: "Teacher", contact: "+91 9998887772", department: "Physics", salary: 70000 },
  { id: "STF-204", name: "Pooja Reddy", role: "Teacher", contact: "+91 9998887773", department: "Chemistry", salary: 68000 },
];

export const mockInvoices: Invoice[] = [
  { id: "INV-501", studentId: "STU-1001", studentName: "Aarav Sharma", category: "Tuition", amount: 15000, dueDate: "2023-11-15", status: "Paid" },
  { id: "INV-502", studentId: "STU-1002", studentName: "Priya Patel", category: "Lab Fee", amount: 5000, dueDate: "2023-11-20", status: "Unpaid" },
  { id: "INV-503", studentId: "STU-1003", studentName: "Rohan Gupta", category: "Tuition", amount: 15000, dueDate: "2023-11-25", status: "Partial" },
];

export const mockTransactions: Transaction[] = [
  { id: "TXN-901", date: "2023-10-01", description: "Tuition Collection - Sep", type: "Income", category: "Fees", amount: 450000 },
  { id: "TXN-902", date: "2023-10-05", description: "Staff Payroll - Sep", type: "Expense", category: "Payroll", amount: 258000 },
  { id: "TXN-903", date: "2023-10-12", description: "Internet Bill", type: "Expense", category: "Utilities", amount: 5000 },
  { id: "TXN-904", date: "2023-10-15", description: "New Projector Purchase", type: "Expense", category: "Resources", amount: 35000 },
  { id: "TXN-905", date: "2023-10-28", description: "Lab Fee Collection", type: "Income", category: "Fees", amount: 80000 },
];

export const mockResources: Resource[] = [
  { id: "RES-001", name: "Epson Projector 4K", category: "Physical", status: "Available", location: "Room 101" },
  { id: "RES-002", name: "Physics Lab Kits", category: "Physical", status: "In Use", location: "Lab A" },
  { id: "RES-003", name: "Zoom Pro License", category: "Digital", status: "Available", location: "Global" },
  { id: "RES-004", name: "MacBook Pro M2", category: "Physical", status: "Damaged", location: "IT Office" },
];

export const mockActivityLog: ActivityLog[] = [
  { id: 1, action: "Added new student", module: "Students", time: "2 hours ago", user: "Admin" },
  { id: 2, action: "Generated payroll for Oct", module: "Staff", time: "4 hours ago", user: "Finance" },
  { id: 3, action: "Checked out Epson Projector", module: "Resources", time: "1 day ago", user: "Dr. Anil Kumar" },
  { id: 4, action: "Recorded payment for INV-501", module: "Fees", time: "2 days ago", user: "Finance" },
  { id: 5, action: "Updated grade for STU-1002", module: "Students", time: "3 days ago", user: "Admin" },
];

export const chartData = [
  { month: "May", revenue: 420000, expenses: 240000 },
  { month: "Jun", revenue: 450000, expenses: 250000 },
  { month: "Jul", revenue: 480000, expenses: 260000 },
  { month: "Aug", revenue: 510000, expenses: 260000 },
  { month: "Sep", revenue: 530000, expenses: 298000 },
  { month: "Oct", revenue: 540000, expenses: 270000 },
];
