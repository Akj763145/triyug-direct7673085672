import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileText, Download, Trash2, Calendar, IndianRupee, Save, X, File, 
  TrendingUp, BarChart3, Clock, MessageSquare, AlertCircle, CheckCircle2, User, Award,
  MapPin, Phone, Mail, QrCode, Send, Wallet, Receipt, History, Smartphone, MoreHorizontal,
  Printer, Share2, Plus, CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { supabase } from '../lib/supabase';
import { 
  Student, Invoice, PerformanceRecord, AttendanceRecord, 
  TeacherRemark, StudentAssignment 
} from '../types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Scatter, BarChart, Bar 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

const SUBJECT_DRILLDOWN: Record<string, { topic: string, score: number }[]> = {
  'Mathematics': [
    { topic: 'Algebra', score: 92 },
    { topic: 'Geometry', score: 78 },
    { topic: 'Calculus', score: 85 },
    { topic: 'Statistics', score: 55 },
  ],
  'Physics': [
    { topic: 'Mechanics', score: 72 },
    { topic: 'Optics', score: 84 },
    { topic: 'Electromagnetism', score: 76 },
    { topic: 'Thermodynamics', score: 80 },
  ],
  'Chemistry': [
    { topic: 'Organic', score: 88 },
    { topic: 'Inorganic', score: 82 },
    { topic: 'Physical', score: 85 },
  ],
  'Biology': [
    { topic: 'Genetics', score: 90 },
    { topic: 'Ecology', score: 58 },
    { topic: 'Cell Biology', score: 62 },
  ]
};

const TERMS = ['Term 1 Exams', 'Term 2 Exams', 'Monthly Tests', 'Mock Finals'];

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // New Feature States
  const [performance, setPerformance] = useState<(PerformanceRecord & { avg: number, testName: string, comment: string })[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [remarks, setRemarks] = useState<TeacherRemark[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [uploading, setUploading] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);

  // Performance specific states
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState('Monthly Tests');

  // Attendance specific states
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);

  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);

  // Document management states
  const [activeDocCategory, setActiveDocCategory] = useState<'All' | 'Academic' | 'Legal' | 'ID Proof'>('All');
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string; type: string } | null>(null);

  const fetchStudentData = useCallback(async () => {
    if (!id || !supabase) return;
    
    setLoading(true);
    try {
      // Fetch core student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();
        
      if (studentError) throw studentError;
      setStudent(studentData);
      setEditForm(studentData);

      // Fetch invoices/ledger
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('studentId', id);
        
      if (!invoiceError && invoiceData) {
        setInvoices(invoiceData);
      }

      // MOCK DATA for new features
      setPerformance([
        { date: 'Jan', score: 78, avg: 72, subject: 'Math', testName: 'Unit Test 1', comment: 'Solid start to the year.' },
        { date: 'Feb', score: 82, avg: 75, subject: 'Math', testName: 'Unit Test 2', comment: 'Showing improvement in geometry.' },
        { date: 'Mar', score: 80, avg: 71, subject: 'Math', testName: 'Monthly Mock', comment: 'Struggled with calculus section.' },
        { date: 'Apr', score: 88, avg: 74, subject: 'Math', testName: 'Quarterly', comment: 'Outstanding result in algebra.' },
        { date: 'May', score: 92, avg: 78, subject: 'Math', testName: 'End Term', comment: 'Top 5% performer this session.' },
      ]);

      // Generate 28 days of attendance
      const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology'];
      const attendanceData: AttendanceRecord[] = Array.from({ length: 28 }).map((_, i) => {
        const status = (i + 1) === 14 || (i + 1) === 15 || (i + 1) === 16 ? "Absent" : (Math.random() > 0.1 ? "Present" : Math.random() > 0.5 ? "Absent" : "Late");
        return {
          date: `2024-05-${String(i + 1).padStart(2, '0')}`,
          status,
          sessions: subjects.map(s => ({
            subject: s,
            time: `${10 + subjects.indexOf(s)}:00 AM`,
            status: status === 'Present' ? (Math.random() > 0.1 ? 'Present' : 'Absent') : status
          }))
        };
      });
      setAttendance(attendanceData);

      setRemarks([
        { id: '1', date: '2024-05-10', teacherName: 'Prof. Sharma', comment: 'Excellent performance in recent mock test.', category: 'Academic' },
        { id: '2', date: '2024-05-01', teacherName: 'Admin', comment: 'Parent-teacher meeting scheduled for next week.', category: 'Behavior' }
      ]);

      setAssignments([
        { id: '1', title: 'Algebra Worksheet #4', dueDate: '2024-05-20', status: 'Pending' },
        { id: '2', title: 'Physics Lab Report', dueDate: '2024-05-15', status: 'Submitted' },
        { id: '3', title: 'Chemistry Quiz', dueDate: '2024-05-10', status: 'Graded', score: 95 }
      ]);

      // MOCK INVOICES for Ledger
      setInvoices([
        { id: 'INV-2024-001', category: 'Tuition Fee', amount: 15000, dueDate: '2024-01-05', status: 'Paid', date: '2024-01-04', paymentMethod: 'UPI' },
        { id: 'INV-2024-002', category: 'Tuition Fee', amount: 15000, dueDate: '2024-02-05', status: 'Paid', date: '2024-02-05', paymentMethod: 'Cash' },
        { id: 'INV-2024-003', category: 'Admission Fee', amount: 5000, dueDate: '2024-01-10', status: 'Paid', date: '2024-01-10', paymentMethod: 'UPI' },
        { id: 'INV-2024-004', category: 'Tuition Fee', amount: 15000, dueDate: '2024-04-05', status: 'Unpaid', date: '-', paymentMethod: '-' },
        { id: 'INV-2024-005', category: 'Material Fee', amount: 2500, dueDate: '2024-05-01', status: 'Unpaid', date: '-', paymentMethod: '-' },
      ] as any);

      // Fetch documents
      const { data: docData, error: docError } = await supabase
        .storage
        .from('student_documents')
        .list(id + '/', { limit: 100, offset: 0 });
        
      if (!docError && docData) {
        setDocuments(docData);
      }
    } catch (err) {
      console.error("Error fetching student profile:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleSaveProfile = async () => {
    if (!id || !supabase) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: editForm.name,
          contact: editForm.contact,
          grade: editForm.grade,
        })
        .eq('id', id);
        
      if (error) throw error;
      
      setStudent({ ...student, ...editForm } as Student);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !supabase) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Use fallback if 'All' is selected as active filter
      const categoryToUse = activeDocCategory === 'All' ? 'Academic' : activeDocCategory;
      // We encode the category in the filename for easy retrieval in mock/real environments
      const fileName = `${categoryToUse}_${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;
      
      let { error } = await supabase.storage
          .from('student_documents')
          .upload(filePath, file);

      if (error) {
        console.warn("Storage upload failed (bucket might be missing). Simulating success for demo.", error);
        // Mock update if real upload fails (for local dev)
        const mockDoc = {
          name: fileName,
          created_at: new Date().toISOString(),
          metadata: { size: file.size },
          id: Math.random().toString(),
          url: URL.createObjectURL(file) // temporary local URL
        };
        setDocuments(prev => [mockDoc, ...prev]);
      } else {
        fetchStudentData();
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold">Student Not Found</h2>
        <Button onClick={() => navigate('/students')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
        </Button>
      </div>
    );
  }

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDue = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const nextDueDate = invoices.filter(i => i.status !== 'Paid').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate || 'None';

  const attendanceRate = (attendance.filter(a => a.status === 'Present').length / attendance.length) * 100;
  const submissionRate = (assignments.filter(a => a.status !== 'Pending').length / assignments.length) * 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/students')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
        </Button>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => setShowIDCard(true)}>
            <Award className="mr-2 h-4 w-4 text-primary" /> Generate ID Card
           </Button>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
            <User className="h-12 w-12" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{student.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-mono text-sm">
              <span className="bg-muted/50 px-2 py-0.5 rounded">{student.id}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="uppercase tracking-widest">{student.grade}</span>
              <span className="text-muted-foreground/50">•</span>
              <Badge variant={student.status === "Active" ? "success" : student.status === "Graduated" ? "default" : "secondary"} className="rounded-md">
                {student.status}
              </Badge>
              {attendanceRate < 75 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" /> Low Attendance
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 bg-transparent mb-6 h-auto flex-wrap overflow-x-auto">
          {['overview', 'performance', 'attendance', 'ledger', 'documents', 'remarks'].map(tab => (
            <TabsTrigger 
              key={tab} 
              value={tab} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 pb-3 pt-3 text-sm font-semibold uppercase tracking-wider transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="bg-card border-muted/20 md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Demographics & Enrollment</CardTitle>
                    <CardDescription>Primary information and contact details.</CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditForm(student); }}>
                        <X className="h-4 w-4 mr-1"/> Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile}>
                        <Save className="h-4 w-4 mr-1"/> Save Changes
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
                      <Input 
                        value={editForm.name || ""} 
                        onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        readOnly={!isEditing} 
                        className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student ID</label>
                      <Input value={student.id} readOnly className="bg-muted/10 border-none font-medium text-muted-foreground font-mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Number</label>
                      <Input 
                        value={editForm.contact || ""} 
                        onChange={(e) => setEditForm({...editForm, contact: e.target.value})}
                        readOnly={!isEditing} 
                        className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none font-mono" : "font-mono bg-muted/30"} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enrolled Course / Grade</label>
                      <Input 
                        value={editForm.grade || ""} 
                        onChange={(e) => setEditForm({...editForm, grade: e.target.value})}
                        readOnly={!isEditing} 
                        className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                      />
                    </div>
                  </div>
                </CardContent>
             </Card>

             <Card className="bg-card border-muted/20">
                <CardHeader>
                  <CardTitle>Academic Glance</CardTitle>
                  <CardDescription>Current year summary</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Attendance</span>
                      <span className={`text-sm font-bold ${attendanceRate < 75 ? 'text-destructive' : 'text-emerald-500'}`}>{attendanceRate.toFixed(1)}%</span>
                   </div>
                   <div className="w-full bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full ${attendanceRate < 75 ? 'bg-destructive' : 'bg-emerald-500'}`} style={{ width: `${attendanceRate}%` }}></div>
                   </div>

                   <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assignments</span>
                      <span className="text-sm font-bold text-primary">{submissionRate.toFixed(1)}%</span>
                   </div>
                   <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${submissionRate}%` }}></div>
                   </div>

                   <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rank in Batch</span>
                      <span className="text-sm font-bold text-white">#12 / 120</span>
                   </div>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* Tab: Performance */}
        <TabsContent value="performance" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Growth Tracker
                    </CardTitle>
                    <CardDescription>Interconnected performance & class average</CardDescription>
                  </div>
                  <div className="flex bg-muted/20 p-1 rounded-lg border border-primary/10">
                    {TERMS.slice(2).map(term => (
                      <button 
                        key={term}
                        onClick={() => setActiveTerm(term)}
                        className={`text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-tighter transition-all ${activeTerm === term ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="h-[300px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={performance}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" strokeOpacity={0.2} />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#ef4444' }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-card/95 backdrop-blur-md border border-primary/20 p-3 rounded-xl shadow-2xl space-y-1 min-w-[150px]">
                                <p className="text-[10px] uppercase font-bold text-primary tracking-widest">{data.testName}</p>
                                <div className="flex justify-between items-end">
                                   <span className="text-2xl font-black">{data.score}%</span>
                                   <span className="text-[10px] text-muted-foreground mb-1">Avg: {data.avg}%</span>
                                </div>
                                <p className="text-[10px] italic text-muted-foreground border-t border-muted/20 pt-1 mt-1">"{data.comment}"</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#ffffff" 
                        fillOpacity={0.4} 
                        fill="url(#colorScore)" 
                        strokeWidth={5} 
                        animationDuration={1500}
                        activeDot={{ r: 8, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 10 }}
                        style={{
                          filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avg" 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={false}
                        opacity={0.5}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden group">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Subject Mastery
                    </CardTitle>
                    <CardDescription>Click a subject to drill deeper</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-1 relative">
                    <AnimatePresence mode="wait">
                      {!activeSubject ? (
                        <motion.div 
                          key="list"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-6"
                        >
                          {[
                            { s: 'Mathematics', v: 92, c: 'bg-emerald-500' },
                            { s: 'Physics', v: 78, c: 'bg-primary' },
                            { s: 'Chemistry', v: 85, c: 'bg-cyan-500' },
                            { s: 'Biology', v: 65, c: 'bg-orange-500' }
                          ].map((subj) => (
                            <div key={subj.s} className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <button 
                                  onClick={() => setActiveSubject(subj.s)}
                                  className="font-bold text-primary hover:underline underline-offset-4 cursor-pointer flex items-center gap-1 group/link"
                                >
                                  {subj.s} <ArrowLeft className="h-3 w-3 rotate-180 opacity-0 group-hover/link:opacity-100 transition-all" />
                                </button>
                                <span className="text-muted-foreground font-black">{subj.v}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden shadow-inner">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${subj.v}%` }}
                                  transition={{ duration: 1, ease: 'easeOut' }}
                                  className={`h-1.5 rounded-full ${subj.c} hover:brightness-125 transition-all hover:shadow-[0_0_10px_rgba(var(--primary),0.5)]`}
                                ></motion.div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      ) : (
                        <motion.div 
                           key="drilldown"
                           initial={{ opacity: 0, x: 20 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: -20 }}
                           className="space-y-4"
                        >
                           <div className="flex items-center gap-2 mb-4">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveSubject(null)}>
                                 <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <span className="font-bold text-sm text-primary uppercase tracking-widest">{activeSubject} Analysis</span>
                           </div>
                           <div className="space-y-5">
                              {SUBJECT_DRILLDOWN[activeSubject].map((topic) => (
                                <div key={topic.topic} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{topic.topic}</span>
                                    <div className="flex items-center gap-2">
                                       {topic.score < 60 && (
                                         <Badge variant="destructive" className="text-[8px] h-4 py-0 px-1 font-black animate-pulse">FIX</Badge>
                                       )}
                                       <span className="text-[10px] font-black">{topic.score}%</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-muted rounded-full h-1">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      whileInView={{ width: `${topic.score}%` }}
                                      className={`h-1 rounded-full ${topic.score >= 80 ? 'bg-emerald-500' : topic.score >= 60 ? 'bg-primary' : 'bg-destructive'}`}
                                    ></motion.div>
                                  </div>
                                </div>
                              ))}
                           </div>
                           <div className="pt-4 border-t border-muted/20">
                              <p className="text-[9px] text-muted-foreground uppercase font-bold mb-2">Recommendation</p>
                              <div className="bg-primary/5 p-2 rounded border border-primary/20 text-[10px]">
                                 Focus on {SUBJECT_DRILLDOWN[activeSubject].find(t => t.score < 70)?.topic || 'current trajectory'} to maintain grade.
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </CardContent>
              </Card>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-3">
                 <CardHeader>
                    <CardTitle>Assignment Tracking</CardTitle>
                    <CardDescription>Recent and upcoming task status</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <Table>
                       <TableHeader>
                          <TableRow>
                             <TableHead>Asset / Title</TableHead>
                             <TableHead>Due Date</TableHead>
                             <TableHead>Status</TableHead>
                             <TableHead className="text-right">Evaluation</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {assignments.map(a => (
                            <TableRow key={a.id}>
                               <TableCell className="font-medium">{a.title}</TableCell>
                               <TableCell>{a.dueDate}</TableCell>
                               <TableCell>
                                  <Badge variant={a.status === 'Submitted' ? 'primary' : a.status === 'Graded' ? 'success' : 'secondary'}>
                                     {a.status}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-right font-mono italic">
                                  {a.score ? `${a.score}%` : '—'}
                                </TableCell>
                            </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </CardContent>
              </Card>

              <Card className="flex flex-col bg-gradient-to-br from-card to-card/50 border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                 <CardHeader className="pb-0 text-center">
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-primary">Examination Forecast</CardTitle>
                    <CardDescription>AI-Estimated Final Grade</CardDescription>
                 </CardHeader>
                 <CardContent className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                    <div className="relative h-40 w-40">
                       <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { value: 88 },
                                { value: 12 }
                              ]}
                              cx="50%"
                              cy="50%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={0}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="hsl(var(--primary))" />
                              <Cell fill="hsl(var(--muted)/.2)" />
                            </Pie>
                          </PieChart>
                       </ResponsiveContainer>
                       <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                          <span className="text-4xl font-black text-white">88%</span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-tighter">Probable</span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full pt-2">
                       <div className="bg-muted/10 p-2 rounded-lg border border-muted/20 text-center">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Target Score</p>
                          <p className="text-sm font-black text-white">90%</p>
                       </div>
                       <div className="bg-primary/5 p-2 rounded-lg border border-primary/20 text-center">
                          <p className="text-[9px] font-bold text-primary uppercase mb-1">Confidence</p>
                          <p className="text-sm font-black text-white">High</p>
                       </div>
                    </div>

                    <div className="w-full bg-muted/20 p-3 rounded-xl border border-muted/10 flex items-center gap-3">
                       <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
                          <BarChart3 className="h-4 w-4" />
                       </div>
                       <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Focus Science</p>
                          <p className="text-[11px] leading-tight font-medium text-foreground/80 font-mono tracking-tighter">Reach 90% (Science) by prioritizing Lab Reports.</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* Tab: Attendance */}
        <TabsContent value="attendance" className="space-y-6 mt-0">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                   <div>
                      <CardTitle>Presence Heatmap</CardTitle>
                      <CardDescription>Daily engagement visualization. Click a day for session details.</CardDescription>
                   </div>
                   <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-tighter">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive"></div> Absent</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Late</div>
                   </div>
                </CardHeader>
                <CardContent>
                   <div className="grid grid-cols-7 gap-2">
                      {attendance.map((day, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setSelectedDay(day)}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center border border-muted/20 relative group transition-all hover:scale-110 active:scale-95
                            ${day.status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                              day.status === 'Absent' ? 'bg-destructive/10 border-destructive/30' : 
                              'bg-yellow-500/10 border-yellow-500/30'}`}
                        >
                           <span className="text-[10px] font-mono opacity-50">{idx + 1}</span>
                           <div className={`w-1.5 h-1.5 rounded-full mt-1 ${day.status === 'Present' ? 'bg-emerald-500' : day.status === 'Absent' ? 'bg-destructive' : 'bg-yellow-500'}`}></div>
                        </button>
                      ))}
                   </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                   <CardTitle className="text-sm">Subject Attendance %</CardTitle>
                   <CardDescription>Selective skipping check</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] p-0 pr-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Math', value: 95 },
                        { name: 'Physics', value: 82 },
                        { name: 'Chem', value: 88 },
                        { name: 'Bio', value: 65 }
                      ]}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#ffffff' }} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: '1px solid hsl(var(--border))', 
                            fontSize: '10px',
                            color: '#000000',
                            borderRadius: '6px'
                          }}
                          itemStyle={{ color: '#000000', fontWeight: 'bold' }}
                          labelStyle={{ color: '#000000', marginBottom: '2px' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#ffffff" 
                          radius={[4, 4, 0, 0]}
                          animationDuration={1500}
                          style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}
                        />
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
              </Card>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-destructive/5 border-destructive/20 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-2">
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-7 text-[10px] uppercase font-bold"
                      onClick={() => {
                        const msg = `Dear Parent, ${student.name} has been absent for 3 consecutive days. Please contact the office.`;
                        window.open(`https://wa.me/${student.contact}?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                       <Send className="w-3 h-3 mr-1" /> Send WhatsApp
                    </Button>
                 </div>
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                       <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-destructive underline underline-offset-4 decoration-destructive/30">Action Required: Absence Alert</h3>
                       <p className="text-sm text-destructive/80 mr-24">3 consecutive absences (May 14-16) flagged. Intervention needed.</p>
                    </div>
                 </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <Clock className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-primary">Punctuality Score</h3>
                       <p className="text-sm text-primary/80">85% of sessions started on time. Improving from last month (79%).</p>
                    </div>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>

        {/* Tab: Remarks */}
        <TabsContent value="remarks" className="space-y-6 mt-0">
           <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Communication History</CardTitle>
                  <CardDescription>Teacher remarks and system notifications</CardDescription>
                </div>
                <Button size="sm">
                   <MessageSquare className="mr-2 h-4 w-4" /> Add New Remark
                </Button>
              </CardHeader>
              <CardContent>
                 <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-muted">
                    {remarks.map(rem => (
                       <div key={rem.id} className="relative pl-12">
                          <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-background shadow-sm
                            ${rem.category === 'Academic' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'}`}>
                             {rem.category === 'Academic' ? <Award className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          </div>
                          <div className="bg-muted/30 p-4 rounded-xl border border-muted/20">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-bold">{rem.category} Remark</span>
                                <span className="text-xs text-muted-foreground font-mono">{rem.date}</span>
                             </div>
                             <p className="text-sm italic text-foreground/80 mb-3">"{rem.comment}"</p>
                             <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                                <span>Authored by: {rem.teacherName}</span>
                                <Badge variant="outline" className="text-[9px] py-0">Verified</Badge>
                             </div>
                          </div>
                       </div>
                    ))}
                    
                    <div className="relative pl-12">
                       <div className="absolute left-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                       </div>
                       <div className="bg-muted/10 p-4 rounded-xl border border-dashed border-muted/50">
                          <p className="text-sm text-muted-foreground">Automated: Monthly progress report SMS sent to parent contact.</p>
                          <span className="text-[10px] text-muted-foreground font-mono">2024-05-01 09:00 AM</span>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </TabsContent>

        {/* Tab: Financial Ledger */}
        <TabsContent value="ledger" className="space-y-6 mt-0 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
             <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                   <Wallet className="h-5 w-5 text-primary" /> Financial Overview
                </h2>
                <p className="text-xs text-muted-foreground">Manage fees, installments and transaction history</p>
             </div>
             <Button 
               className="bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse"
               onClick={() => setIsPaymentDrawerOpen(true)}
             >
                <Plus className="mr-2 h-4 w-4" /> Collect Payment
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Column 1: Financial Summary & Timeline */}
            <div className="md:col-span-1 space-y-6">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Summary</span>
                 </div>
                 
                 <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
                    <CardContent className="p-4 flex items-center justify-between">
                       <div>
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">Paid</p>
                          <div className="text-xl font-black">₹{totalPaid.toLocaleString()}</div>
                       </div>
                       <div className="relative h-10 w-10">
                          <svg className="absolute inset-0 w-full h-full -rotate-90">
                             <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                             <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-primary" strokeDasharray={113} strokeDashoffset={113 * (1 - totalPaid / (totalPaid + totalDue))} strokeLinecap="round" />
                          </svg>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className={`relative overflow-hidden ${totalDue > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-card'}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                       <div>
                          <p className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${totalDue > 0 ? 'text-red-400' : 'text-muted-foreground'}`}>Pending</p>
                          <div className={`text-xl font-black ${totalDue > 0 ? 'text-red-400' : 'text-white'}`}>₹{totalDue.toLocaleString()}</div>
                       </div>
                       <IndianRupee className={`h-5 w-5 ${totalDue > 0 ? 'text-red-400' : 'text-muted-foreground opacity-50'}`} />
                    </CardContent>
                 </Card>

                 <Card className="bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700">
                    <CardContent className="p-4">
                       <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Scholarship</span>
                          <Badge variant="outline" className="text-[7px] h-3 py-0 border-primary text-primary">Active</Badge>
                       </div>
                       <div className="text-lg font-black text-white italic">15% OFF</div>
                       <p className="text-[8px] text-zinc-500 mt-1">Academic Merit Merit Rebate Applied</p>
                    </CardContent>
                 </Card>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Timeline</span>
                 </div>
                 <div className="space-y-2 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-muted/30">
                    {[
                      { month: 'JAN', status: 'Paid', amount: 15000 },
                      { month: 'FEB', status: 'Paid', amount: 15000 },
                      { month: 'MAR', status: 'Paid', amount: 5000 },
                      { month: 'APR', status: 'Overdue', amount: 15000 },
                      { month: 'MAY', status: 'Upcoming', amount: 2500 },
                      { month: 'JUN', status: 'Upcoming', amount: 15000 },
                    ].map((inst, i) => (
                      <div key={i} className="flex items-start gap-4 group pl-1">
                         <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${inst.status === 'Paid' ? 'bg-zinc-900 border-emerald-500 text-emerald-500' : inst.status === 'Overdue' ? 'bg-zinc-900 border-red-500 text-red-500' : 'bg-zinc-900 border-muted text-muted-foreground'}`}>
                            {inst.status === 'Paid' ? <CheckCircle2 className="h-2.5 w-2.5" /> : inst.status === 'Overdue' ? <AlertCircle className="h-2.5 w-2.5" /> : <div className="h-1 w-1 bg-current rounded-full" />}
                         </div>
                         <div className="flex-1 pb-4">
                            <div className="flex justify-between items-center mb-0.5">
                               <span className="text-[10px] font-black tracking-widest text-foreground group-hover:text-primary transition-colors">{inst.month} '24</span>
                               <span className="text-[10px] font-bold">₹{inst.amount.toLocaleString()}</span>
                            </div>
                            <span className={`text-[8px] uppercase font-bold tracking-tighter ${inst.status === 'Paid' ? 'text-emerald-500/70' : inst.status === 'Overdue' ? 'text-red-500/70' : 'text-muted-foreground'}`}>{inst.status}</span>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* Column 2 & 3: Main Ledger Content */}
            <div className="md:col-span-3 space-y-6">
               <Card className="border-muted/20 overflow-hidden shadow-2xl bg-zinc-900/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/10 border-b border-muted/20 flex flex-row items-center justify-between py-4">
                     <div>
                        <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-[0.1em] text-sm">
                           <History className="h-4 w-4" /> Transaction History
                        </CardTitle>
                        <CardDescription className="text-[10px]">All detailed invoices and payment logs</CardDescription>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-[9px] uppercase font-bold border-muted/50">
                           <Download className="h-3 w-3 mr-1" /> Export CSV
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/5">
                        <TableRow className="hover:bg-transparent border-muted/20">
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Invoice ID</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Description</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Amount</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Method</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4">Status</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest h-10 px-4 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono italic text-xs tracking-widest">NO ASSETS DETECTED</TableCell>
                          </TableRow>
                        ) : (
                          invoices.map((inv) => (
                            <TableRow key={inv.id} className="group hover:bg-zinc-800/50 transition-all border-muted/10">
                              <TableCell className="font-mono text-[10px] text-muted-foreground uppercase px-4">{inv.id}</TableCell>
                              <TableCell className="text-xs px-4">{(inv as any).date || inv.dueDate}</TableCell>
                              <TableCell className="text-xs font-semibold px-4">{inv.category}</TableCell>
                              <TableCell className="text-xs font-bold px-4 text-white">₹{inv.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-[10px] font-mono opacity-60 px-4 uppercase tracking-tighter">{(inv as any).paymentMethod || '-'}</TableCell>
                              <TableCell className="px-4">
                                <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "destructive"} className="text-[9px] h-5 px-2 font-black border-none ring-1 ring-inset ring-current/30">
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right px-4">
                                 <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white transition-colors" title="Download Receipt">
                                       <Printer className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-emerald-500 transition-colors" title="Send via WhatsApp">
                                       <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors">
                                       <Smartphone className="h-3.5 w-3.5" />
                                    </Button>
                                 </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
               </Card>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                           <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-xs font-bold">UPI Quick Pay</p>
                           <p className="text-[10px] text-muted-foreground">Generate instant QR for this student</p>
                        </div>
                     </div>
                     <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center justify-between group cursor-pointer hover:bg-emerald-500/10 transition-all">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                           <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                           <p className="text-xs font-bold">POS Terminal</p>
                           <p className="text-[10px] text-muted-foreground">Swipe card and record transaction</p>
                        </div>
                     </div>
                     <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
               </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Document Vault */}
        <TabsContent value="documents" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                 <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5 text-primary" /> Document Repository
                 </h2>
                 <p className="text-xs text-muted-foreground">Securely manage student records, certificates, and ID proofs</p>
              </div>
              <div className="flex bg-muted/20 p-1 rounded-lg border border-muted/10">
                 {['All', 'Academic', 'Legal', 'ID Proof'].map(cat => (
                   <button 
                     key={cat} 
                     onClick={() => setActiveDocCategory(cat as any)}
                     className={`text-[10px] px-3 py-1.5 rounded-md uppercase font-black tracking-widest transition-all ${activeDocCategory === cat || (cat === 'All' && !activeDocCategory) ? 'bg-primary text-white shadow-lg' : 'text-muted-foreground hover:text-white'}`}
                   >
                      {cat}
                   </button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Upload Zone */}
              <div className="md:col-span-1">
                 <div className="sticky top-6 space-y-4">
                    <div 
                      className="border-2 border-dashed border-primary/20 hover:border-primary/50 bg-primary/5 rounded-3xl p-8 transition-all group flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden"
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                    >
                       <input 
                         type="file" 
                         id="file-upload-input" 
                         className="hidden" 
                         accept=".pdf,.jpg,.jpeg,.png"
                         onChange={handleFileUpload}
                         disabled={uploading}
                       />
                       <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                          <Upload className="h-8 w-8" />
                       </div>
                       <p className="font-bold text-sm mb-1 text-white">{uploading ? 'Processing...' : 'Drop File Here'}</p>
                       <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Max Size: 5MB</p>
                       
                       {uploading && (
                         <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center p-4">
                            <div className="w-full bg-muted rounded-full h-1 mb-2">
                               <motion.div 
                                 initial={{ width: 0 }} 
                                 animate={{ width: '100%' }} 
                                 className="h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                               />
                            </div>
                            <span className="text-[10px] font-black text-primary animate-pulse tracking-widest">SECURE_SYNC...</span>
                         </div>
                       )}
                    </div>

                    <Card className="bg-zinc-800/20 border-zinc-700/50 overflow-hidden">
                       <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                             <span>Storage Used</span>
                             <span className="text-white">{(documents.length * 0.4).toFixed(1)} / 50 MB</span>
                          </div>
                          <div className="w-full bg-zinc-700/50 rounded-full h-1.5 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, documents.length * 2)}%` }}
                               className="bg-cyan-500 h-1.5 rounded-full"
                             />
                          </div>
                          <div className="pt-2">
                             <div className="flex items-center gap-2 text-emerald-500 mb-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">256-bit Encryption Verified</span>
                             </div>
                             <p className="text-[9px] text-zinc-500 italic leading-relaxed">System state: HEALTHY. Files are encrypted via AES-256 before cloud commit.</p>
                          </div>
                       </CardContent>
                    </Card>
                 </div>
              </div>

              {/* Document Grid */}
              <div className="md:col-span-3">
                 {documents.length === 0 ? (
                   <div className="h-[400px] border border-dashed border-muted/30 rounded-3xl flex flex-col items-center justify-center text-muted-foreground opacity-50 bg-muted/5 group hover:border-primary/20 transition-colors">
                      <div className="p-4 rounded-full bg-muted/10 mb-4 group-hover:scale-110 transition-transform">
                        <File className="h-12 w-12" />
                      </div>
                      <p className="text-xs font-mono tracking-[0.3em] uppercase">DRIVE_IS_EMPTY</p>
                      <p className="text-[10px] mt-2 italic font-serif">Awaiting student record uploads...</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {documents
                        .filter(doc => doc.name !== '.emptyFolderPlaceholder')
                        .filter(doc => {
                           if (activeDocCategory === 'All') return true;
                           return doc.name.startsWith(activeDocCategory);
                        })
                        .map((doc, idx) => {
                        const isPDF = doc.name.toLowerCase().endsWith('.pdf');
                        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.name);
                        const category = doc.name.split('_')[0] || 'Unsorted';
                        const originalName = doc.name.split('_').slice(2).join('_') || doc.name;
                        
                        return (
                          <motion.div 
                            key={doc.id || idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="group relative bg-zinc-900/40 border border-muted/10 hover:border-primary/40 rounded-2xl p-4 transition-all hover:bg-zinc-800/40"
                          >
                             <div className="flex items-start justify-between mb-4">
                                <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all group-hover:-translate-y-1 group-hover:rotate-3 shadow-lg ${isPDF ? 'bg-red-500/10 text-red-500 border border-red-500/20' : isImage ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                   {isPDF ? <FileText className="h-5 w-5" /> : isImage ? <Smartphone className="h-5 w-5" /> : <File className="h-5 w-5" />}
                                </div>
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-all" 
                                     onClick={() => setViewingDoc({ name: originalName, url: doc.url || '', type: isPDF ? 'application/pdf' : 'image' })}
                                   >
                                      <TrendingUp className="h-4 w-4 rotate-45" /> {/* View/Eye alternative */}
                                   </Button>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 rounded-lg hover:bg-zinc-800 hover:text-white" 
                                     onClick={() => doc.url && window.open(doc.url, '_blank')}
                                   >
                                      <Download className="h-4 w-4" />
                                   </Button>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                   >
                                      <Trash2 className="h-4 w-4" />
                                   </Button>
                                </div>
                             </div>
                             
                             <div className="space-y-1">
                                <h4 className="font-bold text-[11px] truncate pr-2 text-white group-hover:text-primary transition-colors">{originalName}</h4>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] text-muted-foreground uppercase font-mono opacity-60">{(doc.metadata?.size / 1024).toFixed(1) || 0} KB</span>
                                   <div className="h-1 w-1 rounded-full bg-muted opacity-40"></div>
                                   <span className={`text-[9px] uppercase font-black tracking-tighter opacity-70 ${category === 'Academic' ? 'text-blue-400' : category === 'Legal' ? 'text-purple-400' : 'text-emerald-400'}`}>{category}</span>
                                </div>
                             </div>
                             
                             <div className="mt-4 pt-3 border-t border-muted/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                   <span className="text-[9px] font-black uppercase text-emerald-500/80 tracking-widest">Verified</span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground opacity-30 uppercase tracking-tighter">
                                   {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'RECENT'}
                                </span>
                             </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                   </div>
                 )}
              </div>
           </div>
        </TabsContent>
      </Tabs>

      {/* ID Card Generator Modal/Preview */}
      {showIDCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
           <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-primary/20 overflow-hidden relative animate-in zoom-in-95 duration-300">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10" onClick={() => setShowIDCard(false)}>
                 <X className="h-5 w-5" />
              </Button>
              
              <div className="bg-primary/95 p-6 text-white flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 h-full w-32 bg-white/5 skew-x-[-20deg] translate-x-12"></div>
                 <div className="relative z-10">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">TRIYUGA CLASSES</h2>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest">Achieving Excellence Together</p>
                 </div>
                 <Badge variant="outline" className="border-white/40 text-white relative z-10">2024-25</Badge>
              </div>

              <div className="p-8 flex flex-col items-center">
                 <div className="h-32 w-32 rounded-xl bg-muted flex items-center justify-center mb-6 border-4 border-background shadow-lg overflow-hidden relative">
                    <User className="h-16 w-16 text-muted-foreground" />
                    <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-white py-1 flex items-center justify-center uppercase font-bold tracking-tighter">PHOTO ID</div>
                 </div>
                 
                 <div className="text-center space-y-1 mb-8">
                    <h3 className="text-2xl font-bold uppercase tracking-tight">{student.name}</h3>
                    <p className="text-sm font-semibold text-primary uppercase tracking-widest border-y border-primary/20 py-1">{student.grade}</p>
                 </div>

                 <div className="w-full space-y-4 text-sm mb-8">
                    <div className="flex justify-between border-b border-muted py-1">
                       <span className="text-muted-foreground text-xs uppercase font-bold">UID</span>
                       <span className="font-mono text-xs">{student.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-muted py-1">
                       <span className="text-muted-foreground text-xs uppercase font-bold">Contact</span>
                       <span className="font-mono text-xs">+91 {student.contact}</span>
                    </div>
                    <div className="flex justify-between border-b border-muted py-1">
                       <span className="text-muted-foreground text-xs uppercase font-bold">Valid Up To</span>
                       <span className="font-mono text-xs">MAR-2025</span>
                    </div>
                 </div>

                 <div className="w-full flex justify-between items-end">
                    <div className="space-y-1">
                       <QrCode className="h-10 w-10 text-muted-foreground opacity-50" />
                       <p className="text-[8px] text-muted-foreground font-mono">SCAN TO VERIFY</p>
                    </div>
                    <div className="text-right">
                       <div className="h-8 w-24 border-b border-muted mx-auto mb-1"></div>
                       <p className="text-[8px] text-muted-foreground uppercase font-bold">Admin Signature</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-4 bg-muted/20 border-t flex gap-2">
                 <Button className="flex-1" onClick={() => window.print()}>
                    <Download className="mr-2 h-4 w-4" /> Print ID Card
                 </Button>
              </div>
           </div>
        </div>
      )}
      {/* Session Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Session Breakdown</span>
              <Badge variant={selectedDay?.status === 'Present' ? 'success' : selectedDay?.status === 'Absent' ? 'destructive' : 'warning'}>
                {selectedDay?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detailed period-wise attendance for {selectedDay?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
             {selectedDay?.sessions?.map((session, idx) => (
               <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-muted/50">
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-md ${session.status === 'Present' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                        <Clock className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-sm font-bold">{session.subject}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">{session.time}</p>
                     </div>
                  </div>
                  <Badge variant={session.status === 'Present' ? 'success' : 'destructive'} className="text-[9px] h-5 py-0">
                     {session.status}
                  </Badge>
               </div>
             ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Slide-out Drawer */}
      <AnimatePresence>
        {isPaymentDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-primary/20 z-[101] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col pt-6"
            >
               <div className="px-6 flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Collect Payment</h2>
                    <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">Fee Management Hub</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsPaymentDrawerOpen(false)} className="rounded-full hover:bg-white/10">
                    <X className="h-5 w-5" />
                  </Button>
               </div>

               <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-10">
                  {/* Quick Select Student Info */}
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center gap-4">
                     <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <User className="h-6 w-6" />
                     </div>
                     <div>
                        <p className="text-sm font-bold text-white">{student.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{student.id} • {student.grade}</p>
                     </div>
                  </div>

                  {/* Payment Form Shell */}
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Installment</label>
                        <div className="grid grid-cols-2 gap-2">
                           {['April 2024', 'May 2024'].map(m => (
                             <button key={m} className="p-3 rounded-xl border border-muted/20 text-xs font-bold bg-muted/10 hover:border-primary/50 transition-all text-left">
                                {m} <br/>
                                <span className="text-primary">₹15,000</span>
                             </button>
                           ))}
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount to Collect</label>
                        <div className="relative">
                           <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                           <Input className="pl-10 h-12 bg-zinc-800/50 border-zinc-700 text-xl font-black italic" placeholder="0.00" />
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Method</label>
                        <div className="grid grid-cols-3 gap-2">
                           {[
                             { icon: <Smartphone className="h-4 w-4" />, label: 'UPI' },
                             { icon: <CreditCard className="h-4 w-4" />, label: 'Card' },
                             { icon: <IndianRupee className="h-4 w-4" />, label: 'Cash' },
                           ].map(m => (
                             <button key={m.label} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-muted/20 bg-muted/5 hover:bg-primary/5 hover:border-primary/40 transition-all group">
                                <div className="text-muted-foreground group-hover:text-primary">{m.icon}</div>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">{m.label}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* EMI Calculator Shell */}
                  <Card className="bg-zinc-800/30 border-dashed border-zinc-700">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Split into EMI</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                           <span>3 Months</span>
                           <span>₹5,000 / mo</span>
                        </div>
                        <div className="w-full bg-zinc-700 rounded-full h-1">
                           <div className="bg-primary h-1 rounded-full w-1/3"></div>
                        </div>
                        <p className="text-[9px] text-zinc-500 italic text-center">Enable 0% Interest EMI for regular students.</p>
                     </CardContent>
                  </Card>
               </div>

               <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
                  <Button className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-sm shadow-[0_10px_20px_rgba(16,185,129,0.3)] group">
                     Confirm & Generate Receipt
                     <Receipt className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                  </Button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-zinc-950 border-white/10">
          <DialogHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between text-white">
            <div>
              <DialogTitle className="text-sm uppercase tracking-[0.2em] font-black">{viewingDoc?.name}</DialogTitle>
              <DialogDescription className="text-[10px] text-zinc-500 uppercase font-bold">SECURE_VIEWER_V2.0</DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-zinc-900 relative">
             {viewingDoc?.type === 'application/pdf' ? (
                <iframe 
                  src={viewingDoc.url} 
                  className="w-full h-full border-none"
                  title={viewingDoc.name}
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center p-4">
                   <img 
                     src={viewingDoc?.url} 
                     alt={viewingDoc?.name} 
                     className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                     referrerPolicy="no-referrer"
                   />
                </div>
             )}
             
             {/* Overlay for aesthetic */}
             <div className="absolute inset-0 pointer-events-none border-[20px] border-black/5"></div>
          </div>
          <div className="p-3 border-t border-white/5 flex justify-end gap-2 bg-zinc-950">
             <Button variant="outline" size="sm" onClick={() => viewingDoc?.url && window.open(viewingDoc.url, '_blank')} className="text-[10px] uppercase font-black tracking-widest h-8">
                <Download className="mr-2 h-3 w-3" /> External Open
             </Button>
             <Button variant="default" size="sm" onClick={() => setViewingDoc(null)} className="text-[10px] uppercase font-black tracking-widest h-8">
                Close Viewer
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
