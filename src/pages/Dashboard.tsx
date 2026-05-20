import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Users, UserCog, IndianRupee, Layers, QrCode, CheckCircle2, X } from "lucide-react";
import { chartData } from "../data/mockDb";
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

export function Dashboard() {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    staff: 0,
    fees: 0,
    resources: 0
  });
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

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

      setActivityLogs(logs as ActivityLog[]);
      setStats({
        students: students.length,
        staff: staff.length,
        fees: (invoices as any[]).reduce((acc, inv) => acc + (inv.status === 'Paid' ? inv.amount : 0), 0),
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
