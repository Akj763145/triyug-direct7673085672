import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, FileText, Download, Trash2, Calendar, IndianRupee, Save, X, File, 
  BarChart3, Clock, MessageSquare, AlertCircle, CheckCircle2, User, Award, Eye,
  MapPin, Phone, Mail, QrCode, Send, Wallet, Receipt, History, Smartphone, MoreHorizontal,
  Printer, Share2, Plus, CreditCard, Camera, GraduationCap, UserCheck, ChevronLeft, ChevronRight, ChevronDown, ChevronUp
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
  Student, LedgerInvoice, LedgerTransaction, AttendanceRecord, 
  TeacherRemark, StudentAssignment 
} from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

const resizeImage = (file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        } else {
          resolve((event.target?.result as string) || '');
        }
      };
      img.onerror = () => resolve('');
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<LedgerInvoice[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  
  // New Feature States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [remarks, setRemarks] = useState<TeacherRemark[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [uploading, setUploading] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);

  // Attendance specific states
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);

  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Cheque' | 'Card'>('UPI');
  const [paymentRefId, setPaymentRefId] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  const handlePaymentSubmit = () => {
    if (!student || parseFloat(paymentAmount) <= 0) return;
    
    setIsProcessingPayment(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newTransaction: LedgerTransaction = {
        id: `TXN-MAN-${Math.floor(Math.random() * 10000)}`,
        invoiceId: selectedInvoiceId || undefined,
        studentId: student.id,
        date: new Date().toISOString().split('T')[0],
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod as any,
        referenceId: paymentRefId,
        status: 'Success'
      };

      setTransactions(prev => [...prev, newTransaction]);
      setIsProcessingPayment(false);
      setIsPaymentDrawerOpen(false);
      
      // Reset form
      setPaymentAmount('');
      setPaymentRefId('');
      setSelectedInvoiceId(null);
    }, 800);
  };

  // Document management states
  const [activeDocCategory, setActiveDocCategory] = useState<'All' | 'Academic' | 'Legal' | 'ID Proof'>('All');
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string; type: string } | null>(null);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const fetchAttendance = useCallback(async () => {
    if (!id || !supabase) return;
    const { data, error } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('student_id', id)
      .order('date', { ascending: false });

    if (!error && data) {
      setAttendance(data as AttendanceRecord[]);
    }
  }, [id, supabase]);

  const stats = useMemo(() => {
    if (!attendance.length) return { consecutiveAbsences: 0, punctualityScore: 0, trend: 0, dateRange: "" };
    
    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));
    
    // Consecutive absences
    let consecutiveCount = 0;
    let consecutiveDates: string[] = [];
    for (const record of sorted) {
      if (record.status === 'Absent') {
        consecutiveCount++;
        const d = new Date(record.date);
        consecutiveDates.push(d.toLocaleDateString('default', { month: 'short', day: 'numeric' }));
      } else if (record.status === 'Excused') {
        continue;
      } else {
        break;
      }
    }
    consecutiveDates.reverse();
    const dateRange = consecutiveDates.length > 1 
      ? `${consecutiveDates[0]}-${consecutiveDates[consecutiveDates.length-1].split(' ')[1]}` 
      : (consecutiveDates[0] || "");
    
    // Punctuality
    const currentMonth = currentViewDate.getMonth();
    const currentYear = currentViewDate.getFullYear();
    
    const currentMonthRecords = attendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthRecords = attendance.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });

    const calcPunctuality = (recs: AttendanceRecord[]) => {
        const total = recs.filter(r => r.status === 'Present' || r.status === 'Late').length;
        if (total === 0) return 0;
        const present = recs.filter(r => r.status === 'Present').length;
        return (present / total) * 100;
    };
    
    const score = calcPunctuality(currentMonthRecords);
    const lastScore = calcPunctuality(lastMonthRecords);
    
    return {
      consecutiveAbsences: consecutiveCount,
      dateRange,
      punctualityScore: Math.round(score),
      trend: Math.round(score - lastScore)
    };
  }, [attendance, currentViewDate]);

  const handleMarkAttendance = async (status: "Present" | "Absent" | "Late" | "Excused", subject?: string) => {
    if (!id || !supabase) return;
    const date = new Date().toISOString().split('T')[0];
    
    try {
      const { error } = await supabase
        .from('student_attendance')
        .upsert({
          student_id: id,
          date: date,
          status: status,
          subject: subject || 'General',
          marked_by: 'Admin',
          created_at: new Date().toISOString()
        }, { onConflict: 'student_id,date,subject' });

      if (error) throw error;
    } catch (err) {
      console.error("Error marking attendance:", err);
      alert("Failed to mark attendance.");
    }
  };

  const fetchStudentData = useCallback(async (silent = false) => {
    if (!id || !supabase) return;
    
    if (!silent) setLoading(true);
    try {
      // 1. First try to fetch from new student_profiles table
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
      
      let profileQuery = supabase.from('student_profiles').select('*');
      if (isUUID) {
        profileQuery = profileQuery.eq('id', id);
      } else {
        profileQuery = profileQuery.eq('student_id', id);
      }

      let { data: profileData, error: profileError } = await profileQuery.maybeSingle();

      if (profileData) {
        // Safe photo URL fetch: fallback to localStorage cached version if database value is empty or invalid blob
        const dbPhoto = profileData.photo_url;
        const localPhoto = localStorage.getItem(`student_photo_${id}`);
        const finalPhoto = (dbPhoto && !dbPhoto.startsWith('blob:')) ? dbPhoto : (localPhoto || undefined);

        // Map to expected Student format
        const mappedStudent: Student = {
          ...profileData,
          id: profileData.student_id || profileData.id,
          name: `${profileData.first_name} ${profileData.last_name}`,
          grade: profileData.grade,
          contact: profileData.parent1_contact || 'N/A',
          status: profileData.status === 'Active' ? 'Active' : 'Graduated', // Simple status mapping
          photo_url: finalPhoto,
        };
        setStudent(mappedStudent);
        setEditForm(mappedStudent);
      } else {
        // 2. Fallback to older `students` table
        let fallbackQuery = supabase.from('students').select('*');
        if (isUUID) {
          fallbackQuery = fallbackQuery.eq('id', id);
        } else {
          // If 'student_id' column exists it would be good to check, but id is text in students
          fallbackQuery = fallbackQuery.eq('id', id);
        }
        const { data: studentData, error: studentError } = await fallbackQuery.maybeSingle();
          
        if (studentError || !studentData) throw studentError || new Error("Student not found");

        const dbPhoto = studentData.photo_url;
        const localPhoto = localStorage.getItem(`student_photo_${id}`);
        const finalPhoto = (dbPhoto && !dbPhoto.startsWith('blob:')) ? dbPhoto : (localPhoto || undefined);

        const mappedOld: Student = {
          ...studentData,
          photo_url: finalPhoto
        };
        setStudent(mappedOld);
        setEditForm(mappedOld);
      }

      // Fetch invoices/ledger
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', id);
        
      if (!invoiceError && invoiceData) {
        // Ensure proper camelCase mapping if needed by UI
        const mappedInvoices = invoiceData.map(inv => ({
          ...inv,
          id: inv.id,
          studentId: inv.student_id,
          title: inv.category || 'Invoice',
          totalAmount: Number(inv.amount),
          dueDate: inv.due_date,
          status: inv.status || 'Upcoming',
          type: 'Primary'
        }));
        setInvoices(mappedInvoices);
      } else {
        setInvoices([]);
      }

      // Fetch transactions/payments
      // Supabase transactions table might not have student_id, so wrap in try-catch
      try {
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('student_id', id);

        if (!transactionError && transactionData) {
          // Map snake_case to camelCase for UI
          const mappedTxns = transactionData.map((t: any) => ({
            ...t,
            invoiceId: t.invoice_id,
            amount: Number(t.amount),
            paymentMethod: t.payment_method || 'SYSTEM',
            status: t.status || 'Success'
          }));
          setTransactions(mappedTxns);
        } else {
          setTransactions([]);
        }
      } catch (e) {
        setTransactions([]);
      }

      await fetchAttendance();

      // Clear any local hardcoded demo data
      setRemarks([]);
      setAssignments([]);

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
  }, [id, supabase, fetchAttendance]);

  useEffect(() => {
    fetchStudentData();

    // Realtime subscription for attendance
    if (!supabase || !id) return;
    const channel = supabase
      .channel(`attendance-${id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'student_attendance',
        filter: `student_id=eq.${id}`
      }, () => {
        fetchAttendance();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchStudentData, fetchAttendance, supabase]);

  const toggleStatus = async () => {
    if (!id || !supabase || !student) return;
    
    const newStatus = student.status === 'Active' ? 'Graduated' : 'Active';
    const confirmMsg = `Are you sure you want to mark this student as ${newStatus}?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Check which table
      const { data: profileCheck } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (profileCheck) {
        await supabase
          .from('student_profiles')
          .update({ status: newStatus })
          .eq('id', id);
      } else {
        await supabase
          .from('students')
          .update({ status: newStatus })
          .eq('id', id);
      }
      
      setStudent(prev => prev ? { ...prev, status: newStatus } : null);
      setEditForm(prev => prev ? { ...prev, status: newStatus } : {});
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Failed to update status.");
    }
  };

  const handleSaveProfile = async () => {
    if (!id || !supabase) return;
    
    try {
      // Check which table this student is from
      const { data: profileCheck } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();
        
      if (profileCheck) {
         const parts = (editForm.name || "").split(" ");
         const firstName = parts[0] || editForm.first_name || "";
         const lastName = parts.slice(1).join(" ") || editForm.last_name || "";
         const { error } = await supabase
          .from('student_profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            grade: editForm.grade,
            status: editForm.status === 'Graduated' ? 'Graduated' : 'Active', // Status map
            photo_url: editForm.photo_url || undefined,
            
            // Demographics & Core
            gender: editForm.gender || null,
            blood_group: editForm.blood_group || null,
            nationality: editForm.nationality || null,
            is_international: editForm.is_international || false,
            passport_number: editForm.passport_number || null,
            visa_status: editForm.visa_status || null,
            mother_tongue: editForm.mother_tongue || null,
            primary_language: editForm.primary_language || null,
            date_of_birth: editForm.date_of_birth || null,
            
            // Parent/Guardian 1
            parent1_name: editForm.parent1_name || null,
            parent1_relation: editForm.parent1_relation || null,
            parent1_occupation: editForm.parent1_occupation || null,
            parent1_income: editForm.parent1_income || null,
            parent1_email: editForm.parent1_email || null,
            parent1_contact: editForm.contact || editForm.parent1_contact || null,
            
            // Parent/Guardian 2
            parent2_name: editForm.parent2_name || null,
            parent2_relation: editForm.parent2_relation || null,
            parent2_occupation: editForm.parent2_occupation || null,
            parent2_income: editForm.parent2_income || null,
            parent2_email: editForm.parent2_email || null,
            parent2_contact: editForm.parent2_contact || null,

            // Address
            address_line1: editForm.address_line1 || null,
            city: editForm.city || null,
            state: editForm.state || null,
            zip_code: editForm.zip_code || null,

            // Academic History
            previous_school: editForm.previous_school || null,
            last_grade_completed: editForm.last_grade_completed || null,
            reason_for_leaving: editForm.reason_for_leaving || null,
            previous_gpa: editForm.previous_gpa || null,

            // Medical & Emergency
            allergies: editForm.allergies || null,
            medical_conditions: editForm.medical_conditions || null,
            daily_medications: editForm.daily_medications || null,
            emergency_contact_name: editForm.emergency_contact_name || null,
            emergency_contact_relation: editForm.emergency_contact_relation || null,
            emergency_contact_number: editForm.emergency_contact_number || null,
          })
          .eq('id', id);
          if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .update({
            name: editForm.name,
            contact: editForm.contact,
            grade: editForm.grade,
            status: editForm.status === 'Graduated' ? 'Graduated' : 'Active',
          })
          .eq('id', id);
        if (error) throw error;
      }
        
      setStudent({ ...student, ...editForm } as Student);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    }
  };

  const handleProfilePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !supabase) return;

    setUploading(true);
    try {
      // 1. Convert and compress image to a base64 JPEG format for offline cache and direct DB storage support
      const base64Url = await resizeImage(file);
      
      // Store in localStorage immediately as extremely reliable backup & local cache
      localStorage.setItem(`student_photo_${id}`, base64Url);

      // 2. Attempt real file upload to Supabase Storage bucket
      const fileName = `photo_${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;
      
      let finalPhotoUrl = base64Url;

      const { data, error: storageError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (!storageError) {
        // If storage uploaded successfully, retrieve the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('student-documents')
          .getPublicUrl(filePath);
        if (publicUrl) {
          finalPhotoUrl = publicUrl;
        }
      } else {
        console.warn("Real photo upload to storage bucket failed, falling back to base64 DB column storage.", storageError);
      }
      
      // 3. Update the database table (student_profiles or older students fallback) with final photo (publicUrl or base64)
      const { data: profileCheck } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (profileCheck) {
        await supabase
          .from('student_profiles')
          .update({ photo_url: finalPhotoUrl })
          .eq('id', id);
      } else {
        await supabase
          .from('students')
          .update({ photo_url: finalPhotoUrl })
          .eq('id', id);
      }

      setStudent(prev => prev ? { ...prev, photo_url: finalPhotoUrl } : null);
      setEditForm(prev => prev ? { ...prev, photo_url: finalPhotoUrl } : {});
      alert("Profile photo updated successfully!");
    } catch (err: any) {
      console.error("Error uploading profile photo:", err);
      alert("Failed to update profile: " + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
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
        console.error("Storage upload failed:", error);
        alert(`Failed to upload document: ${error.message}. Please verify that the 'student_documents' storage bucket exists.`);
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

  const today = new Date();
  
  const computedInvoices = invoices.map(inv => {
    const amountPaid = transactions
      .filter(t => (t.invoiceId === inv.id || t.invoice_id === inv.id) && (t.status === 'Success' || t.status === 'success'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    let computedStatus = inv.status;
    const isPastDue = new Date(inv.dueDate).getTime() < today.getTime();
    
    if (inv.status === 'Paid' || amountPaid >= inv.totalAmount) {
      computedStatus = 'Paid';
    } else if (inv.status === 'Partial' || amountPaid > 0) {
      computedStatus = 'Partial';
    } else if (isPastDue) {
      computedStatus = 'Overdue';
    } else {
      computedStatus = 'Upcoming';
    }

    return {
      ...inv,
      computedStatus,
      amountPaid,
      amountDue: inv.totalAmount - amountPaid
    };
  });

  const totalInvoiceAmount = computedInvoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPaid = transactions.filter(t => t.status === 'Success').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDue = totalInvoiceAmount - totalPaid;
  const nextDueDate = computedInvoices.filter(i => (i.computedStatus === 'Upcoming' || i.computedStatus === 'Overdue' || i.computedStatus === 'Partial')).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate || 'None';

  const attendanceRate = (attendance.filter(a => a.status === 'Present').length / attendance.length) * 100;
  const submissionRate = (assignments.filter(a => a.status !== 'Pending').length / assignments.length) * 100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/students')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
        </Button>
        <div className="flex gap-2">
           <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleStatus}
            className={student.status === 'Active' ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-blue-200 text-blue-600 hover:bg-blue-50"}
           >
            {student.status === 'Active' ? (
              <>
                <GraduationCap className="mr-2 h-4 w-4" /> Mark as Graduated
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" /> Re-activate Student
              </>
            )}
           </Button>
           <Button variant="outline" size="sm" onClick={() => setShowIDCard(true)}>
            <Award className="mr-2 h-4 w-4 text-primary" /> Generate ID Card
           </Button>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b">
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 group">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner overflow-hidden">
              {student.photo_url ? (
                <img 
                  src={student.photo_url} 
                  alt={student.name} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="h-12 w-12" />
              )}
            </div>
            {isEditing && (
              <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5" />
                <span className="text-[9px] mt-1 font-bold">Change</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleProfilePhotoUpload} 
                />
              </label>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">{student.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-mono text-sm">
              <span className="bg-muted/50 px-2 py-0.5 rounded">{student.student_id || student.id.slice(0, 8)}</span>
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
          {[
            { id: 'overview', label: 'Student Profile' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'ledger', label: 'Ledger' },
            { id: 'documents', label: 'Documents' },
            { id: 'remarks', label: 'Remarks' }
          ].map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 pb-3 pt-3 text-sm font-semibold uppercase tracking-wider transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab: Student Profile (Overview) */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="bg-card border-muted/20 md:col-span-3">
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
                                    <div className="space-y-6 mt-4">
                    {/* General & Enrollment */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student ID (Read Only)</label>
                        <Input value={student.student_id || student.id.slice(0, 8)} readOnly className="bg-muted/10 border-none font-medium text-muted-foreground font-mono" />
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
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                        {isEditing ? (
                          <select 
                            value={editForm.status || "Active"}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                            className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
                          >
                            <option value="Active">Active</option>
                            <option value="Graduated">Graduated</option>
                          </select>
                        ) : (
                          <Input value={editForm.status || student.status || "Active"} readOnly className="bg-muted/10 border-none font-medium pointer-events-none" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date of Birth</label>
                        <Input 
                          type="date"
                          value={editForm.date_of_birth || ""} 
                          onChange={(e) => setEditForm({...editForm, date_of_birth: e.target.value})}
                          readOnly={!isEditing} 
                          className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gender</label>
                        <Input 
                          value={editForm.gender || ""} 
                          onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                          readOnly={!isEditing} 
                          placeholder="e.g. Male, Female, Other"
                          className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blood Group</label>
                        <Input 
                          value={editForm.blood_group || ""} 
                          onChange={(e) => setEditForm({...editForm, blood_group: e.target.value})}
                          readOnly={!isEditing} 
                          placeholder="e.g. O+, A-"
                          className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                        />
                      </div>
                    </div>

                    {/* Personal & Demographics */}
                    <div className="border-t pt-4">
                      <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">Nationality & Identity</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nationality</label>
                          <Input 
                            value={editForm.nationality || ""} 
                            onChange={(e) => setEditForm({...editForm, nationality: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. Indian"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Passport Number</label>
                          <Input 
                            value={editForm.passport_number || ""} 
                            onChange={(e) => setEditForm({...editForm, passport_number: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. Z9999999"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Language</label>
                          <Input 
                            value={editForm.primary_language || ""} 
                            onChange={(e) => setEditForm({...editForm, primary_language: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. English"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mother Tongue</label>
                          <Input 
                            value={editForm.mother_tongue || ""} 
                            onChange={(e) => setEditForm({...editForm, mother_tongue: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. Hindi"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Parent & Guardian 1 */}
                    <div className="border-t pt-4">
                      <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">Primary Parent / Guardian</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardian Name</label>
                          <Input 
                            value={editForm.parent1_name || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_name: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Relationship</label>
                          <Input 
                            value={editForm.parent1_relation || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_relation: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. Father, Mother"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Occupation</label>
                          <Input 
                            value={editForm.parent1_occupation || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_occupation: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annual Income</label>
                          <Input 
                            value={editForm.parent1_income || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_income: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. ₹6,000,000"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardian Email</label>
                          <Input 
                            type="email"
                            value={editForm.parent1_email || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_email: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Guardian Contact</label>
                          <Input 
                            value={editForm.parent1_contact || ""} 
                            onChange={(e) => setEditForm({...editForm, parent1_contact: e.target.value, contact: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none font-mono" : "bg-muted/30 font-mono"} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address Detail */}
                    <div className="border-t pt-4">
                      <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">Residential Address</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2 sm:col-span-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address Line 1</label>
                          <Input 
                            value={editForm.address_line1 || ""} 
                            onChange={(e) => setEditForm({...editForm, address_line1: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</label>
                          <Input 
                            value={editForm.city || ""} 
                            onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State</label>
                          <Input 
                            value={editForm.state || ""} 
                            onChange={(e) => setEditForm({...editForm, state: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zip / Postal Code</label>
                          <Input 
                            value={editForm.zip_code || ""} 
                            onChange={(e) => setEditForm({...editForm, zip_code: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none font-mono" : "bg-muted/30 font-mono"} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Medical & Emergency contact */}
                    <div className="border-t pt-4">
                      <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">Medical Info & Emergency Contacts</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Allergies</label>
                          <Input 
                            value={editForm.allergies || ""} 
                            onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="None"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medical Conditions</label>
                          <Input 
                            value={editForm.medical_conditions || ""} 
                            onChange={(e) => setEditForm({...editForm, medical_conditions: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="None"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact Name</label>
                          <Input 
                            value={editForm.emergency_contact_name || ""} 
                            onChange={(e) => setEditForm({...editForm, emergency_contact_name: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact Relation</label>
                          <Input 
                            value={editForm.emergency_contact_relation || ""} 
                            onChange={(e) => setEditForm({...editForm, emergency_contact_relation: e.target.value})}
                            readOnly={!isEditing} 
                            placeholder="e.g. Uncle"
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none" : "bg-muted/30"} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Contact Number</label>
                          <Input 
                            value={editForm.emergency_contact_number || ""} 
                            onChange={(e) => setEditForm({...editForm, emergency_contact_number: e.target.value})}
                            readOnly={!isEditing} 
                            className={!isEditing ? "bg-muted/10 border-none font-medium pointer-events-none font-mono" : "bg-muted/30 font-mono"} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>                </CardContent>
             </Card>
          </div>
        </TabsContent>

        {/* Tab: Attendance */}
        <TabsContent value="attendance" className="space-y-6 mt-0">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-1 bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <CardTitle className="text-sm">Real-time Attendance</CardTitle>
                  </div>
                  <CardDescription className="text-[10px]">Changes sync instantly to the cloud</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    {[
                      { s: 'Present' as const, i: CheckCircle2, colors: 'border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600' },
                      { s: 'Absent' as const, i: AlertCircle, colors: 'border-destructive/30 hover:bg-destructive/10 text-destructive' },
                      { s: 'Late' as const, i: Clock, colors: 'border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-600' },
                      { s: 'Excused' as const, i: FileText, colors: 'border-blue-500/30 hover:bg-blue-500/10 text-blue-600' },
                    ].map((btn) => (
                      <Button 
                        key={btn.s}
                        onClick={() => handleMarkAttendance(btn.s)}
                        variant="outline" 
                        size="sm"
                        className={`justify-start gap-2 capitalize ${btn.colors}`}
                      >
                        <btn.i className="h-3.5 w-3.5" /> {btn.s}
                      </Button>
                    ))}
                  </div>
                  <div className="pt-2">
                     <p className="text-[9px] text-muted-foreground uppercase font-black mb-1.5 tracking-tighter">Status Log</p>
                     <div className="text-[10px] space-y-1 font-mono max-h-[100px] overflow-y-auto pr-2">
                        {attendance.slice(0, 3).map((a, i) => (
                          <div key={i} className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/50">
                            <span className="opacity-70">{a.date.split('-').slice(1).join('/')}</span>
                            <span className={`font-bold ${a.status === 'Present' ? 'text-emerald-500' : 'text-primary'}`}>{a.status}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-3">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                   <div>
                      <div className="flex items-center gap-3">
                        <CardTitle>Presence History</CardTitle>
                        <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/50">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={() => {
                              const d = new Date(currentViewDate);
                              d.setMonth(d.getMonth() - 1);
                              setCurrentViewDate(d);
                            }}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="px-3 min-w-[120px] text-center">
                            <span className="text-xs font-bold uppercase tracking-widest">
                              {currentViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => {
                              const d = new Date(currentViewDate);
                              d.setMonth(d.getMonth() + 1);
                              setCurrentViewDate(d);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>Daily engagement tracked in the cloud</CardDescription>
                   </div>
                   <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-tighter">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Present</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive"></div> Absent</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Late</div>
                   </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const year = currentViewDate.getFullYear();
                        const month = currentViewDate.getMonth();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

                        return Array.from({ length: daysInMonth }).map((_, idx) => {
                          const dayNum = idx + 1;
                          const dateStr = `${monthStr}-${String(dayNum).padStart(2, '0')}`;
                          const dayRecord = attendance.find(a => a.date === dateStr);
                          const status = dayRecord?.status;

                          return (
                            <button 
                              key={idx} 
                              onClick={() => {
                                const dayRecords = attendance.filter(a => a.date === dateStr);
                                if (dayRecords.length > 0) {
                                  setSelectedDay({
                                    ...dayRecords[0],
                                    sessions: dayRecords.map(r => ({
                                      subject: r.subject || 'General',
                                      status: r.status as any,
                                      time: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit', 
                                        second: '2-digit',
                                        hour12: true 
                                      }) : 'N/A'
                                    }))
                                  });
                                }
                              }}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center border border-muted/20 relative group transition-all hover:scale-110 active:scale-95
                                ${status === 'Present' ? 'bg-emerald-500/10 border-emerald-500/30' : 
                                  status === 'Absent' ? 'bg-destructive/10 border-destructive/30' : 
                                  status === 'Late' ? 'bg-yellow-500/10 border-yellow-500/30' : 
                                  status === 'Excused' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-muted/5'}`}
                            >
                               <span className="text-[10px] font-mono opacity-50">{dayNum}</span>
                               {status && (
                                 <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                   status === 'Present' ? 'bg-emerald-500' : 
                                   status === 'Absent' ? 'bg-destructive' : 
                                   status === 'Late' ? 'bg-yellow-500' : 'bg-blue-500'
                                 }`}></div>
                               )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                   <CardTitle className="text-sm">Status Distribution</CardTitle>
                   <CardDescription className="text-[10px]">Monthly performance for {currentViewDate.toLocaleString('default', { month: 'long' })}</CardDescription>
                </CardHeader>
                <CardContent className="h-[200px] p-0 pr-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                         const year = currentViewDate.getFullYear();
                         const month = currentViewDate.getMonth();
                         const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
                         const monthlyRecords = attendance.filter(a => a.date.startsWith(monthStr));
                         
                         return [
                           { name: 'Present', value: monthlyRecords.filter(r => r.status === 'Present').length },
                           { name: 'Absent', value: monthlyRecords.filter(r => r.status === 'Absent').length },
                           { name: 'Late', value: monthlyRecords.filter(r => r.status === 'Late').length },
                           { name: 'Excused', value: monthlyRecords.filter(r => r.status === 'Excused').length }
                         ];
                      })()}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(var(--primary), 0.1)' }}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))', 
                            fontSize: '10px',
                            borderRadius: '6px'
                          }}
                        />
                        <Bar dataKey="value">
                           {
                             [
                               { name: 'Present', color: '#10b981' },
                               { name: 'Absent', color: '#ef4444' },
                               { name: 'Late', color: '#f59e0b' },
                               { name: 'Excused', color: '#3b82f6' }
                             ].map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))
                           }
                        </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                </CardContent>
              </Card>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={stats.consecutiveAbsences >= 3 ? "bg-destructive/5 border-destructive/20 relative overflow-hidden" : "bg-emerald-50/5 border-emerald-200/50 relative overflow-hidden"}>
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
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.consecutiveAbsences >= 3 ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                       {stats.consecutiveAbsences >= 3 ? <AlertCircle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
                    </div>
                    <div>
                       <h3 className={`font-bold ${stats.consecutiveAbsences >= 3 ? 'text-destructive underline underline-offset-4 decoration-destructive/30' : 'text-emerald-700'}`}>
                           {stats.consecutiveAbsences >= 3 ? 'Action Required: Absence Alert' : 'Attendance Standing: Excellent'}
                        </h3>
                       <p className="text-sm text-destructive/80 mr-24">{stats.consecutiveAbsences >= 3 ? `${stats.consecutiveAbsences} consecutive absences (${stats.dateRange}) flagged. Intervention needed.` : "Consistent presence maintained. No recent flags."}</p>
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
                       <p className="text-sm text-primary/80">{stats.punctualityScore}% of sessions started on time. Improving from last month.</p>
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
                            ${rem.category === 'Academic' ? 'bg-emerald-500 text-foreground' : 'bg-blue-500 text-foreground'}`}>
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
               className="bg-cyan-500 hover:bg-cyan-600 text-foreground shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse"
               onClick={() => setIsPaymentDrawerOpen(true)}
             >
                <Plus className="mr-2 h-4 w-4" /> Collect Payment
             </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. TOTAL BATCH AMOUNT */}
            <Card className="border-muted/20 bg-card/40 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 bg-primary h-full"></div>
               <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-3 w-3" /> TOTAL BATCH AMOUNT
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                  {/* Batch Details Badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-muted/40 border border-muted/20 mt-1">
                     <GraduationCap className="h-3 w-3 text-muted-foreground" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                        BATCH: {student?.grade || 'UNASSIGNED'}
                     </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                     <div>
                        <div className="text-4xl font-black italic tracking-tighter text-foreground decoration-primary/30 underline underline-offset-8 decoration-2">₹{(totalPaid + totalDue).toLocaleString()}</div>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-3 opacity-70">Total Batch Amount</p>
                     </div>
                     <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.15)] group-hover:scale-110 transition-transform duration-500">
                        <IndianRupee className="h-8 w-8" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors">
                        <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-1">Total Paid</p>
                        <p className="text-lg font-black text-emerald-700">₹{totalPaid.toLocaleString()}</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 group-hover:bg-red-500/10 transition-colors">
                        <p className="text-[9px] font-black uppercase text-red-600 tracking-widest mb-1">Total Due</p>
                        <p className="text-lg font-black text-red-700">₹{totalDue.toLocaleString()}</p>
                     </div>
                  </div>

                  <div className="relative pt-2">
                     <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-widest">
                        <span>Payment Integrity</span>
                        <span className="text-primary font-mono">{Math.round((totalPaid / (totalPaid * 1.5 || 1)) * 100)}%</span>
                     </div>
                     <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden border border-muted/20">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${(totalPaid / (totalPaid + totalDue)) * 100}%` }}
                           className="bg-gradient-to-r from-primary to-cyan-400 h-2 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.4)]"
                        />
                     </div>
                     <p className="text-[8px] text-muted-foreground mt-3 italic font-serif">Calculation based on active enrollment ledger assets.</p>
                  </div>
               </CardContent>
            </Card>

            {/* 2. INSTALLMENTS SECTION */}
            <Card className="border-muted/20 bg-card/40 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 bg-cyan-500 h-full"></div>
               <CardHeader 
                 className="pb-2 cursor-pointer hover:bg-muted/10 transition-colors"
                 onClick={() => setShowInstallments(!showInstallments)}
               >
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                      <Clock className="h-3 w-3" /> INSTALLMENTS SECTION
                    </CardTitle>
                    {showInstallments ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
               </CardHeader>
               <CardContent className="pt-4">
                  {!showInstallments ? (
                     <div 
                        className="text-center py-8 cursor-pointer group/summary" 
                        onClick={() => setShowInstallments(true)}
                     >
                        <div className="text-3xl font-black text-foreground mb-1 group-hover/summary:text-cyan-500 transition-colors">{computedInvoices.length}</div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Total Installments</p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                           <div className="px-4 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-center min-w-[75px] shadow-sm">
                              <div className="text-lg font-black text-emerald-600 leading-none">{computedInvoices.filter(i => i.computedStatus === 'Paid').length}</div>
                              <div className="text-[8px] uppercase font-black tracking-widest text-emerald-600/60 mt-1">Paid</div>
                           </div>
                           <div className="px-4 py-2 rounded-xl bg-red-500/5 border border-red-500/10 text-center min-w-[75px] shadow-sm">
                              <div className="text-lg font-black text-red-600 leading-none">{computedInvoices.filter(i => i.computedStatus === 'Overdue').length}</div>
                              <div className="text-[8px] uppercase font-black tracking-widest text-red-600/60 mt-1">Overdue</div>
                           </div>
                           <div className="px-4 py-2 rounded-xl bg-slate-500/5 border border-slate-500/10 text-center min-w-[75px] shadow-sm">
                              <div className="text-lg font-black text-slate-600 leading-none">{computedInvoices.filter(i => i.computedStatus === 'Upcoming' || i.computedStatus === 'Partial').length}</div>
                              <div className="text-[8px] uppercase font-black tracking-widest text-slate-600/60 mt-1">Pending</div>
                           </div>
                        </div>
                     </div>
                  ) : (
                     <div className="max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-4 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-muted/30">
                          {computedInvoices.length === 0 ? (
                             <div className="text-center py-6 text-muted-foreground text-[10px] uppercase font-bold tracking-widest animate-pulse">No Installments Found</div>
                          ) : (
                            computedInvoices.map((inst, i) => (
                            <div key={inst.id} className="flex items-start gap-4 group/item pl-1">
                               <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-all group-hover/item:scale-110 ${inst.computedStatus === 'Paid' ? 'bg-background border-emerald-500 text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : inst.computedStatus === 'Overdue' ? 'bg-background border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : inst.computedStatus === 'Partial' ? 'bg-background border-yellow-500 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'bg-background border-muted text-muted-foreground'}`}>
                                  {inst.computedStatus === 'Paid' ? <CheckCircle2 className="h-3 w-3" /> : (inst.computedStatus === 'Overdue' || inst.computedStatus === 'Partial') ? <AlertCircle className="h-3 w-3" /> : <div className="h-1.5 w-1.5 bg-current rounded-full" />}
                               </div>
                               <div className="flex-1 pb-5 border-b border-muted/10 last:border-0 last:pb-0">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-xs font-black tracking-widest text-foreground group-hover/item:text-primary transition-colors">{inst.title}</span>
                                     <div className="text-right">
                                         <div className="text-sm font-black font-mono">₹{inst.totalAmount.toLocaleString()}</div>
                                         {inst.computedStatus === 'Partial' && (
                                            <div className="text-[9px] font-black text-red-500 font-mono">Due: ₹{(inst.amountDue || 0).toLocaleString()}</div>
                                         )}
                                      </div>
                                  </div>
                                  
                                  {inst.computedStatus === 'Partial' && (
                                     <div className="w-full bg-muted/40 rounded-full h-1 my-2 overflow-hidden">
                                        <div className="bg-yellow-500 h-1 rounded-full" style={{ width: `${(inst.amountPaid! / inst.totalAmount) * 100}%` }}></div>
                                     </div>
                                  )}

                                  <div className="flex justify-between items-center">
                                     <div className="flex items-center gap-2">
                                        <span className={`text-[9px] uppercase font-black tracking-tighter px-1.5 py-0.5 rounded ${inst.computedStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : inst.computedStatus === 'Overdue' ? 'bg-red-500/10 text-red-500' : inst.computedStatus === 'Partial' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-muted/50 text-muted-foreground'}`}>{inst.computedStatus}</span>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${inst.type === 'Incidental' ? 'text-indigo-400' : 'opacity-40'}`}>{inst.type}</span>
                                     </div>
                                     <span className="text-[9px] opacity-60 font-mono italic">Due {new Date(inst.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                  </div>
                               </div>
                            </div>
                          )))}
                        </div>
                     </div>
                  )}
               </CardContent>
            </Card>

          </div>

          {/* 3. HISTORY SECTION */}
            <Card className="border-muted/20 bg-card/40 backdrop-blur-md relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 bg-indigo-500 h-full"></div>
               <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <History className="h-3 w-3" /> HISTORY SECTION
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                     <Download className="h-4 w-4" />
                  </Button>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="max-h-[420px] overflow-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="bg-muted/10 sticky top-0 z-20 backdrop-blur-md">
                        <TableRow className="hover:bg-transparent border-muted/20">
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-4">Timeline</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-4">Amount</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 px-4 text-right">State</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-mono italic text-[10px] tracking-[0.4em] uppercase animate-pulse">Drive_Is_Empty</TableCell>
                           </TableRow>
                        ) : (
                          transactions.map((txn) => (
                            <TableRow key={txn.id} className="group/row hover:bg-primary/5 border-muted/5 transition-colors">
                              <TableCell className="px-4 py-4">
                                <div className="text-[10px] font-black text-foreground group-hover/row:text-primary transition-colors tracking-widest">{txn.date}</div>
                                <div className="text-[8px] text-muted-foreground font-mono mt-0.5">{txn.id}</div>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <div className="text-[11px] font-black text-foreground">₹{txn.amount.toLocaleString()}</div>
                                <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">{txn.paymentMethod || 'SYSTEM'}</div>
                              </TableCell>
                              <TableCell className="text-right px-4 py-4">
                                <Badge variant={txn.status === "Success" ? "success" : "destructive"} className="text-[9px] h-5 px-2 font-black uppercase tracking-tighter border-none shadow-sm">
                                  {txn.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
               </CardContent>
            </Card>
        </TabsContent>

        {/* Tab: Document Vault */}
        <TabsContent value="documents" className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                 <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-primary" /> Document Repository
                 </h2>
                 <p className="text-xs text-muted-foreground">Securely manage student records, certificates, and ID proofs</p>
              </div>
              <div className="flex bg-muted/20 p-1 rounded-lg border border-muted/10">
                 {['All', 'Academic', 'Legal', 'ID Proof'].map(cat => (
                   <button 
                     key={cat} 
                     onClick={() => setActiveDocCategory(cat as any)}
                     className={`text-[10px] px-3 py-1.5 rounded-md uppercase font-black tracking-widest transition-all ${activeDocCategory === cat || (cat === 'All' && !activeDocCategory) ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
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
                       <p className="font-bold text-sm mb-1 text-foreground">{uploading ? 'Processing...' : 'Drop File Here'}</p>
                       <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Max Size: 5MB</p>
                       
                       {uploading && (
                         <div className="absolute inset-0 bg-card/80 flex flex-col items-center justify-center p-4">
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

                    <Card className="bg-muted/50 border-border overflow-hidden">
                       <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                             <span>Storage Used</span>
                             <span className="text-foreground">{(documents.length * 0.4).toFixed(1)} / 50 MB</span>
                          </div>
                          <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${Math.min(100, documents.length * 2)}%` }}
                               className="bg-cyan-500 h-1.5 rounded-full"
                             />
                          </div>
                          <div className="pt-2">
                             <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">256-bit Encryption Verified</span>
                             </div>
                             <p className="text-[9px] text-muted-foreground italic leading-relaxed">System state: HEALTHY. Files are encrypted via AES-256 before cloud commit.</p>
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
                            className="group relative bg-secondary/30 border border-muted/10 hover:border-primary/40 rounded-2xl p-4 transition-all hover:bg-muted/80"
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
                                      <Eye className="h-4 w-4" />
                                   </Button>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     className="h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground" 
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
                                <h4 className="font-bold text-[11px] truncate pr-2 text-foreground group-hover:text-primary transition-colors">{originalName}</h4>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] text-muted-foreground uppercase font-mono opacity-60">{(doc.metadata?.size / 1024).toFixed(1) || 0} KB</span>
                                   <div className="h-1 w-1 rounded-full bg-muted opacity-40"></div>
                                   <span className={`text-[9px] uppercase font-black tracking-tighter opacity-70 ${category === 'Academic' ? 'text-blue-400' : category === 'Legal' ? 'text-purple-400' : 'text-emerald-600'}`}>{category}</span>
                                </div>
                             </div>
                             
                             <div className="mt-4 pt-3 border-t border-muted/10 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                   <span className="text-[9px] font-black uppercase text-emerald-600/80 tracking-widest">Verified</span>
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
              
              <div className="bg-primary/95 p-6 text-foreground flex justify-between items-center relative overflow-hidden">
                 <div className="absolute top-0 right-0 h-full w-32 bg-white/5 skew-x-[-20deg] translate-x-12"></div>
                 <div className="relative z-10">
                    <h2 className="text-xl font-black italic tracking-tighter uppercase">TRIYUGA CLASSES</h2>
                    <p className="text-[10px] opacity-80 uppercase tracking-widest">Achieving Excellence Together</p>
                 </div>
                 <Badge variant="outline" className="border-border text-foreground relative z-10">2024-25</Badge>
              </div>

              <div className="p-8 flex flex-col items-center">
                 <div className="h-32 w-32 rounded-xl bg-muted flex items-center justify-center mb-6 border-4 border-background shadow-lg overflow-hidden relative">
                    {student.photo_url ? (
                        <img 
                           src={student.photo_url} 
                           alt={student.name} 
                           className="h-full w-full object-cover"
                           referrerPolicy="no-referrer"
                        />
                     ) : (
                        <User className="h-16 w-16 text-muted-foreground" />
                     )}
                    <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-foreground py-1 flex items-center justify-center uppercase font-bold tracking-tighter">PHOTO ID</div>
                 </div>
                 
                 <div className="text-center space-y-1 mb-8">
                    <h3 className="text-2xl font-bold uppercase tracking-tight">{student.name}</h3>
                    <p className="text-sm font-semibold text-primary uppercase tracking-widest border-y border-primary/20 py-1">{student.grade}</p>
                 </div>

                 <div className="w-full space-y-4 text-sm mb-8">
                    <div className="flex justify-between border-b border-muted py-1">
                       <span className="text-muted-foreground text-xs uppercase font-bold">Student ID</span>
                       <span className="font-mono text-xs">{student.student_id || student.id.slice(0, 8)}</span>
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
                       <div className="bg-white p-1 rounded-sm shadow-sm">
                          <QRCodeSVG 
                             value={`ATTENDANCE_SCAN:${id || student.id}`}
                             size={64}
                             level="H"
                             className="rounded-sm"
                          />
                       </div>
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
                     <div className={`p-2 rounded-md ${session.status === 'Present' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                        <Clock className="w-4 h-4" />
                     </div>
                     <div>
                        <p className="text-sm font-bold">{session.subject}</p>
                        <p className="text-[10px] text-primary/70 font-mono tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 inline-block mt-1 uppercase">
                           {session.time}
                        </p>
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
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-primary/20 z-[101] shadow-2xl flex flex-col pt-6"
            >
               <div className="px-6 flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-xl font-black text-foreground italic tracking-tighter uppercase">Collect Payment</h2>
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
                        <p className="text-sm font-bold text-foreground">{student.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-mono">{student.id} • {student.grade}</p>
                     </div>
                  </div>

                  {/* Payment Form Shell */}
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Installment</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                           {computedInvoices.filter(i => i.computedStatus !== 'Paid').map(inv => (
                             <button 
                                key={inv.id} 
                                onClick={() => {
                                   setSelectedInvoiceId(inv.id);
                                   setPaymentAmount(inv.amountDue.toString());
                                }}
                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${selectedInvoiceId === inv.id ? 'border-primary/50 bg-primary/10' : 'border-muted/20 bg-muted/10 flex-col hover:border-primary/30'}`}
                             >
                                <div className="flex justify-between items-center w-full">
                                   <span className="truncate pr-2">{inv.title}</span>
                                   <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${inv.computedStatus === 'Overdue' ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}`}>{inv.computedStatus}</span>
                                </div>
                                <div className="text-primary mt-1">₹{inv.amountDue.toLocaleString()}</div>
                             </button>
                           ))}
                           {computedInvoices.filter(i => i.computedStatus !== 'Paid').length === 0 && (
                              <div className="col-span-2 text-center py-4 text-xs font-mono text-muted-foreground">No pending installments.</div>
                           )}
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount to Collect</label>
                              <div className="relative">
                                 <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                                 <Input 
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    type="number"
                                    className="pl-10 h-10 bg-muted border-border text-lg font-black italic" 
                                    placeholder="0" 
                                 />
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Add Late Fee / Discount</label>
                              <div className="relative">
                                 <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <Input 
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    className="pl-10 h-10 bg-muted border-border text-sm font-black italic" 
                                    placeholder="+/- 0" 
                                 />
                              </div>
                              <p className="text-[8px] text-muted-foreground italic">Use '-' for scholarship/discount.</p>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payment Method</label>
                           <div className="grid grid-cols-4 gap-2">
                              {[
                                { icon: <Smartphone className="h-4 w-4" />, label: 'UPI' as const },
                                { icon: <CreditCard className="h-4 w-4" />, label: 'Card' as const },
                                { icon: <IndianRupee className="h-4 w-4" />, label: 'Cash' as const },
                                { icon: <FileText className="h-4 w-4" />, label: 'Cheque' as const },
                              ].map(m => (
                                <button 
                                  key={m.label} 
                                  type="button"
                                  onClick={() => setPaymentMethod(m.label)}
                                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all group outline-none ${paymentMethod === m.label ? 'border-primary/50 bg-primary/10' : 'border-muted/20 bg-muted/5 hover:bg-primary/5 hover:border-primary/40'}`}
                                >
                                   <div className={`${paymentMethod === m.label ? 'text-primary' : 'text-muted-foreground group-hover:text-primary transition-colors'}`}>{m.icon}</div>
                                   <span className={`text-[9px] font-black uppercase tracking-tighter ${paymentMethod === m.label ? 'text-primary' : 'group-hover:text-primary'}`}>{m.label}</span>
                                </button>
                              ))}
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              Reference ID / Txn Hash {paymentMethod !== 'Cash' && <span className="text-red-500">*</span>}
                           </label>
                           <Input 
                              value={paymentRefId}
                              onChange={(e) => setPaymentRefId(e.target.value)}
                              className="h-10 bg-card border-muted/40 text-xs font-mono placeholder:text-muted-foreground/30 focus-visible:ring-primary/20" 
                              placeholder="e.g. UPI-REF-909281 / CHQ-00129" 
                           />
                        </div>

                        <Button 
                          type="button"
                          onClick={async () => {
                             if (!selectedInvoiceId || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
                             if (!paymentRefId && (paymentMethod === 'UPI' || paymentMethod === 'Cheque' || paymentMethod === 'Card')) {
                                alert('Reference ID is required for digital/cheque payments.');
                                return;
                             }
                             
                             setIsProcessingPayment(true);
                             try {
                               const timestamp = new Date().toISOString();
                               const amount = Number(paymentAmount);
                               const adjustment = Number(adjustmentAmount) || 0;
                               
                               // Secure Backend Logic: Use Supabase database RPC only
                               if (supabase && id) {
                                 const { data, error } = await supabase.rpc('process_installment_payment_v4', {
                                    p_invoice_id: selectedInvoiceId,
                                    p_student_id: student?.id,
                                    p_amount: amount,
                                    p_payment_method: paymentMethod,
                                    p_reference_id: paymentRefId || `MAN-${Date.now()}`,
                                    p_adjustment_amount: adjustment,
                                    p_adjustment_title: adjustment > 0 ? 'Late Fee' : 'Discount/Scholarship'
                                 });
                                 
                                 if (error) {
                                   console.error("RPC Error:", error);
                                   alert(`Payment processing failed: ${error.message}`);
                                 } else {
                                   // Successfully processed securely, refetch data
                                   await fetchStudentData(true);
                                   setIsPaymentDrawerOpen(false);
                                   setPaymentAmount('');
                                   setPaymentRefId('');
                                   setAdjustmentAmount('');
                                   setSelectedInvoiceId(null);
                                 }
                               } else {
                                 alert("Database connection is not configured or Student ID is missing.");
                               }
                               
                             } catch (e) {
                               console.error("Payment processing failed:", e);
                               alert("Failed to process payment");
                             } finally {
                               setIsProcessingPayment(false);
                             }
                          }}
                          disabled={!selectedInvoiceId || !paymentAmount || isProcessingPayment || (paymentMethod !== 'Cash' && !paymentRefId.trim())}
                          className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.2)] mt-8"
                        >
                          {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                        </Button>
                     </div>
                  </div>

                  {/* EMI Calculator Shell */}
                  <Card className="bg-muted/30 border-dashed border-border">
                     <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground">Split into EMI</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                           <span>3 Months</span>
                           <span>₹5,000 / mo</span>
                        </div>
                        <div className="w-full bg-muted/80 rounded-full h-1">
                           <div className="bg-primary h-1 rounded-full w-1/3"></div>
                        </div>
                        <p className="text-[9px] text-muted-foreground italic text-center">Enable 0% Interest EMI for regular students.</p>
                     </CardContent>
                  </Card>
               </div>

               <div className="p-6 border-t border-border bg-card/80 backdrop-blur-md">
                  <Button 
                    type="button"
                    onClick={() => {
                        alert("Please use the 'Confirm Payment' button above to process transactions.");
                    }}
                    className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-sm shadow-[0_10px_20px_rgba(16,185,129,0.3)] group">
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
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between text-foreground">
            <div>
              <DialogTitle className="text-sm uppercase tracking-[0.2em] font-black">{viewingDoc?.name}</DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground uppercase font-bold">SECURE_VIEWER_V2.0</DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-card relative">
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
          <div className="p-3 border-t border-border flex justify-end gap-2 bg-background">
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
