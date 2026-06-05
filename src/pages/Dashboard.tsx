import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar, Users, UserCog, IndianRupee, Layers, QrCode, CheckCircle2, X, ChevronLeft, ChevronRight, Search, PartyPopper, Activity, MessageCircle, Send, Bus } from "lucide-react";
import { api, apiCache } from "../lib/api";
import { ActivityLog, Invoice } from "../types";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from "../components/ui/dialog";
import { QRScanner } from "../components/QRScanner";
import { HolidayManager } from "../components/HolidayManager";
import { supabase } from "../lib/supabase";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, getAccessToken, logout as googleLogout } from "../lib/auth";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { User } from "firebase/auth";

const playBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6 Note
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.error("Audio error", e);
  }
};

const formatDateFriendly = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch(e) {
    return dateStr;
  }
};

export function Dashboard({ isWelcomeActive = false }: { isWelcomeActive?: boolean }) {
  const navigate = useNavigate();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    fees: 0,
    expenses: 0,
    pendingEnquiries: 0,
    pendingInvoices: 0
  });
  const [loading, setLoading] = useState(() => !apiCache.has('students'));
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Daily Attendance Interactive States
  const [studentList, setStudentList] = useState<any[]>([]);
  const [fullStaffList, setFullStaffList] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [staffAttendanceRecords, setStaffAttendanceRecords] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState<boolean>(false);
  const [staffAttendanceLoading, setStaffAttendanceLoading] = useState<boolean>(false);
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("All");
  const [studentTransportFilter, setStudentTransportFilter] = useState<string>("All");
  const [studentBatchFilter, setStudentBatchFilter] = useState<string>("All");
  const [staffAttendanceSearch, setStaffAttendanceSearch] = useState<string>("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<string>("All");
  const [holidays, setHolidays] = useState<any[]>([]);

  // Overdue Invoices states
  const [dashboardInvoices, setDashboardInvoices] = useState<Invoice[]>([]);
  const [dashboardBatches, setDashboardBatches] = useState<{ id: string; name: string }[]>([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueSearch, setOverdueSearch] = useState("");
  const [overduePaymentMode, setOverduePaymentMode] = useState("All");
  const [overdueBatchFilter, setOverdueBatchFilter] = useState("All");
  const [overdueSort, setOverdueSort] = useState("dueDate_desc");
  const [overdueDateType, setOverdueDateType] = useState<'all' | 'month' | 'date'>('all');
  const [overdueDateValue, setOverdueDateValue] = useState("");
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);

  const loadHolidays = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('holidays').select('*');
    if (data) setHolidays(data);
  };

  const currentHoliday = useMemo(() => {
    return holidays.find(h => h.date === selectedDate);
  }, [holidays, selectedDate]);

  const loadDailyAttendance = async (dateStr: string) => {
    if (!supabase) return;
    setAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('date', dateStr);
      if (!error && data) {
        setAttendanceRecords(data);
      }
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadStaffDailyAttendance = async (dateStr: string) => {
    if (!supabase) return;
    setStaffAttendanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_attendance')
        .select('*')
        .eq('date', dateStr);
      if (!error && data) {
        setStaffAttendanceRecords(data);
      }
    } finally {
      setStaffAttendanceLoading(false);
    }
  };

  const handleToggleAttendance = async (studentId: string, actionStatus: string) => {
    if (!supabase) return;
    if (currentHoliday) {
      alert(`Cannot mark attendance on a holiday: ${currentHoliday.reason || 'General Holiday'}`);
      return;
    }
    try {
      await supabase
        .from('student_attendance')
        .upsert({
          student_id: studentId,
          date: selectedDate,
          status: actionStatus,
          subject: 'General',
          marked_by: 'Dashboard Quick Action',
          created_at: new Date().toISOString()
        }, { onConflict: 'student_id,date,subject' });
      
      await loadDailyAttendance(selectedDate);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTransport = async (studentId: string, currentValue: boolean) => {
    try {
      await api.updateStudentTransport(studentId, !currentValue);
      setStudentList(prev => prev.map(s => s.id === studentId ? { ...s, transport_facilitated: !currentValue } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStaffAttendance = async (staffId: string, actionStatus: string) => {
    if (!supabase) return;
    if (currentHoliday) {
      alert(`Cannot mark staff attendance on a holiday: ${currentHoliday.reason || 'General Holiday'}`);
      return;
    }
    try {
      await supabase
        .from('staff_attendance')
        .upsert({
          staff_id: staffId,
          date: selectedDate,
          status: actionStatus,
          created_at: new Date().toISOString()
        }, { onConflict: 'staff_id,date' });
      
      await loadStaffDailyAttendance(selectedDate);
    } catch (e) {
      console.error(e);
    }
  };

  const adjustDate = (days: number) => {
    try {
      const current = new Date(selectedDate);
      if (isNaN(current.getTime())) return;
      current.setDate(current.getDate() + days);
      setSelectedDate(current.toISOString().split('T')[0]);
    } catch (e) {
      console.error(e);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const attendanceBreakdown = useMemo(() => {
    const total = studentList.length || 0;
    const recordsMap: Record<string, string> = {};
    attendanceRecords.forEach(r => {
      recordsMap[r.student_id] = r.status;
    });

    const present = attendanceRecords.filter(r => r.status === 'Present').length;
    const absent = attendanceRecords.filter(r => r.status === 'Absent').length;
    const late = attendanceRecords.filter(r => r.status === 'Late').length;
    const excused = attendanceRecords.filter(r => r.status === 'Excused').length;
    const markedCount = present + absent + late + excused;
    const unmarked = Math.max(0, total - markedCount);
    const rate = total > 0 ? (present / total) * 100 : 0;

    return { total, present, absent, late, excused, unmarked, rate, recordsMap };
  }, [studentList, attendanceRecords]);

  const staffAttendanceBreakdown = useMemo(() => {
    const total = fullStaffList.length || 0;
    const recordsMap: Record<string, string> = {};
    staffAttendanceRecords.forEach(r => {
      recordsMap[r.staff_id] = r.status;
    });

    const present = staffAttendanceRecords.filter(r => r.status === 'Present').length;
    const absent = staffAttendanceRecords.filter(r => r.status === 'Absent').length;
    const late = staffAttendanceRecords.filter(r => r.status === 'Late').length;
    const rate = total > 0 ? (present / total) * 100 : 0;
    const unmarked = Math.max(0, total - staffAttendanceRecords.length);

    return { total, present, absent, late, unmarked, rate, recordsMap };
  }, [fullStaffList, staffAttendanceRecords]);

  const filteredAttendanceStudents = useMemo(() => {
    let filtered = studentList;
    if (studentStatusFilter !== "All") {
      filtered = filtered.filter((s: any) => {
        const status = attendanceBreakdown.recordsMap[s.id] || 'Unmarked';
        return status === studentStatusFilter;
      });
    }

    if (studentTransportFilter !== "All") {
      filtered = filtered.filter((s: any) => {
        if (studentTransportFilter === "Transport") return s.transport_facilitated === true;
        if (studentTransportFilter === "No Transport") return !s.transport_facilitated;
        return true;
      });
    }

    if (studentBatchFilter !== "All") {
      filtered = filtered.filter((s: any) => s.batch_id === studentBatchFilter);
    }

    const searchLower = attendanceSearch.toLowerCase().trim();
    if (searchLower !== '') {
      filtered = filtered.filter((s: any) => 
        (s.name?.toLowerCase() || "").includes(searchLower) ||
        (s.id?.toLowerCase() || "").includes(searchLower)
      );
    }
    return filtered;
  }, [studentList, attendanceSearch, studentStatusFilter, studentTransportFilter, studentBatchFilter, attendanceBreakdown]);

  const filteredAttendanceStaff = useMemo(() => {
    let filtered = fullStaffList;
    if (staffStatusFilter !== "All") {
      filtered = filtered.filter((s: any) => {
        const status = staffAttendanceBreakdown.recordsMap[s.id] || 'Unmarked';
        return status === staffStatusFilter;
      });
    }

    const searchLower = staffAttendanceSearch.toLowerCase().trim();
    if (searchLower !== '') {
      filtered = filtered.filter((s: any) => 
        (s.first_name?.toLowerCase() || "").includes(searchLower) ||
        (s.last_name?.toLowerCase() || "").includes(searchLower) ||
        (s.id?.toLowerCase() || "").includes(searchLower)
      );
    }
    return filtered;
  }, [fullStaffList, staffAttendanceSearch, staffStatusFilter, staffAttendanceBreakdown]);

  const loadDashboardData = async (dateStr: string) => {
    if (!supabase) return;
    if (!apiCache.has('students')) setLoading(true);
    setAttendanceLoading(true);
    setStaffAttendanceLoading(true);

    try {
      // CONSOLDATED DATA FETCHING: Single parallel execution for all initial dashboard data
      const [
        logs, 
        students, 
        staff, 
        invoices, 
        expenses,
        holidaysData,
        studentAtt,
        staffAtt,
        enquiries,
        batches
      ] = await Promise.all([
        api.getActivityLogs(),
        api.getStudents(),
        api.getStaff(),
        api.getInvoices(),
        api.getExpenses(),
        supabase.from('holidays').select('*'),
        supabase.from('student_attendance').select('*').eq('date', dateStr),
        supabase.from('staff_attendance').select('*').eq('date', dateStr),
        api.getEnquiries(),
        api.getBatches()
      ]);

      // Bulk State Updates (Reduces re-renders)
      setHolidays(holidaysData.data || []);
      setAttendanceRecords(studentAtt.data || []);
      setStaffAttendanceRecords(staffAtt.data || []);
      setStudentList(students);
      setFullStaffList(staff);
      setActivityLogs(logs as ActivityLog[]);
      setDashboardInvoices((invoices as Invoice[]) || []);
      setDashboardBatches((batches as any[]) || []);
      setStats({
        students: students.length,
        staff: staff.length,
        fees: (invoices as any[]).reduce((acc, inv) => acc + (inv.status === 'Paid' ? (inv.amount || inv.total_amount || inv.totalAmount || 0) : 0), 0),
        expenses: expenses.length,
        pendingEnquiries: Array.isArray(enquiries) ? enquiries.filter((e: any) => e.status === 'New').length : 0,
        pendingInvoices: Array.isArray(invoices) ? invoices.filter((i: any) => i.status === 'Pending' || i.status === 'Overdue').length : 0
      });
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
      setAttendanceLoading(false);
      setStaffAttendanceLoading(false);
    }
  };

  const dashboardOverdueInvoices = useMemo(() => {
    return dashboardInvoices.filter(i => 
      i.status === 'Overdue' || 
      (i.status !== 'Paid' && new Date(i.dueDate) < new Date())
    );
  }, [dashboardInvoices]);

  const dashboardOverdueTotalAmount = useMemo(() => {
    return dashboardOverdueInvoices.reduce((sum, i) => sum + i.amount, 0);
  }, [dashboardOverdueInvoices]);

  const filteredDashboardOverdueInvoices = useMemo(() => {
    const filtered = dashboardOverdueInvoices.filter(i => {
      const matchesSearch = !overdueSearch || 
        i.studentName?.toLowerCase().includes(overdueSearch.toLowerCase()) ||
        i.studentId?.toLowerCase().includes(overdueSearch.toLowerCase()) ||
        i.category?.toLowerCase().includes(overdueSearch.toLowerCase()) ||
        i.amount.toString().includes(overdueSearch) ||
        i.studentContact?.toLowerCase().includes(overdueSearch.toLowerCase()) ||
        i.studentWhatsapp?.toLowerCase().includes(overdueSearch.toLowerCase());

      const matchesPaymentMode = overduePaymentMode === "All" || i.paymentMethod === overduePaymentMode;
      const matchesBatch = overdueBatchFilter === "All" || (i.batchIds && i.batchIds.includes(overdueBatchFilter));
      
      let matchesDate = true;
      if (overdueDateType === 'month' && overdueDateValue) {
        matchesDate = i.dueDate.startsWith(overdueDateValue);
      } else if (overdueDateType === 'date' && overdueDateValue) {
        matchesDate = i.dueDate.startsWith(overdueDateValue);
      }
      
      return matchesSearch && matchesPaymentMode && matchesDate && matchesBatch;
    });

    return filtered.sort((a, b) => {
      if (overdueSort === 'amount_asc') return a.amount - b.amount;
      if (overdueSort === 'amount_desc') return b.amount - a.amount;
      if (overdueSort === 'dueDate_asc') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (overdueSort === 'dueDate_desc') return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      return 0;
    });
  }, [dashboardInvoices, overdueSearch, overduePaymentMode, overdueBatchFilter, overdueSort, overdueDateType, overdueDateValue]);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleSyncToCalendar = async () => {
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    const confirmed = window.confirm(
      "Are you sure you want to create a daily attendance summary event in your Google Calendar?"
    );
    if (!confirmed) return;

    setIsSyncing(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('*')
        .eq('date', date);

      const presentCount = attendanceData?.filter(a => a.status === 'Present').length || 0;
      const totalCount = attendanceData?.length || 0;

      const event = {
        summary: `School Attendance - ${date}`,
        description: `Total Students Marked: ${totalCount}\nPresent: ${presentCount}\nAbsent/Late/Excused: ${totalCount - presentCount}`,
        start: {
          date: date,
        },
        end: {
          date: date,
        }
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      if (!res.ok) throw new Error('Failed to create calendar event');
      alert('Successfully synced to Google Calendar!');
    } catch (error) {
      console.error('Calendar sync error:', error);
      alert('Failed to sync with calendar. Try signing in again.');
      setNeedsAuth(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleScanSuccess = async (rawInput: string) => {
    let decodedText = rawInput.trim();
    if (decodedText.startsWith('ATTENDANCE_SCAN:')) {
      decodedText = decodedText.split(':')[1];
    }
    const id = decodedText.toUpperCase();
    const date = new Date().toISOString().split('T')[0];
    
    const todayHoliday = holidays.find(h => h.date === date);
    if (todayHoliday) {
      setScanResult(`SYSTEM BLOCK: Today is a Holiday (${todayHoliday.reason || 'General Holiday'})`);
      setTimeout(() => setScanResult(null), 4000);
      return;
    }
    
    try {
      const { data: staffData } = await supabase.from('staffs').select('id, first_name, last_name').eq('id', id).single();
      
      if (staffData) {
         const { error } = await supabase
          .from('staff_attendance')
          .upsert({
            staff_id: id,
            date: date,
            status: 'Present'
          }, { onConflict: 'staff_id,date' });

         if (error) {
            setScanResult('Error marking staff attendance or duplicate');
         } else {
            playBeep();
            setScanResult(`Attendance marked for Staff: ${staffData.first_name} ${staffData.last_name}`);
         }
      } else {
         const { data: studentData } = await supabase.from('students').select('id, first_name, last_name').eq('id', id).single();
         
         if (studentData) {
            const { error } = await supabase
              .from('student_attendance')
              .upsert({
                student_id: id,
                date: date,
                status: 'Present',
                subject: 'General',
                marked_by: 'QR/Manual Scanner'
              }, { onConflict: 'student_id,date,subject' });
              
            if (error) {
              setScanResult('Error marking student attendance or duplicate');
            } else {
              playBeep();
              setScanResult(`Attendance marked for Student: ${studentData.first_name} ${studentData.last_name}`);
            }
         } else {
            setScanResult(`Invalid ID: Not Found in System (${id})`);
         }
      }
    } catch (err) {
      console.error(err);
      setScanResult('Database Error while scanning');
    }
    
    setTimeout(() => setScanResult(null), 3000);
  };

  useEffect(() => {
    loadDashboardData(selectedDate);
    initAuth(
      (u, t) => { setNeedsAuth(false); setUser(u); setToken(t); },
      () => { setNeedsAuth(true); setUser(null); setToken(null); }
    );
  }, []);

  // Real-time listener for updates to keep dashboard perfectly in sync
  useAutoRefresh(() => {
    loadDashboardData(selectedDate);
  }, ['enquiries', 'expenses', 'students', 'student_profiles']);

  useEffect(() => {
    // Only fetch date-specific data when date changes after initial load
    if (!loading) {
       loadDailyAttendance(selectedDate);
       loadStaffDailyAttendance(selectedDate);
    }
  }, [selectedDate]);

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-none shadow-sm shadow-slate-200/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4">
           <Card className="border-none shadow-sm shadow-slate-200/50">
             <CardHeader>
               <Skeleton className="h-6 w-48" />
             </CardHeader>
             <CardContent className="flex gap-4">
               {Array.from({ length: 3 }).map((_, i) => (
                 <Skeleton key={i} className="h-32 flex-1 rounded-xl" />
               ))}
             </CardContent>
           </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-none shadow-sm shadow-slate-200/50 h-[450px]">
             <CardHeader>
               <Skeleton className="h-6 w-48" />
             </CardHeader>
             <CardContent className="h-[350px]">
                <Skeleton className="h-full w-full rounded-xl" />
             </CardContent>
          </Card>
          <Card className="col-span-3 border-none shadow-sm shadow-slate-200/50">
             <CardHeader>
               <Skeleton className="h-6 w-32" />
             </CardHeader>
             <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
             </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm shadow-slate-200/50 bg-slate-50/50">
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial={isWelcomeActive ? "hidden" : "show"}
      animate={isWelcomeActive ? "hidden" : "show"}
      className="space-y-6"
    >
      <motion.div 
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-xs text-muted-foreground">Admin control panel & front-desk monitoring</p>
        </div>

        <div className="flex items-center gap-3">
          {needsAuth ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleGoogleLogin} className="flex gap-2 items-center">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Sign in Calendar
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" onClick={handleSyncToCalendar} disabled={isSyncing} className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700">
                <Calendar className="h-4 w-4" />
                {isSyncing ? "Syncing..." : "Sync Calendar"}
              </Button>
            </motion.div>
          )}

          <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 gap-2 transition-all">
                  <QrCode className="h-4 w-4" />
                  Scan Attendance
                </Button>
              </motion.div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Front Desk Scanner
                </DialogTitle>
                <DialogDescription>
                  Point the Student or Staff ID card QR code at the camera, or scan using a USB barcode scanner.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 flex flex-col items-center">
                 {isScannerOpen && !scanResult && (
                   <>
                     <QRScanner 
                        onScan={handleScanSuccess} 
                        onClose={() => setIsScannerOpen(false)} 
                     />
                     <div className="w-full mt-6">
                       <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 text-center">OR SCAN WITH BARCODE / TYPE ID</p>
                       <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = new FormData(e.currentTarget).get('manual_id') as string;
                          if (val) handleScanSuccess(val);
                          e.currentTarget.reset();
                       }}>
                         <input 
                           name="manual_id"
                           autoFocus
                           placeholder="Enter ID and press Enter..."
                           className="w-full bg-background border border-input rounded-md h-10 px-3 py-2 text-sm text-center"
                         />
                       </form>
                     </div>
                   </>
                 )}
                 
                 <AnimatePresence mode="wait">
                   {scanResult && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className={`mt-4 p-4 rounded-xl w-full flex items-center gap-3 border ${
                         scanResult.includes('Error') || scanResult.includes('Invalid') 
                           ? 'bg-destructive/10 border-destructive/20 text-destructive' 
                           : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                       }`}
                     >
                       {scanResult.includes('marked') ? <CheckCircle2 className="h-5 w-5" /> : <X className="h-5 w-5" />}
                       <span className="text-sm font-bold">{scanResult}</span>
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>
      
      {/* 🍱 BENTO WORKSPACE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full pb-8">
        
        {/* Priority Actions */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2">
          <Card className="h-32 bg-white rounded-3xl border border-slate-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className="h-8 w-8 bg-slate-50 flex items-center justify-center rounded-xl">
                <Users className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tighter text-slate-800">{stats.pendingEnquiries}</div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pending Enquiries</p>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2" onClick={() => setShowOverdueModal(true)}>
          <Card className="h-32 bg-white rounded-3xl border border-slate-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-5 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="h-8 w-8 bg-slate-50 flex items-center justify-center rounded-xl">
                <IndianRupee className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-black tracking-tighter text-rose-600">₹{dashboardOverdueTotalAmount.toLocaleString()}</div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{dashboardOverdueInvoices.length} Overdue Invoices</p>
            </div>
          </Card>
        </motion.div>

        {/* Small KPI Grid */}
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-4 h-32">
          {[
             { title: "Total Students", value: stats.students },
             { title: "Total Staff", value: stats.staff }
          ].map((kpi, idx) => (
             <Card key={idx} className="bg-white rounded-[20px] border border-slate-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-4 flex flex-col justify-center hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)] transition-all duration-300 h-full">
               <div className="text-xl font-black text-slate-800">{kpi.value}</div>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{kpi.title}</p>
             </Card>
          ))}
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-6 w-full">
           <HolidayManager />
        </motion.div>      {/* Operations Command Center: Consolidated Attendance & Personnel Tracking */}
      <motion.div variants={itemVariants} className="md:col-span-4 lg:col-span-6 h-full">
        <Card className="h-full border border-slate-100/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-3xl overflow-hidden bg-white flex flex-col">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4 py-6 px-8">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-black text-slate-950">Operations Center</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">Live datewise attendance monitoring and personnel roster management</CardDescription>
              </div>
            </div>

            {/* Global Date Control */}
            <div className="flex items-center gap-1.5 shrink-0 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => adjustDate(-1)} className="h-8 w-8 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-slate-700 px-1">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold font-mono focus:outline-none focus:ring-0 text-slate-700 cursor-pointer p-0 w-[115px]"
                />
                {isToday && <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Today</span>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => adjustDate(1)} className="h-8 w-8 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>

          <Tabs defaultValue="students" className="w-full">
            <div className="px-6 pt-4 border-b border-slate-50">
              <TabsList className="bg-slate-100/50 p-1 rounded-lg">
                <TabsTrigger value="students" className="text-xs font-black px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">STUDENT REGISTER</TabsTrigger>
                <TabsTrigger value="staff" className="text-xs font-black px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">STAFF REGISTER</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="students" className="p-0 animate-in fade-in duration-300">
              <CardContent className="p-6">
                {/* Student Attendance Content */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                  {[
                    { label: "Enrolled", value: attendanceBreakdown.total, color: "text-indigo-600", bg: "bg-indigo-50/30", filter: "All" },
                    { label: "Present", value: attendanceBreakdown.present, color: "text-emerald-600", bg: "bg-emerald-50/30", filter: "Present" },
                    { label: "Absentees", value: attendanceBreakdown.absent, color: "text-rose-600", bg: "bg-rose-50/30", filter: "Absent" },
                    { label: "Late", value: attendanceBreakdown.late, color: "text-amber-600", bg: "bg-amber-50/30", filter: "Late" },
                    { label: "Excused", value: attendanceBreakdown.excused, color: "text-sky-600", bg: "bg-sky-50/30", filter: "Excused" },
                    { label: "Unmarked", value: attendanceBreakdown.unmarked, color: "text-slate-400", bg: "bg-slate-100/30", filter: "Unmarked" },
                  ].map((item) => (
                    <div 
                      key={item.label} 
                      onClick={() => setStudentStatusFilter(item.filter)}
                      className={`border border-slate-100/50 rounded-xl p-3 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-sm ${item.bg} ${studentStatusFilter === item.filter ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      <span className={`text-xl font-black mt-1 ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase">Interactive Student Log</span>
                      {currentHoliday && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] animate-pulse">
                          <PartyPopper className="h-3 w-3 mr-1" /> {currentHoliday.reason || 'HOLIDAY'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <select 
                        value={studentBatchFilter} 
                        onChange={(e) => setStudentBatchFilter(e.target.value)}
                        className="text-xs h-8 px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 outline-none max-w-[150px] truncate"
                      >
                        <option value="All">All Batches</option>
                        {dashboardBatches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      <select 
                        value={studentTransportFilter} 
                        onChange={(e) => setStudentTransportFilter(e.target.value)}
                        className="text-xs h-8 px-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 outline-none max-w-[150px] truncate"
                      >
                        <option value="All">All Transport</option>
                        <option value="Transport">Using Transport</option>
                        <option value="No Transport">No Transport</option>
                      </select>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filter by name or ID..."
                          value={attendanceSearch}
                          onChange={(e) => setAttendanceSearch(e.target.value)}
                          className="w-full text-xs h-8 pl-8 pr-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {attendanceLoading ? (
                      <div className="p-10 text-center text-slate-400 animate-pulse text-xs font-bold uppercase">Syncing Registry...</div>
                    ) : filteredAttendanceStudents.map((student) => {
                      const status = attendanceBreakdown.recordsMap[student.id] || 'Unmarked';
                      return (
                        <div key={student.id} className="p-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px] text-indigo-600 border border-slate-200 shrink-0">
                              {student.name ? student.name.split(' ').map((n: string) => n[0]).join('').substring(0,2) : 'S'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-800 block leading-none truncate">{student.name}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-bold tracking-tight truncate">{student.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <button
                              onClick={() => handleToggleTransport(student.id, student.transport_facilitated || false)}
                              title={student.transport_facilitated ? "Using Transport" : "No Transport"}
                              className={`h-7 w-7 rounded border flex items-center justify-center transition-all shrink-0 ${student.transport_facilitated ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-300 border-slate-100 hover:text-slate-400 hover:border-slate-300'}`}
                            >
                              <Bus className="h-3 w-3" />
                            </button>
                            <Badge variant={status === "Present" ? "success" : status === "Absent" ? "destructive" : status === "Late" || status === "Excused" ? "warning" : "secondary"} className="text-[9px] font-black uppercase px-2 py-0.5 w-[60px] justify-center shrink-0 hidden sm:inline-flex">
                              {status}
                            </Badge>
                            <div className={`flex gap-1.5 shrink-0 ${currentHoliday ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                              {['Present', 'Absent', 'Late', 'Excused'].map((s) => (
                                <button
                                  key={s}
                                  disabled={!!currentHoliday}
                                  onClick={() => handleToggleAttendance(student.id, s)}
                                  className={`h-6 w-6 shrink-0 rounded border text-[10px] font-black transition-all ${status === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                >
                                  {s[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="staff" className="p-0 animate-in fade-in duration-300">
              <CardContent className="p-6">
                {/* Staff Attendance Content */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "Total Staff", value: staffAttendanceBreakdown.total, color: "text-indigo-600", bg: "bg-indigo-50/30", filter: "All" },
                    { label: "Present", value: staffAttendanceBreakdown.present, color: "text-emerald-600", bg: "bg-emerald-50/30", filter: "Present" },
                    { label: "Absent", value: staffAttendanceBreakdown.absent, color: "text-rose-600", bg: "bg-rose-50/30", filter: "Absent" },
                    { label: "Late Logins", value: staffAttendanceBreakdown.late, color: "text-amber-600", bg: "bg-amber-50/30", filter: "Late" },
                  ].map((item) => (
                    <div 
                      key={item.label} 
                      onClick={() => setStaffStatusFilter(item.filter)}
                      className={`border border-slate-100/50 rounded-xl p-3 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-sm ${item.bg} ${staffStatusFilter === item.filter ? 'ring-2 ring-indigo-500 border-transparent' : ''}`}>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                      <span className={`text-xl font-black mt-1 ${item.color}`}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/10">
                    <span className="text-xs font-bold text-slate-700 uppercase">Staff Daily Register</span>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search personnel..."
                        value={staffAttendanceSearch}
                        onChange={(e) => setStaffAttendanceSearch(e.target.value)}
                        className="w-full text-xs h-8 pl-8 pr-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {staffAttendanceLoading ? (
                      <div className="p-10 text-center text-slate-400 animate-pulse text-xs font-bold uppercase">Syncing Directory...</div>
                    ) : filteredAttendanceStaff.map((staff) => {
                      const status = staffAttendanceBreakdown.recordsMap[staff.id] || 'Unmarked';
                      return (
                        <div key={staff.id} className="p-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-[10px] text-indigo-700 border border-indigo-100 shrink-0">
                              {staff.first_name[0]}{staff.last_name[0]}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-black text-slate-900 block leading-none truncate">{staff.first_name} {staff.last_name}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-black uppercase tracking-tighter truncate">{staff.id}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <Badge variant={status === "Present" ? "success" : status === "Absent" ? "destructive" : status === "Late" ? "warning" : "outline"} className="text-[10px] font-black uppercase px-2 h-5 shadow-none w-[70px] justify-center shrink-0 hidden sm:inline-flex">
                              {status}
                            </Badge>
                            <div className={`flex gap-1.5 shrink-0 ${currentHoliday ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                              {['Present', 'Absent', 'Late'].map((s) => (
                                <button
                                  key={s}
                                  disabled={!!currentHoliday}
                                  onClick={() => handleToggleStaffAttendance(staff.id, s)}
                                  className={`h-7 w-7 shrink-0 rounded border text-[10px] font-black transition-all ${status === s ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                >
                                  {s[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>


      
      {/* Overdue Invoices Modal */}
      <Dialog open={showOverdueModal} onOpenChange={setShowOverdueModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between mt-2 pr-4">
              <div>
                <DialogTitle className="flex items-center text-xl font-bold">
                  Overdue Invoices
                </DialogTitle>
                <DialogDescription className="mt-1">
                  All pending and overdue invoices.
                </DialogDescription>
              </div>
              {selectedForBulk.size > 0 && (
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-sm px-4 rounded-full flex items-center gap-1.5"
                  onClick={() => setBulkReminderDialogOpen(true)}
                >
                  <MessageCircle className="w-4 h-4" />
                  Bulk Notify ({selectedForBulk.size})
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by ID, name, amount..." 
                className="pl-9 w-[250px] border-slate-200 bg-white"
                value={overdueSearch}
                onChange={(e) => setOverdueSearch(e.target.value)}
              />
            </div>
          
            <select
              className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm max-w-[200px] truncate"
              value={overdueDateType}
              onChange={(e) => {
                setOverdueDateType(e.target.value as any);
                setOverdueDateValue('');
              }}
            >
              <option value="all">All Time</option>
              <option value="month">By Month</option>
              <option value="date">By Date</option>
            </select>
            
            {overdueDateType === 'month' && (
              <Input
                type="month"
                className="h-9 w-[160px] bg-white"
                value={overdueDateValue}
                onChange={(e) => setOverdueDateValue(e.target.value)}
              />
            )}

            {overdueDateType === 'date' && (
              <Input
                type="date"
                className="h-9 w-[160px] bg-white"
                value={overdueDateValue}
                onChange={(e) => setOverdueDateValue(e.target.value)}
              />
            )}

            <select
              className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm max-w-[200px] truncate"
              value={overdueBatchFilter}
              onChange={(e) => setOverdueBatchFilter(e.target.value)}
            >
              <option value="All">All Batches</option>
              {dashboardBatches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <select
              className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm max-w-[200px]"
              value={overdueSort}
              onChange={(e) => setOverdueSort(e.target.value)}
            >
              <option value="dueDate_desc">Date (New-Old)</option>
              <option value="dueDate_asc">Date (Old-New)</option>
              <option value="amount_desc">Amount (High-Low)</option>
              <option value="amount_asc">Amount (Low-High)</option>
            </select>
          </div>

          <div className="bg-white rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={filteredDashboardOverdueInvoices.length > 0 && selectedForBulk.size === filteredDashboardOverdueInvoices.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForBulk(new Set(filteredDashboardOverdueInvoices.map(i => i.id)));
                        } else {
                          setSelectedForBulk(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDashboardOverdueInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No overdue invoices found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDashboardOverdueInvoices.map((invoice, i) => (
                    <TableRow key={invoice.id || i}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedForBulk.has(invoice.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedForBulk);
                            if (e.target.checked) newSet.add(invoice.id);
                            else newSet.delete(invoice.id);
                            setSelectedForBulk(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs">{invoice.id}</TableCell>
                      <TableCell>
                        <div className="font-semibold">{invoice.studentName}</div>
                        <div className="text-xs text-slate-500">{invoice.studentId}</div>
                      </TableCell>
                      <TableCell className="text-sm">{invoice.category}</TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const d = new Date(invoice.dueDate);
                          return !isNaN(d.getTime()) 
                            ? `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}` 
                            : invoice.dueDate;
                        })()}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        ₹{invoice.amount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setSelectedInvoiceForReminder(invoice);
                            setReminderDialogOpen(true);
                          }}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Remind
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageCircle className="h-6 w-6 text-emerald-600" />
              Send Reminder via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Select the contact number to send a fee reminder to {selectedInvoiceForReminder?.studentName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(!selectedInvoiceForReminder?.studentContact && !selectedInvoiceForReminder?.studentWhatsapp) ? (
               <div className="text-red-500 text-sm">No contact numbers found for this student.</div>
            ) : (
               <div className="space-y-2">
                 {selectedInvoiceForReminder?.studentWhatsapp && (
                   <Button variant="outline" className="w-full justify-start text-left" onClick={() => {
                        const message = `Hello, this is a reminder regarding the pending fee for ${selectedInvoiceForReminder?.category} of ₹${selectedInvoiceForReminder?.amount}. Please clear it at the earliest.`;
                        window.open(`https://wa.me/${selectedInvoiceForReminder.studentWhatsapp}?text=${encodeURIComponent(message)}`, '_blank');
                   }}>
                     <span className="font-bold mr-2">WhatsApp:</span> {selectedInvoiceForReminder.studentWhatsapp}
                   </Button>
                 )}
                 {selectedInvoiceForReminder?.studentContact && selectedInvoiceForReminder?.studentContact !== selectedInvoiceForReminder?.studentWhatsapp && (
                   <Button variant="outline" className="w-full justify-start text-left" onClick={() => {
                        const message = `Hello, this is a reminder regarding the pending fee for ${selectedInvoiceForReminder?.category} of ₹${selectedInvoiceForReminder?.amount}. Please clear it at the earliest.`;
                        window.open(`https://wa.me/${selectedInvoiceForReminder?.studentContact}?text=${encodeURIComponent(message)}`, '_blank');
                   }}>
                     <span className="font-bold mr-2">Contact:</span> {selectedInvoiceForReminder.studentContact}
                   </Button>
                 )}
               </div>
            )}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Reminder Dialog */}
      <Dialog open={bulkReminderDialogOpen} onOpenChange={setBulkReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageCircle className="h-6 w-6 text-emerald-600" />
              Bulk Send WhatsApp Reminders
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              You have selected {selectedForBulk.size} overdue invoices.
              Click on each student below to sequentially open WhatsApp with a standardized reminder message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4 max-h-[300px] overflow-y-auto pr-2">
            {Array.from(selectedForBulk).map(id => {
              const invoice = filteredDashboardOverdueInvoices.find(i => i.id === id);
              if (!invoice) return null;
              
              const phoneStr = invoice.studentWhatsapp || invoice.studentContact;
              const hasPhone = !!phoneStr;

              return (
                <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm">{invoice.studentName}</span>
                    <span className="text-xs text-slate-500">{invoice.category} - ₹{invoice.amount}</span>
                  </div>
                  {hasPhone ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8"
                      onClick={() => {
                        const message = `Hello, this is a reminder regarding the pending fee for ${invoice.category} of ₹${invoice.amount}. Please clear it at the earliest.`;
                        window.open(`https://wa.me/${phoneStr}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Send
                    </Button>
                  ) : (
                    <span className="text-xs text-red-500 font-medium">No Contact</span>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setBulkReminderDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div> {/* End Bento Grid */}
  </motion.div>
  );
}
