import { useState, useEffect, ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ArrowLeft, UserCircle2, CalendarDays, Wallet, CheckCircle, BarChart3, PlusCircle, Edit2, ChevronLeft, ChevronRight, AlertCircle, Clock, FileText, CheckCircle2, Upload, Trash2, Download, Search, File, MoreHorizontal, Settings } from "lucide-react";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import { Area, AreaChart, BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";

export function StaffProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<any>(null);
  const [designations, setDesignations] = useState<{name: string, description: string}[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  
  // Edit Profile State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  
  type AttendanceRecord = {
    id?: string;
    date: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Holiday';
    marked_by?: string;
    scanned_at?: string;
    created_at?: string;
    subject?: string;
    sessions?: { subject: string, status: string, time: string }[];
  };
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);
  const [allDesignations, setAllDesignations] = useState<any[]>([]);
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "Active",
    designationIds: [] as string[],
    dateOfBirth: "",
    permanentAddress: "",
    currentAddress: "",
    governmentId: "",
    educationQualifications: "",
    employmentHistory: "",
    referenceContacts: "",
    backgroundScreening: "",
    bankAccountDetails: "",
    taxDeclarations: "",
    pensionAccounts: "",
    emergencyContact: "",
    signedContract: false,
    equipmentRequirements: ""
  });

  // Ledger state
  const [salaries, setSalaries] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Dialogs
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedSalaryId, setSelectedSalaryId] = useState<string>("");
  const [newSalaryForm, setNewSalaryForm] = useState({ monthYear: "", amount: "", dueDate: "" });
  const [payForm, setPayForm] = useState({ amount: "", paymentMethod: "Bank Transfer", referenceId: "" });

  // Document Management States
  const [documents, setDocuments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<any | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (staffId: string) => {
    setLoading(true);
    
    // Fetch all available designations
    const { data: allDs } = await supabase.from('designations').select('*');
    if (allDs) setAllDesignations(allDs);

    // Fetch Staff Profile
    const { data: sData } = await supabase.from('staffs').select('*').eq('id', staffId).single();
    if (sData) setStaff(sData);

    // Fetch Designations
    const { data: sdData } = await supabase.from('staff_designations')
      .select('designation_id, designations(name, description)')
      .eq('staff_id', staffId);
    
    let dList: {name: string, description: string}[] = [];
    let dIds: string[] = [];
    if (sdData) {
      dList = sdData.map((d: any) => ({ name: d.designations?.name, description: d.designations?.description })).filter((d: any) => d.name);
      dIds = sdData.map((d: any) => d.designation_id).filter(Boolean);
      setDesignations(dList);
    }
    
    if (sData) {
       setStaffForm({
          firstName: sData.first_name || "",
          lastName: sData.last_name || "",
          email: sData.email || "",
          phone: sData.phone || "",
          status: sData.status || "Active",
          designationIds: dIds,
          dateOfBirth: sData.date_of_birth || "",
          permanentAddress: sData.permanent_address || "",
          currentAddress: sData.current_address || "",
          governmentId: sData.government_id || "",
          educationQualifications: sData.education_qualifications || "",
          employmentHistory: sData.employment_history || "",
          referenceContacts: sData.reference_contacts || "",
          backgroundScreening: sData.background_screening || "",
          bankAccountDetails: sData.bank_account_details || "",
          taxDeclarations: sData.tax_declarations || "",
          pensionAccounts: sData.pension_accounts || "",
          emergencyContact: sData.emergency_contact || "",
          signedContract: sData.signed_contract || false,
          equipmentRequirements: sData.equipment_requirements || ""
       });
    }

    // Fetch Attendance
    const { data: attData } = await supabase.from('staff_attendance')
      .select('*')
      .eq('staff_id', staffId)
      .order('date', { ascending: false });
      
    // Fetch Holidays
    const { data: holidays } = await supabase.from('holidays').select('*');

    if (attData) {
      let combined = [...attData];
      if (holidays && holidays.length > 0) {
        holidays.forEach(h => {
          if (!combined.some(r => r.date === h.date)) {
            combined.push({
              date: h.date,
              status: 'Holiday',
              scanned_at: null
            });
          }
        });
      }
      setAttendance(combined);
    }

    // Fetch Ledger
    const { data: salData } = await supabase.from('staff_salaries')
      .select('*')
      .eq('staff_id', staffId)
      .order('due_date', { ascending: false });
    if (salData) setSalaries(salData);

    const { data: txData } = await supabase.from('staff_salary_transactions')
      .select('*')
      .eq('staff_id', staffId)
      .order('payment_date', { ascending: false });
    if (txData) setTransactions(txData);

    // Fetch Documents
    const { data: docData } = await supabase.storage
      .from('staff_document')
      .list(`${staffId}/`);
    
    if (docData) {
      const docsWithUrls = docData.map(doc => {
        const { data: { publicUrl } } = supabase.storage
          .from('staff_document')
          .getPublicUrl(`${staffId}/${doc.name}`);
        return { ...doc, url: publicUrl };
      });
      setDocuments(docsWithUrls);
    }

    // Fetch Categories
    const { data: catData } = await supabase
      .from('document_categories')
      .select('*')
      .eq('type', 'Staff');
    if (catData) setCategories(catData);

    setLoading(false);
  };

  
  const handleMarkAttendance = async (status: 'Present' | 'Absent' | 'Late' | 'Excused' | 'Holiday') => {
    if (!id) return;
    const date = new Date().toISOString().split('T')[0];
    try {
      const { error } = await supabase.from('staff_attendance').upsert({
        staff_id: id,
        date: date,
        status: status
      }, { onConflict: 'staff_id,date' });
      if (error) throw error;
      loadData(id);
    } catch (error) {
       console.error("Error marking attendance:", error);
       alert("Error marking attendance");
    }
  };


  const handleSaveProfile = async () => {
    if (!id || !staffForm.firstName || !staffForm.lastName) return;
    
    // update staff
    const { error: staffUpdateErr } = await supabase.from('staffs').update({
       first_name: staffForm.firstName,
       last_name: staffForm.lastName,
       email: staffForm.email,
       phone: staffForm.phone,
       status: staffForm.status,
       date_of_birth: staffForm.dateOfBirth || null,
       permanent_address: staffForm.permanentAddress,
       current_address: staffForm.currentAddress,
       government_id: staffForm.governmentId,
       education_qualifications: staffForm.educationQualifications,
       employment_history: staffForm.employmentHistory,
       reference_contacts: staffForm.referenceContacts,
       background_screening: staffForm.backgroundScreening,
       bank_account_details: staffForm.bankAccountDetails,
       tax_declarations: staffForm.taxDeclarations,
       pension_accounts: staffForm.pensionAccounts,
       emergency_contact: staffForm.emergencyContact,
       signed_contract: staffForm.signedContract,
       equipment_requirements: staffForm.equipmentRequirements
    }).eq('id', id);

    if (staffUpdateErr) {
       alert("Error updating staff: " + staffUpdateErr.message);
       return;
    }

    // update designations: delete existing, insert new
    await supabase.from('staff_designations').delete().eq('staff_id', id);
    
    if (staffForm.designationIds.length > 0) {
       const joins = staffForm.designationIds.map(dId => ({
          staff_id: id,
          designation_id: dId
       }));
       await supabase.from('staff_designations').insert(joins);
    }

    setIsEditDialogOpen(false);
    loadData(id!);
  };

  const toggleDesignation = (dId: string) => {
    setStaffForm(prev => {
      const has = prev.designationIds.includes(dId);
      return {
         ...prev,
         designationIds: has ? prev.designationIds.filter(id => id !== dId) : [...prev.designationIds, dId]
      };
    });
  };

  const handleGenerateSalary = async () => {
    if (!newSalaryForm.monthYear || !newSalaryForm.amount || !newSalaryForm.dueDate) return;

    const { error } = await supabase.from('staff_salaries').insert([{
      staff_id: id,
      month_year: newSalaryForm.monthYear,
      amount: parseFloat(newSalaryForm.amount),
      due_date: newSalaryForm.dueDate,
      status: 'Unpaid'
    }]);

    if (!error) {
       setIsSalaryDialogOpen(false);
       setNewSalaryForm({ monthYear: "", amount: "", dueDate: "" });
       loadData(id!);
    } else {
       alert("Error generating salary: " + error.message);
    }
  };

  const handlePaySalary = async () => {
    if (!payForm.amount || !selectedSalaryId) return;
    
    const amt = parseFloat(payForm.amount);
    
    // Add transaction
    const { error: txError } = await supabase.from('staff_salary_transactions').insert([{
      salary_id: selectedSalaryId,
      staff_id: id,
      amount: amt,
      payment_method: payForm.paymentMethod,
      reference_id: payForm.referenceId
    }]);

    if (!txError) {
       // Recalculate status
       const targetSal = salaries.find(s => s.id === selectedSalaryId);
       const previousTxs = transactions.filter(t => t.salary_id === selectedSalaryId);
       const totalPaid = previousTxs.reduce((sum, t) => sum + Number(t.amount), 0) + amt;
       
       let newStatus = 'Unpaid';
       if (totalPaid >= targetSal.amount) newStatus = 'Paid';
       else if (totalPaid > 0) newStatus = 'Partial';

       await supabase.from('staff_salaries').update({ status: newStatus }).eq('id', selectedSalaryId);
       
       setIsPayDialogOpen(false);
       setPayForm({ amount: "", paymentMethod: "Bank Transfer", referenceId: "" });
       loadData(id!);
    } else {
       alert("Error processing payment: " + txError.message);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setIsUploadDialogOpen(true);
  };

  const confirmUpload = async () => {
    if (!pendingFile || !uploadCategory || !id) return;
    setUploading(true);
    
    try {
      const fileName = `${uploadCategory}_${Date.now()}_${pendingFile.name}`;
      const { error } = await supabase.storage
        .from('staff_document')
        .upload(`${id}/${fileName}`, pendingFile);
      
      if (error) throw error;
      
      setIsUploadDialogOpen(false);
      setPendingFile(null);
      setUploadCategory("");
      await loadData(id);
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docName: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    setDeletingDocument(docName);
    try {
      const { error } = await supabase.storage
        .from('staff_document')
        .remove([`${id}/${docName}`]);
      
      if (error) throw error;
      await loadData(id!);
    } catch (error: any) {
      alert("Delete failed: " + error.message);
    } finally {
      setDeletingDocument(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName) return;
    setAddingCategory(true);
    try {
      const { error } = await supabase.from('document_categories').insert({
        name: newCategoryName,
        type: 'Staff'
      });
      if (error) throw error;
      setNewCategoryName("");
      await loadData(id!);
    } catch(error: any) {
      alert("Failed to add category: " + error.message);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm("Are you sure?")) return;
    setDeletingCategory(catId);
    try {
      const { error } = await supabase.from('document_categories').delete().eq('id', catId);
      if (error) throw error;
      await loadData(id!);
    } catch (error: any) {
      alert("Delete failed: " + error.message);
    } finally {
      setDeletingCategory(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-20">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="w-full">
          <div className="flex gap-2 p-1 bg-muted/20 rounded-lg max-w-md h-10">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 h-full rounded" />
            ))}
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-9 w-32" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-3 w-28" />
                  <div className="space-y-3">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!staff) {
     return <div className="p-8 text-center text-red-500">Staff member not found.</div>;
  }

  // Attendance formatting for chart
  const attChartData = [...attendance].reverse().slice(0, 14).map(a => ({
    date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    present: a.status === 'Present' ? 1 : 0
  }));

  // Ledger calculations
  
  const totalOwed = salaries.filter(s => s.status !== 'Paid').reduce((sum, s) => {
    const paidForThis = transactions.filter(t => t.salary_id === s.id).reduce((sum, t) => sum + Number(t.amount), 0);
    return sum + (Number(s.amount) - paidForThis);
  }, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
       <div className="flex items-center gap-3">
         <Button variant="ghost" size="icon" onClick={() => navigate('/staff')} className="shrink-0 -ml-2 text-muted-foreground hover:text-foreground">
           <ArrowLeft className="h-5 w-5" />
         </Button>
         <div>
           <div className="flex items-center gap-2">
             <h2 className="text-2xl font-bold tracking-tight">{staff.first_name} {staff.last_name}</h2>
             <Badge variant={staff.status === 'Active' ? 'success' : 'secondary'} className="text-[10px] uppercase font-black tracking-widest px-1.5 shadow-none pb-[2px]">
               {staff.status}
             </Badge>
           </div>
           <p className="text-sm font-mono text-muted-foreground mt-0.5">{staff.id} • Joined {new Date(staff.date_of_joining).toLocaleDateString()}</p>
         </div>
       </div>

       <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-1.5 font-bold text-xs"><UserCircle2 className="h-3.5 w-3.5" /> PROFILE</TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 font-bold text-xs"><CalendarDays className="h-3.5 w-3.5" /> ATTENDANCE</TabsTrigger>
            <TabsTrigger value="ledger" className="flex items-center gap-1.5 font-bold text-xs"><Wallet className="h-3.5 w-3.5" /> LEDGER</TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-1.5 font-bold text-xs"><FileText className="h-3.5 w-3.5" /> DOCUMENTS</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
             <TabsContent value="profile" className="mt-0 outline-none">
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                 <Card>
                   <CardHeader className="flex flex-row items-center justify-between pb-4">
                     <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 mt-1.5">
                       <UserCircle2 className="h-4 w-4" /> Personnel Information
                     </CardTitle>
                     <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                       <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                     </Button>
                   </CardHeader>
                   <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                          <div className="font-medium">{staff.first_name} {staff.last_name}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                          <div className="font-medium">{staff.email || 'N/A'}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone Number</label>
                          <div className="font-medium">{staff.phone || 'N/A'}</div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Assigned Roles</label>
                           <div className="flex flex-col gap-2">
                             {designations.length === 0 ? <p className="text-sm italic text-muted-foreground">No roles assigned.</p> :
                               designations.map((d, i) => (
                                 <div key={i} className="flex flex-col items-start border border-border/50 bg-muted/20 p-2.5 rounded-lg">
                                   <Badge variant="secondary" className="px-2 py-0.5 font-medium">{d.name}</Badge>
                                   {d.description && <span className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{d.description}</span>}
                                 </div>
                               ))
                             }
                           </div>
                        </div>
                      </div>
                   </CardContent>
                 </Card>
               </motion.div>
             </TabsContent>

             <TabsContent value="attendance" className="space-y-6 mt-0">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="md:col-span-1 bg-primary/5 border-primary/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                    <CardTitle className="text-sm">Real-time Attendance</CardTitle>
                  </div>
                  <CardDescription className="text-[10px]">Changes sync instantly to the cloud</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2">
                    {[
                      { s: 'Present' as const, i: CheckCircle2, colors: 'border-success/30 hover:bg-success/10 text-success' },
                      { s: 'Absent' as const, i: AlertCircle, colors: 'border-destructive/30 hover:bg-destructive/10 text-destructive' },
                      { s: 'Late' as const, i: Clock, colors: 'border-warning/30 hover:bg-warning/10 text-warning' },
                      { s: 'Holiday' as const, i: CalendarDays, colors: 'border-purple-500/30 hover:bg-purple-500/10 text-purple-600' },
                      { s: 'Excused' as const, i: FileText, colors: 'border-info/30 hover:bg-info/10 text-info' },
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
                      <div className="text-[10px] space-y-1 font-mono max-h-[150px] overflow-y-auto pr-2">
                        {attendance.slice(0, 5).map((a, i) => (
                          <div key={i} className="flex flex-col bg-background/50 p-2 rounded border border-border/50">
                            <div className="flex justify-between items-center w-full">
                              <span className="opacity-70 font-bold">{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                              <Badge variant={a.status === 'Present' ? 'success' : a.status === 'Absent' ? 'destructive' : a.status === 'Holiday' ? 'outline' : 'warning'} className="text-[8px] h-4 px-1 shadow-none">
                                {a.status}
                              </Badge>
                            </div>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-1 mt-1 opacity-60">
                              <Clock className="h-2.5 w-2.5" />
                              {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                second: '2-digit',
                                hour12: true 
                              }) : 'N/A'}
                            </div>
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
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success"></div> Present</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive"></div> Absent</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warning"></div> Late</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Holiday</div>
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
                              title={status ? `Status: ${status}\nTime: ${dayRecord?.created_at ? new Date(dayRecord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A'}` : 'No entry'}
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
                                ${status === 'Present' ? 'bg-success/10 border-success/30' : 
                                  status === 'Absent' ? 'bg-destructive/10 border-destructive/30' : 
                                  status === 'Late' ? 'bg-warning/10 border-warning/30' : 
                                  status === 'Holiday' ? 'bg-purple-500/10 border-purple-500/30' : 
                                  status === 'Excused' ? 'bg-info/10 border-info/30' : 'bg-muted/5'}`}
                            >
                               <span className="text-[10px] font-mono opacity-50">{dayNum}</span>
                               {status && (
                                 <div className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                   status === 'Present' ? 'bg-success' : 
                                    status === 'Absent' ? 'bg-destructive' : 
                                    status === 'Late' ? 'bg-warning' : 
                                    status === 'Holiday' ? 'bg-purple-500' : 'bg-blue-500'
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
                           { name: 'Holiday', value: monthlyRecords.filter(r => r.status === 'Holiday').length },
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
                               { name: 'Present', color: '#16A34A' },
                               { name: 'Absent', color: '#DC2626' },
                               { name: 'Late', color: '#D97706' },
                               { name: 'Holiday', color: '#7C3AED' },
                               { name: 'Excused', color: '#2563EB' }
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
              <Card className="bg-success/5 border-success/20 relative overflow-hidden">
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-success/10 text-success">
                       <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-success/90">
                           Attendance Standing: Good
                        </h3>
                       <p className="text-sm text-success/70 mr-24">Consistent presence maintained. No recent flags.</p>
                    </div>
                 </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <Clock className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-primary">Punctuality Overview</h3>
                       <p className="text-sm text-primary/80">Generally on-time for duty based on logs.</p>
                    </div>
                 </CardContent>
              </Card>
           </div>

        </TabsContent>

             <TabsContent value="ledger" className="mt-0 outline-none">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                   <div className="flex flex-wrap items-center gap-4 justify-between">
                     <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl inline-flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70 mb-1">Total Outstanding Dues</span>
                        <span className="text-2xl font-black text-foreground">₹{totalOwed.toLocaleString()}</span>
                     </div>
                     <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
                       <DialogTrigger asChild>
                          <Button className="font-bold tracking-wide">
                            <PlusCircle className="mr-2 h-4 w-4" /> Generate Salary Bill
                          </Button>
                       </DialogTrigger>
                       <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Issue Salary Bill</DialogTitle>
                            <DialogDescription>Create a payable salary entry for this staff member.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Billing Period (Month/Year)</label>
                              <Input placeholder="e.g. May 2026" value={newSalaryForm.monthYear} onChange={e => setNewSalaryForm({...newSalaryForm, monthYear: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₹)</label>
                                <Input type="number" placeholder="50000" value={newSalaryForm.amount} onChange={e => setNewSalaryForm({...newSalaryForm, amount: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</label>
                                <Input type="date" value={newSalaryForm.dueDate} onChange={e => setNewSalaryForm({...newSalaryForm, dueDate: e.target.value})} />
                              </div>
                            </div>
                            <Button className="w-full mt-2" onClick={handleGenerateSalary}>Generate Invoice</Button>
                          </div>
                       </DialogContent>
                     </Dialog>
                   </div>

                   <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                          <Wallet className="h-4 w-4" /> Salary Ledger
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase pl-6">Period</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase">Due Date</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase">Amount</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase">Status</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase text-right pr-6">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                             {salaries.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No salaries billed yet.</TableCell></TableRow>
                             ) : salaries.map(s => {
                                const paidForThis = transactions.filter(t => t.salary_id === s.id).reduce((sum, t) => sum + Number(t.amount), 0);
                                const out = Number(s.amount) - paidForThis;
                                return (
                                <TableRow key={s.id}>
                                  <TableCell className="pl-6 font-bold">{s.month_year}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{new Date(s.due_date).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <div className="font-mono text-sm">₹{Number(s.amount).toLocaleString()}</div>
                                    {s.status === 'Partial' && <div className="text-[10px] text-primary/70 font-bold uppercase">(Bal: ₹{out.toLocaleString()})</div>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={s.status === 'Paid' ? 'success' : s.status === 'Partial' ? 'outline' : 'destructive'} 
                                           className="text-[10px] uppercase font-bold py-0.5 shadow-none pb-[2px]">
                                      {s.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                     {s.status !== 'Paid' && (
                                        <Dialog open={isPayDialogOpen && selectedSalaryId === s.id} onOpenChange={(open) => {
                                          setIsPayDialogOpen(open);
                                          if (open) {
                                            setSelectedSalaryId(s.id);
                                            setPayForm({ ...payForm, amount: out.toString() });
                                          } else {
                                            setSelectedSalaryId("");
                                          }
                                        }}>
                                          <DialogTrigger asChild>
                                             <Button size="sm" variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 h-7 text-xs">
                                                Settle Dues
                                             </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-sm text-left">
                                             <DialogHeader>
                                                <DialogTitle>Process Salary Payout</DialogTitle>
                                             </DialogHeader>
                                             <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount Configured</label>
                                                  <Input type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} />
                                                </div>
                                                <div className="space-y-2">
                                                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
                                                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                                                    <option>Bank Transfer</option>
                                                    <option>Cheque</option>
                                                    <option>UPI</option>
                                                    <option>Cash</option>
                                                  </select>
                                                </div>
                                                <div className="space-y-2">
                                                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference ID / UTR</label>
                                                  <Input placeholder="Optional" value={payForm.referenceId} onChange={e => setPayForm({...payForm, referenceId: e.target.value})} />
                                                </div>
                                                <Button className="w-full mt-4" onClick={handlePaySalary}>Confirm Payout</Button>
                                             </div>
                                          </DialogContent>
                                        </Dialog>
                                     )}
                                  </TableCell>
                                </TableRow>
                             )})}
                          </TableBody>
                        </Table>
                      </CardContent>
                   </Card>

                   {/* Transaction Ledger */}
                   <Card>
                      <CardHeader>
                        <CardTitle className="text-sm font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" /> Disbursement History
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/10">
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase pl-6">Date</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase">Amount</TableHead>
                              <TableHead className="font-bold text-[10px] tracking-wider uppercase">Method Settings</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">No history logged.</TableCell></TableRow>
                             ) : transactions.map(t => (
                               <TableRow key={t.id}>
                                  <TableCell className="pl-6 font-medium text-xs text-muted-foreground">{new Date(t.payment_date).toLocaleDateString()}</TableCell>
                                  <TableCell className="font-mono text-sm font-bold text-foreground">₹{Number(t.amount).toLocaleString()}</TableCell>
                                  <TableCell>
                                    <div className="text-sm font-medium">{t.payment_method}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-mono">{t.reference_id || 'NO-REF'}</div>
                                  </TableCell>
                               </TableRow>
                             ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                   </Card>
                </motion.div>
             </TabsContent>
              <TabsContent value="documents" className="mt-0 outline-none">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                       <Button variant={activeCategoryFilter === "All" ? "default" : "outline"} size="sm" onClick={() => setActiveCategoryFilter("All")}>All</Button>
                       {categories.map(cat => (
                         <Button 
                          key={cat.id} 
                          variant={activeCategoryFilter === cat.name ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setActiveCategoryFilter(cat.name)}
                         >
                           {cat.name}
                         </Button>
                       ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsCategoryDialogOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" /> Categories
                      </Button>
                      <label>
                        <Button variant="primary" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" /> Upload
                          </span>
                        </Button>
                        <input type="file" className="hidden" onChange={handleFileUpload} />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.filter(doc => activeCategoryFilter === "All" || doc.name.startsWith(activeCategoryFilter + "_")).map((doc, idx) => {
                      const category = doc.name.split('_')[0] || 'Unsorted';
                      const displayName = doc.name.split('_').slice(2).join('_') || doc.name;
                      return (
                        <Card key={idx} className="group hover:border-primary/40 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                                  <File className="h-5 w-5 text-primary" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-sm font-bold truncate">{displayName}</p>
                                  <Badge variant="secondary" className="text-[10px] mt-1">{category}</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewDocument(doc)}>
                                  <Search className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={doc.url} target="_blank" rel="noreferrer">
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDocument(doc.name)} disabled={deletingDocument === doc.name}>
                                  {deletingDocument === doc.name ? <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {documents.length === 0 && (
                      <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl border-muted/20">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-muted-foreground">No documents indexed in staff vault.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>
           </div>
        </Tabs>

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>Select Category</DialogTitle>
            <DialogDescription>Please select a document category for "{pendingFile?.name}"</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {categories.map(cat => (
              <Button 
                key={cat.id} 
                variant={uploadCategory === cat.name ? "default" : "outline"}
                onClick={() => setUploadCategory(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmUpload} disabled={!uploadCategory || uploading}>
              {uploading ? "Uploading..." : "Confirm Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-md text-left">
          <DialogHeader>
            <DialogTitle>Document Categories</DialogTitle>
            <DialogDescription>Manage available document categories for staff members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New category name..." 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
              />
              <Button size="sm" onClick={handleAddCategory} disabled={addingCategory || !newCategoryName}>
                {addingCategory ? <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : "Add"}
              </Button>
            </div>
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCategory(cat.id)} disabled={deletingCategory === cat.id}>
                    {deletingCategory === cat.id ? <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl p-0 h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="p-4 border-b bg-muted/20">
            <DialogTitle className="flex justify-between items-center pr-6">
              <span className="truncate pr-4">{previewDocument?.name?.split('_').slice(2).join('_') || 'Document Preview'}</span>
              <a href={previewDocument?.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline shrink-0">
                Open Original
              </a>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full bg-black/5 flex items-center justify-center p-4">
            {previewDocument && (
               (previewDocument.name.endsWith('.pdf') || previewDocument.name.endsWith('.png') || previewDocument.name.endsWith('.jpg') || previewDocument.name.endsWith('.jpeg')) ? (
                 <iframe src={previewDocument.url} className="w-full h-full rounded-lg bg-white shadow-sm" title="Document Preview" />
               ) : (
                 <div className="text-center space-y-4">
                   <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
                   <p className="text-muted-foreground font-medium">Preview not available for this file type.</p>
                   <Button asChild>
                     <a href={previewDocument.url} target="_blank" rel="noreferrer">Download to View</a>
                   </Button>
                 </div>
               )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Session Breakdown</span>
              <Badge variant={selectedDay?.status === 'Present' ? 'success' : selectedDay?.status === 'Absent' ? 'destructive' : selectedDay?.status === 'Holiday' ? 'outline' : 'warning'}>
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
                     <div className={`p-2 rounded-md ${session.status === 'Present' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile Information</DialogTitle>
            <DialogDescription>Update comprehensive personnel records.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="personal" className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="professional" className="text-xs">Professional</TabsTrigger>
              <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
              <TabsTrigger value="setup" className="text-xs">Setup</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 pt-4 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name*</label>
                  <Input value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name*</label>
                  <Input value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} placeholder="Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <Input value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} placeholder="jane@org.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                  <Input value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} placeholder="+91..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
                  <Input type="date" value={staffForm.dateOfBirth} onChange={e => setStaffForm({...staffForm, dateOfBirth: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Govt/National ID</label>
                  <Input value={staffForm.governmentId} onChange={e => setStaffForm({...staffForm, governmentId: e.target.value})} placeholder="PAN / Aadhaar / Passport Num" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Address</label>
                <Input value={staffForm.currentAddress} onChange={e => setStaffForm({...staffForm, currentAddress: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permanent Address</label>
                <Input value={staffForm.permanentAddress} onChange={e => setStaffForm({...staffForm, permanentAddress: e.target.value})} />
              </div>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4 pt-4 outline-none">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Educational Qualifications</label>
                <Input value={staffForm.educationQualifications} onChange={e => setStaffForm({...staffForm, educationQualifications: e.target.value})} placeholder="Highest degrees, certifications..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employment History</label>
                <Input value={staffForm.employmentHistory} onChange={e => setStaffForm({...staffForm, employmentHistory: e.target.value})} placeholder="Previous organizations and roles..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference Contacts</label>
                <Input value={staffForm.referenceContacts} onChange={e => setStaffForm({...staffForm, referenceContacts: e.target.value})} placeholder="Names and phone numbers of references..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Background Screening</label>
                <Input value={staffForm.backgroundScreening} onChange={e => setStaffForm({...staffForm, backgroundScreening: e.target.value})} placeholder="Notes on BGV status or police verification..." />
              </div>
            </TabsContent>

            <TabsContent value="financial" className="space-y-4 pt-4 outline-none">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Account Information</label>
                <Input value={staffForm.bankAccountDetails} onChange={e => setStaffForm({...staffForm, bankAccountDetails: e.target.value})} placeholder="Bank Name, Account Num, IFSC/Routing Code" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tax Declarations</label>
                  <Input value={staffForm.taxDeclarations} onChange={e => setStaffForm({...staffForm, taxDeclarations: e.target.value})} placeholder="Tax regime, exemptions..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pension / Provident</label>
                  <Input value={staffForm.pensionAccounts} onChange={e => setStaffForm({...staffForm, pensionAccounts: e.target.value})} placeholder="UAN / PF Number..." />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="setup" className="space-y-4 pt-4 outline-none">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emergency Contact</label>
                  <Input value={staffForm.emergencyContact} onChange={e => setStaffForm({...staffForm, emergencyContact: e.target.value})} placeholder="Name & Num..." />
                </div>
                <div className="space-y-2 flex items-center pt-8">
                   <input type="checkbox" id="signedContractProfile" className="mr-2 h-4 w-4 rounded border-gray-300" checked={staffForm.signedContract} onChange={e => setStaffForm({...staffForm, signedContract: e.target.checked})} />
                   <label htmlFor="signedContractProfile" className="text-sm font-medium">Employment Contract Signed</label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipment & Access Needs</label>
                <Input value={staffForm.equipmentRequirements} onChange={e => setStaffForm({...staffForm, equipmentRequirements: e.target.value})} placeholder="Laptop specs, keycard access, software licenses..." />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                <select 
                  className="flex w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  value={staffForm.status} 
                  onChange={e => setStaffForm({...staffForm, status: e.target.value})}
                >
                  <option value="Active">Active Duty</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="pt-4 border-t mt-4 border-border">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Manage Designations</label>
                <div className="flex flex-wrap gap-2">
                  {allDesignations.map(d => {
                     const isSel = staffForm.designationIds.includes(d.id);
                     return (
                       <Badge 
                         key={d.id} 
                         onClick={() => toggleDesignation(d.id)}
                         variant={isSel ? "default" : "outline"} 
                         className={`cursor-pointer px-3 py-1 transition-all ${isSel ? 'bg-primary text-primary-foreground hover:bg-primary/80' : 'hover:bg-muted font-normal text-muted-foreground'}`}
                       >
                         {d.name} {isSel && <CheckCircle className="ml-1.5 h-3 w-3 inline" />}
                       </Badge>
                     )
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 border-t pt-4">
            <Button onClick={handleSaveProfile} disabled={!staffForm.firstName || !staffForm.lastName}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
