import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Calendar, Users, UserCog, IndianRupee, Layers, QrCode, CheckCircle2, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../lib/api";
import { ActivityLog } from "../types";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger 
} from "../components/ui/dialog";
import { QRScanner } from "../components/QRScanner";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, getAccessToken, logout as googleLogout } from "../lib/auth";
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

export function Dashboard() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    fees: 0,
    resources: 0
  });
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    initAuth(
      (u, t) => { setNeedsAuth(false); setUser(u); setToken(t); },
      () => { setNeedsAuth(true); setUser(null); setToken(null); }
    );
  }, []);

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
          date: date, // All day event
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

  const handleScanSuccess = async (decodedText: string) => {
    if (decodedText.startsWith('ATTENDANCE_SCAN:')) {
      const studentId = decodedText.split(':')[1];
      const date = new Date().toISOString().split('T')[0];
      
      try {
        const { error } = await supabase
          .from('student_attendance')
          .upsert({
            student_id: studentId,
            date: date,
            status: 'Present',
            subject: 'General',
            marked_by: 'QR Scanner'
          }, { onConflict: 'student_id,date,subject' });

        if (error) throw error;
        playBeep();
        setScanResult(`Attendance marked for ID: ${studentId}`);
        setTimeout(() => setScanResult(null), 3000);
      } catch (err) {
        console.error(err);
        setScanResult('Error marking attendance');
        setTimeout(() => setScanResult(null), 3000);
      }
    } else {
      setScanResult('Invalid QR Code');
      setTimeout(() => setScanResult(null), 3000);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      const [logs, students, staff, invoices, resources] = await Promise.all([
        api.getActivityLogs(),
        api.getStudents(),
        api.getStaff(),
        api.getInvoices(),
        api.getResources()
      ]);

      // Calculate dynamic chart financials
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const currentYear = new Date().getFullYear();
      
      const dynamicChartData = months.map(m => ({
        month: m,
        revenue: 0,
        expenses: 0
      }));

      // Account for real invoice revenues
      if (Array.isArray(invoices)) {
        invoices.forEach((inv: any) => {
          if (inv.due_date || inv.dueDate) {
            const dateStr = inv.due_date || inv.dueDate;
            const date = new Date(dateStr);
            if (!isNaN(date.getTime()) && date.getFullYear() === currentYear) {
              const monthIdx = date.getMonth();
              // Support both standard column naming and camelCase variations
              const amt = Number(inv.amount || inv.total_amount || inv.totalAmount || 0);
              const isPaid = inv.status?.toLowerCase() === 'paid';
              if (isPaid) {
                dynamicChartData[monthIdx].revenue += amt;
              }
            }
          }
        });
      }

      // Account for real payroll expenses
      if (Array.isArray(staff)) {
        staff.forEach((st: any) => {
          const sal = Number(st.salary || 0);
          dynamicChartData.forEach(d => {
            d.expenses += sal;
          });
        });
      }

      setChartData(dynamicChartData);
      setActivityLogs(logs as ActivityLog[]);
      setStats({
        students: students.length,
        staff: staff.length,
        fees: (invoices as any[]).reduce((acc, inv) => acc + (inv.status === 'Paid' ? (inv.amount || inv.total_amount || inv.totalAmount || 0) : 0), 0),
        resources: resources.length
      });
      setLoading(false);
    };
    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-xs text-muted-foreground">Admin control panel & front-desk monitoring</p>
        </div>

        <div className="flex items-center gap-3">
          {needsAuth ? (
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
          ) : (
             <Button variant="outline" onClick={handleSyncToCalendar} disabled={isSyncing} className="gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700">
               <Calendar className="h-4 w-4" />
               {isSyncing ? "Syncing..." : "Sync Calendar"}
             </Button>
          )}

          <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 gap-2 border-primary/20 border-b-4 hover:translate-y-[1px] active:border-b-0 active:translate-y-[4px] transition-all">
                <QrCode className="h-4 w-4" />
                Scan Attendance
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Front Desk Scanner
              </DialogTitle>
              <DialogDescription>
                Point the student ID card QR code at the camera.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col items-center">
               {isScannerOpen && !scanResult && (
                 <QRScanner 
                    onScan={handleScanSuccess} 
                    onClose={() => setIsScannerOpen(false)} 
                 />
               )}
               
               <AnimatePresence>
                 {scanResult && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
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
      </div>
      
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <UserCog className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staff}</div>
            <p className="text-xs text-muted-foreground">Enrolled personnel</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Collected</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.fees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total paid amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resources}</div>
            <p className="text-xs text-muted-foreground">Assets tracking</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Revenue vs. Expenses (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 h-[350px]">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dcd0" />
                  <XAxis dataKey="month" stroke="#8c857b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8c857b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2dcd0', color: '#2d2a26' }}
                    itemStyle={{ color: '#e07a5f' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#e07a5f" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expenses" stroke="#e63946" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No financial data to display yet.</div>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activityLogs || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-xs">No recent activity.</TableCell>
                  </TableRow>
                ) : (
                  activityLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-xs">{log.action}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.user}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{log.time}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
