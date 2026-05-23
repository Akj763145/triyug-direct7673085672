import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen,
  Eye, 
  IndianRupee,
  Layers,
  Settings2,
  Calendar,
  AlertCircle,
  HelpCircle,
  QrCode,
  CheckCircle,
  Sparkles,
  ArrowRight,
  UserPlus,
  RefreshCw,
  Calculator,
  Percent,
  Send,
  Lock,
  ExternalLink
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { supabase } from '../lib/supabase';

// Interfaces aligning with Prisma/Express Backends
interface Batch {
  id: string;
  name: string;
  description?: string;
  totalBatchAmount: number;
  minInstallments?: number;
  maxInstallments?: number;
  durationMonths?: number;
  facultyAssign?: string;
  thumbnail?: string;
  totalSeats?: number;
  availableSeats?: number;
  subject?: string;
  streamCategory?: string;
  boardTarget?: string;
  teachingMedium?: string;
  timing?: string;
  batchMode?: string;
  curriculumModules?: string;
  status: 'Active' | 'Archived' | 'Draft' | string;
  createdAt?: string;
  updatedAt?: string;
}

interface SimulatedInvoice {
  id: string;
  enrollmentId: string;
  studentName: string;
  amount: number;
  dueDate: string;
  installmentNo: number;
  status: "UPCOMING" | "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE";
}

export default function Batches() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [invoices, setInvoices] = useState<SimulatedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');
  
  // Setup Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalBatchAmount: '',
    minInstallments: '1',
    maxInstallments: '1',
    durationMonths: '1',
    facultyAssign: '',
    thumbnail: '',
    totalSeats: '',
    availableSeats: '',
    subject: '',
    streamCategory: '',
    boardTarget: '',
    teachingMedium: '',
    timing: '',
    batchMode: '',
    curriculumModules: [{ title: '', topics: '' }],
    status: 'Active' as const
  });
  
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState('');

  // Simulation Hub states
  const [selectedSimBatch, setSelectedSimBatch] = useState<Batch | null>(null);
  const [simStudentId, setSimStudentId] = useState('');
  const [simStudentName, setSimStudentName] = useState('');
  const [simLookupLoading, setSimLookupLoading] = useState(false);
  const [simChosenInst, setSimChosenInst] = useState<number>(1);
  const [simulatingEnrollment, setSimulatingEnrollment] = useState(false);
  
  // Gateway QR Drawer state
  const [payingInvoice, setPayingInvoice] = useState<SimulatedInvoice | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  // Viewing Details State
  const [viewingBatchDetail, setViewingBatchDetail] = useState<Batch | null>(null);

  // EMI / Installment logic state
  const [emiSchemes, setEmiSchemes] = useState<Record<string, Record<string, number[]>>>({});
  const [customEmiPrices, setCustomEmiPrices] = useState<Record<string, Record<string, number>>>({});
  const [selectedBatchForEmi, setSelectedBatchForEmi] = useState<string | null>(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('emiConfigData');
    if (saved) {
      try {
        setEmiSchemes(JSON.parse(saved));
      } catch (e) {}
    }
    const savedPrices = localStorage.getItem('emiCustomPrices');
    if (savedPrices) {
      try {
        setCustomEmiPrices(JSON.parse(savedPrices));
      } catch (e) {}
    }
  }, []);

  const saveEmiConfig = (newEmi: Record<string, Record<string, number[]>>) => {
    setEmiSchemes(newEmi);
    localStorage.setItem('emiConfigData', JSON.stringify(newEmi));
  };

  const handleSaveEmiPolicies = async (batchId: string) => {
    try {
      const schemesForBatch = emiSchemes[batchId] || {};
      const pricesForBatch = customEmiPrices[batchId] || {};
      
      const response = await fetch(`/api/batches/${batchId}/emi-policies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           schemes: schemesForBatch,
           prices: pricesForBatch
        })
      });
      
      if (!response.ok) throw new Error('Failed to update policies');
      
      alert("EMI policies and allocations have been successfully updated for all matching enrollments.");
      
      // refresh invoices
      fetchInvoices();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to apply policies");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    fetchBatches();
    fetchInvoices();
    fetchCategoriesAndStaff();
  }, []);

  const [streamCategories, setStreamCategories] = useState<{id: string, name: string}[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchCategoriesAndStaff = async () => {
    try {
      const resCat = await fetch('/api/stream-categories');
      if (resCat.ok) {
        const json = await resCat.json();
        setStreamCategories(json.data);
      }
      
      // Fetch staffs with their designations for Faculty assigning
      if (supabase) {
        const { data: staffsData, error: staffError } = await supabase
          .from('staffs')
          .select('id, first_name, last_name, staff_designations(designations(name))');
        
        if (!staffError && staffsData) {
          const list = staffsData.map(s => {
             const dsg = (s.staff_designations && s.staff_designations.length > 0 && (s.staff_designations[0] as any).designations)
                     ? (s.staff_designations[0] as any).designations.name
                     : 'Staff';
             return { 
                id: s.id, 
                name: (s.first_name + ' ' + (s.last_name || '')).trim(), 
                designation: dsg 
             };
          });
          setStaffList(list.filter(l => l.name.trim() !== ''));
        }
      }
    } catch(e) {
      console.error(e);
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/batches');
      if (response.ok) {
        const json = await response.json();
        setBatches(json.data);
      } else {
        console.error("API response error, falling back to mock batch load");
      }
    } catch (e) {
      console.error("Express connection error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Student ID Lookup effect
  useEffect(() => {
    if (!simStudentId || simStudentId.length < 3) {
      setSimStudentName('');
      return;
    }

    const lookupTimer = setTimeout(async () => {
      setSimLookupLoading(true);
      try {
        if (!supabase) return;

        // Try student_profiles first
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('first_name, last_name')
          .or(`student_id.eq.${simStudentId},id.eq.${simStudentId}`)
          .maybeSingle();

        if (profile) {
          setSimStudentName(`${profile.first_name} ${profile.last_name || ''}`.trim());
        } else {
          // Fallback to students
          const { data: student } = await supabase
            .from('students')
            .select('name')
            .eq('id', simStudentId)
            .maybeSingle();

          if (student) {
            setSimStudentName(student.name);
          } else {
            setSimStudentName('Student Not Found');
          }
        }
      } catch (err) {
        console.error("Lookup error:", err);
      } finally {
        setSimLookupLoading(false);
      }
    }, 500);

    return () => clearTimeout(lookupTimer);
  }, [simStudentId]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/stream-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName })
      });
      if (res.ok) {
        setNewCategoryName('');
        fetchCategoriesAndStaff();
      } else {
        alert("Failed to add category");
      }
    } catch(e) { console.error(e); }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      const res = await fetch(`/api/stream-categories/${id}`, { method: 'DELETE' });
      if (res.ok) fetchCategoriesAndStaff();
    } catch(e) { console.error(e); }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const json = await response.json();
        setInvoices(json.data);
      }
    } catch (e) {
      console.error("Failed to load invoice lists:", e);
    }
  };

  // Enforce Real-time validation interactive border styles
  const validateField = (field: string, value: string) => {
    const tempErrors = { ...formErrors };
    
    if (field === 'name') {
      if (!value.trim()) {
        tempErrors.name = 'Batch Name is a mandatory operational requirement.';
      } else {
        delete tempErrors.name;
      }
    }
    
    if (field === 'totalBatchAmount') {
      const amt = Number(value);
      if (!value || isNaN(amt) || amt <= 0) {
        tempErrors.totalBatchAmount = 'Fee anchor must represent a non-zero positive currency field.';
      } else {
        delete tempErrors.totalBatchAmount;
      }
    }

    if (field === 'minInstallments') {
      const minVal = parseInt(value);
      if (!value || isNaN(minVal) || minVal < 1) {
        tempErrors.minInstallments = 'Min installments must represent at least 1 cycle.';
      } else {
        delete tempErrors.minInstallments;
      }
    }

    if (field === 'maxInstallments') {
      const maxVal = parseInt(value);
      const minVal = parseInt(formData.minInstallments);
      if (!value || isNaN(maxVal) || maxVal < 1) {
        tempErrors.maxInstallments = 'Max installments must represent at least 1 cycle.';
      } else if (maxVal < minVal) {
        tempErrors.maxInstallments = 'Max installments cannot fall below minimum bounds.';
      } else {
        delete tempErrors.maxInstallments;
        // Clean up minInstallments error if maxInstallments is now valid in relation
        if (minVal >= 1) {
          delete tempErrors.minInstallments;
        }
      }
    }

    if (field === 'durationMonths') {
      const durVal = parseInt(value);
      if (!value || isNaN(durVal) || durVal < 1) {
        tempErrors.durationMonths = 'Duration must be at least 1 month.';
      } else {
        delete tempErrors.durationMonths;
      }
    }

    if (field === 'totalSeats') {
      const seatsVal = parseInt(value);
      if (!value || isNaN(seatsVal) || seatsVal < 1) {
        tempErrors.totalSeats = 'Must have at least 1 seat.';
      } else {
        delete tempErrors.totalSeats;
      }
    }

    setFormErrors(tempErrors);
  };

  // Overall form pre-submission validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Batch Name is a mandatory operational requirement.';
    }
    
    const amt = Number(formData.totalBatchAmount);
    if (!formData.totalBatchAmount || isNaN(amt) || amt <= 0) {
      errors.totalBatchAmount = 'Fee anchor must represent a non-zero positive currency field.';
    }
    
    const min = parseInt(formData.minInstallments);
    const max = parseInt(formData.maxInstallments);
    
    if (isNaN(min) || min < 1) {
      errors.minInstallments = 'Min installments must represent at least 1 cycle.';
    }
    
    if (isNaN(max) || max < 1) {
      errors.maxInstallments = 'Max installments must represent at least 1 cycle.';
    } else if (max < min) {
      errors.maxInstallments = 'Max installments cannot fall below minimum bounds.';
    }
    
    const dur = parseInt(formData.durationMonths);
    if (isNaN(dur) || dur < 1) {
      errors.durationMonths = 'Duration must be at least 1 month.';
    }

    const seats = parseInt(formData.totalSeats);
    if (isNaN(seats) || seats < 1) {
      errors.totalSeats = 'Must have at least 1 seat.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, val: string) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    if (typeof (val as any) === 'string') validateField(field, val);
  };

  const handleModuleChange = (index: number, field: string, val: string) => {
    const updatedModules = [...formData.curriculumModules];
    updatedModules[index] = { ...updatedModules[index], [field]: val };
    setFormData({ ...formData, curriculumModules: updatedModules });
  };

  const addModule = () => {
    setFormData({ ...formData, curriculumModules: [...formData.curriculumModules, { title: '', topics: '' }] });
  };

  const removeModule = (index: number) => {
    const updatedModules = [...formData.curriculumModules];
    updatedModules.splice(index, 1);
    setFormData({ ...formData, curriculumModules: updatedModules });
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setApiSuccessMsg('');
    
    try {
      const method = editingBatchId ? 'PUT' : 'POST';
      const endpoint = editingBatchId ? `/api/batches/${editingBatchId}` : '/api/batches';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          totalBatchAmount: Number(formData.totalBatchAmount),
          minInstallments: parseInt(formData.minInstallments),
          maxInstallments: parseInt(formData.maxInstallments),
          durationMonths: parseInt(formData.durationMonths),
          facultyAssign: formData.facultyAssign,
          thumbnail: formData.thumbnail,
          totalSeats: parseInt(formData.totalSeats) || 0,
          availableSeats: parseInt(formData.availableSeats) || parseInt(formData.totalSeats) || 0,
          subject: formData.subject,
          streamCategory: formData.streamCategory,
          boardTarget: formData.boardTarget,
          teachingMedium: formData.teachingMedium,
          timing: formData.timing,
          batchMode: formData.batchMode,
          curriculumModules: formData.curriculumModules,
          status: formData.status
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setApiSuccessMsg(editingBatchId ? 'Batch setup reconfigured safely!' : 'Academic batch launched securely!');
        
        // Reset Setup Form
        setFormData({
          name: '',
          description: '',
          totalBatchAmount: '',
          minInstallments: '1',
          maxInstallments: '1',
          durationMonths: '1',
          facultyAssign: '',
          thumbnail: '',
          totalSeats: '',
          availableSeats: '',
          subject: '',
          streamCategory: '',
          boardTarget: '',
          teachingMedium: '',
          timing: '',
          batchMode: '',
          curriculumModules: [{ title: '', topics: '' }],
          status: 'Active' as const
        });
        setEditingBatchId(null);
        setFormErrors({});
        
        // Refetch active datasets
        await fetchBatches();
        setActiveTab('ledger');
      } else {
        setFormErrors({ form: data.error || 'Server rejected installment parameters.' });
      }
    } catch (err: any) {
      console.error(err);
      setFormErrors({ form: 'Check local server handshake. Ensure node workspace is compiled.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInit = (batch: Batch) => {
    setEditingBatchId(batch.id);
    setFormData({
      name: batch.name,
      description: batch.description || '',
      totalBatchAmount: batch.totalBatchAmount.toString(),
      minInstallments: batch.minInstallments?.toString() || '1',
      maxInstallments: batch.maxInstallments?.toString() || '1',
      durationMonths: (batch.durationMonths || 1).toString(),
      facultyAssign: batch.facultyAssign || '',
      thumbnail: batch.thumbnail || '',
      totalSeats: batch.totalSeats?.toString() || '',
      availableSeats: batch.availableSeats?.toString() || '',
      subject: batch.subject || '',
      streamCategory: batch.streamCategory || '',
      boardTarget: batch.boardTarget || '',
      teachingMedium: batch.teachingMedium || '',
      timing: batch.timing || '',
      batchMode: batch.batchMode || '',
      curriculumModules: batch.curriculumModules || [{ title: '', topics: '' }],
      status: (batch.status as any) || 'Active'
    });
    setFormErrors({});
    setApiSuccessMsg('');
    setActiveTab('builder');
    
    // Auto scroll control form into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm("Operational confirmation: Delete this academic batch? This will release underlying bounds constraints.")) return;
    try {
      const response = await fetch(`/api/batches/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setApiSuccessMsg('Batch records pruned gracefully.');
        await fetchBatches();
      }
    } catch (e) {
      console.error("Deletion query error:", e);
    }
  };

  const handleCancelEdit = () => {
    setEditingBatchId(null);
    setFormData({
      name: '',
      description: '',
      totalBatchAmount: '',
      minInstallments: '1',
      maxInstallments: '1',
      durationMonths: '1',
      facultyAssign: '',
      thumbnail: '',
      totalSeats: '',
      availableSeats: '',
      subject: '',
      streamCategory: '',
      boardTarget: '',
      teachingMedium: '',
      timing: '',
      batchMode: '',
      curriculumModules: [{ title: '', topics: '' }],
      status: 'Active' as const
    });
    setFormErrors({});
    setApiSuccessMsg('');
    setActiveTab('ledger');
  };

  const handleSimulateEnrollment = async () => {
    if (!selectedSimBatch) return;
    setSimulatingEnrollment(true);
    
    try {
      const customConfig = emiSchemes[selectedSimBatch.id] || {};
      const appliedPercentages = customConfig[simChosenInst];

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: simStudentId,
          studentName: simStudentName,
          batchId: selectedSimBatch.id,
          chosenInstallments: simChosenInst,
          percentages: appliedPercentages
        })
      });

      const json = await response.json();
      if (response.ok) {
        // Fetch new invoices list
        await fetchInvoices();
        
        // Push newly made items to front of lists
        alert(`Accounting success! Split total ₹${selectedSimBatch.totalBatchAmount.toLocaleString()} into ${simChosenInst} scheduled invoices.`);
      } else {
        alert(`Simulation rejected: ${json.error}`);
      }
    } catch (e: any) {
      console.error(e);
      alert('Handshake failed.');
    } finally {
      setSimulatingEnrollment(false);
    }
  };

  const handleGenerateInvoiceQR = async (inv: SimulatedInvoice) => {
    setPayingInvoice(inv);
    setQrLoading(true);
    setQrPayload(null);

    try {
      const response = await fetch('/api/payments/qrcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId: inv.id,
          amount: inv.amount,
          description: `Installment #${inv.installmentNo} for ${inv.studentName}`
        })
      });

      if (response.ok) {
        const json = await response.json();
        setQrPayload(json);
      } else {
        alert("Gateway endpoint returned connection error.");
      }
    } catch (e) {
      console.error(e);
      alert("Billing gateway connection offline.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleSimulateWebhookPaid = async () => {
    if (!payingInvoice || !qrPayload) return;
    setSimulatingWebhook(true);

    try {
      // Direct Webhook POST matching /api/webhooks/payments schema
      const response = await fetch('/api/webhooks/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: "payment.captured",
          invoiceId: payingInvoice.id,
          mock_captured: true,
          payload: {
            payment: {
              entity: {
                id: qrPayload.qrToken || `PAY-${Date.now()}`,
                amount: payingInvoice.amount * 100,
                currency: "INR",
                status: "captured",
                description: `Payment for Invoice ${payingInvoice.id}`
              }
            }
          }
        })
      });

      if (response.ok) {
        // Retrieve fresh invoice records
        await fetchInvoices();
        // Update currently simulated invoices status smoothly
        setPayingInvoice(prev => prev ? { ...prev, status: "PAID" } : null);
        alert(`Secure Webhook Captured! Database ledger mutated invoice status to PAID.`);
      } else {
        alert("Webhook response mapping error.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  const filteredBatches = batches.filter(batch => 
    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    batch.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 p-1 sm:p-2">
      {/* Header block with Display typography */}
      <div>
        <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest">
          <Settings2 className="h-3 w-3" /> Core Financial Setup
        </div>
        <h1 className="text-4xl font-black tracking-tight text-foreground mt-1">Batch & Installment Rules</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Anchor student program fees and constrain installment bounds to eliminate accounting exploits.
        </p>
      </div>

      {apiSuccessMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold text-xs flex items-center gap-2 shadow-sm"
        >
          <CheckCircle className="h-4 w-4 shrink-0" />
          {apiSuccessMsg}
        </motion.div>
      )}

      {formErrors.form && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formErrors.form}
        </div>
      )}

      {/* Dynamic Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 h-12 w-full justify-start max-w-md ml-0 bg-transparent p-0 gap-4 border-b border-border/40 rounded-none">
          <TabsTrigger value="ledger" className="font-black text-xs uppercase tracking-widest h-11 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4">
            <Layers className="h-3 w-3 mr-1.5" /> Active Ledger
          </TabsTrigger>
          <TabsTrigger value="builder" className="font-black text-xs uppercase tracking-widest h-11 border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-emerald-600 data-[state=active]:text-emerald-500">
            <Sparkles className="h-3 w-3 mr-1.5" /> Advanced Batch Builder
          </TabsTrigger>
          <TabsTrigger value="installments" className="font-black text-xs uppercase tracking-widest h-11 border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-indigo-600 data-[state=active]:text-indigo-500">
            <Percent className="h-3 w-3 mr-1.5" /> EMI Policies
          </TabsTrigger>
          <TabsTrigger value="simulator" className="font-black text-xs uppercase tracking-widest h-11 border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-4 text-emerald-600 data-[state=active]:text-emerald-500">
            <Calculator className="h-3 w-3 mr-1.5" /> Simulation Engine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-0 focus-visible:outline-none focus:outline-none">
          <div className="max-w-6xl mx-auto pb-12 mt-2">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-black tracking-tight">{editingBatchId ? 'Edit Batch' : 'Add New Batch'}</h2>
               <div className="flex items-center gap-2">
                 {editingBatchId && <Button type="button" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>}
                 <Button onClick={handleSaveBatch} disabled={isSubmitting} className="font-bold text-sm bg-blue-600 hover:bg-blue-700 h-10 px-6 text-white">
                    {isSubmitting ? 'Saving...' : editingBatchId ? 'Update Configuration' : 'Publish To Live Website'}
                 </Button>
               </div>
            </div>

            {formErrors.form && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold text-sm flex items-center gap-2">
                <AlertCircle className="h-5 w-5" /> {formErrors.form}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* LEFT COLUMN */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* CORE DETAILS */}
                <div>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-muted/50 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Core Details</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-foreground">Batch Name Title <span className="text-red-500">*</span></label>
                      <Input 
                        placeholder="e.g. Target NEET 2026 - Alpha Batch"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`h-11 bg-background transition-all focus-visible:ring-primary/20 ${formErrors.name ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-input'}`}
                      />
                      {formErrors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{formErrors.name}</p>}
                    </div>

                    <div className="space-y-2">
                       <label className="text-xs font-bold text-foreground">Detailed Description</label>
                       <textarea 
                         placeholder="Provide a detailed overview of the batch syllabus, schedule, and key highlights..."
                         value={formData.description}
                         onChange={(e) => handleInputChange('description', e.target.value)}
                         className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                       />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground">Subject</label>
                        <Input 
                          placeholder="e.g. Physics"
                          value={formData.subject}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                          className="h-11 bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-foreground">Stream Category</label>
                          <button type="button" onClick={() => setIsManageCategoriesOpen(true)} className="text-[10px] text-blue-600 font-bold hover:underline">Manage Categories</button>
                        </div>
                        <select
                          value={formData.streamCategory}
                          onChange={(e) => handleInputChange('streamCategory', e.target.value)}
                          className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                        >
                          <option value="">No Category</option>
                          {streamCategories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground">Total Fee Structure <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/70 font-bold">₹</div>
                          <Input 
                            type="number"
                            placeholder="45000"
                            value={formData.totalBatchAmount}
                            onChange={(e) => handleInputChange('totalBatchAmount', e.target.value)}
                            className={`pl-8 h-11 bg-background transition-all focus-visible:ring-primary/20 ${formErrors.totalBatchAmount ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-input'}`}
                          />
                        </div>
                        {formErrors.totalBatchAmount && <p className="text-[10px] font-bold text-red-500 mt-1">{formErrors.totalBatchAmount}</p>}
                      </div>
                      
                      <div className="space-y-2 hidden md:block">
                        {/* Empty spacing block */}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ASSIGN FACULTY TEAM */}
                <div>
                  <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-muted/50 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Assign Faculty Team</span>
                  </div>
                  
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Select the teachers who will be leading this batch.
                    </p>
                    {staffList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {staffList.map(staff => {
                          const isSelected = (formData.facultyAssign || '').includes(staff.name);
                          return (
                            <button
                              type="button"
                              key={staff.id}
                              onClick={() => {
                                let current = formData.facultyAssign ? formData.facultyAssign.split(', ').filter(Boolean) : [];
                                if (isSelected) {
                                  current = current.filter(n => n !== staff.name);
                                } else {
                                  current.push(staff.name);
                                }
                                handleInputChange('facultyAssign', current.join(', '));
                              }}
                              className={`flex flex-col text-left p-3 rounded-xl border transition-all ${isSelected ? 'bg-blue-600/10 border-blue-600/30' : 'bg-background border-border hover:border-blue-500/30'}`}
                            >
                              <div className="flex items-start justify-between w-full">
                                <div>
                                  <p className="text-sm font-bold text-foreground truncate">{staff.name}</p>
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground track-wider">{staff.designation}</p>
                                </div>
                                <div className={`h-4 w-4 rounded flex items-center justify-center mt-1 shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'border border-muted-foreground/30'}`}>
                                  {isSelected && <CheckCircle className="h-3 w-3" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                       <Input 
                          placeholder="e.g. Dr. Haris, Prof. Smith (No staff found in DB)"
                          value={formData.facultyAssign}
                          onChange={(e) => handleInputChange('facultyAssign', e.target.value)}
                          className="h-11 bg-background mx-auto max-w-md text-center"
                       />
                    )}
                  </div>
                </div>

                {/* CURRICULUM MODULES */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-muted/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Curriculum Modules</span>
                    </div>
                    <button type="button" onClick={addModule} className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:underline">
                      <Plus className="h-4 w-4" /> Add Module
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.curriculumModules.map((module, index) => (
                      <div key={index} className="border border-input rounded-xl p-4 bg-background relative group">
                        <button 
                          type="button" 
                          onClick={() => removeModule(index)}
                          className="absolute right-4 top-4 text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <div className="space-y-4 pr-8">
                          <Input 
                            placeholder="Module Title (e.g. Module 1 Title)"
                            value={module.title}
                            onChange={(e) => handleModuleChange(index, 'title', e.target.value)}
                            className="font-bold border-none bg-transparent px-0 h-8 shadow-none focus-visible:ring-0 rounded-none placeholder:font-normal"
                          />
                          <div className="h-px w-full bg-border" />
                          <textarea 
                            placeholder="Topics covered..."
                            value={module.topics}
                            onChange={(e) => handleModuleChange(index, 'topics', e.target.value)}
                            className="w-full text-sm resize-none bg-transparent focus:outline-none min-h-[60px]"
                          />
                        </div>
                      </div>
                    ))}
                    {formData.curriculumModules.length === 0 && (
                      <div className="p-8 text-center border border-dashed border-border rounded-xl">
                        <p className="text-sm text-muted-foreground italic">No modules added yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Under the hood parameters */}
                <div>
                   <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-muted/50 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Internal Ledger Directives</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-foreground">Duration (Months) <span className="text-red-500">*</span></label>
                        <Input 
                          type="number"
                          min="1"
                          value={formData.durationMonths}
                          onChange={(e) => handleInputChange('durationMonths', e.target.value)}
                          className={`h-11 bg-background`}
                        />
                         {formErrors.durationMonths && <p className="text-[10px] font-bold text-red-500 mt-1">{formErrors.durationMonths}</p>}
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-foreground">Min Installments</label>
                        <Input type="number" min="1" value={formData.minInstallments} onChange={(e) => handleInputChange('minInstallments', e.target.value)} className="h-11 bg-background" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-bold text-foreground">Max Installments</label>
                        <Input type="number" min="1" value={formData.maxInstallments} onChange={(e) => handleInputChange('maxInstallments', e.target.value)} className="h-11 bg-background" />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* SMART FILTERS & SCHEDULE */}
                <div className="border border-border/60 bg-muted/15 rounded-2xl p-6 space-y-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Smart Filters & Schedule</h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Board / Target Exam</label>
                    <select
                      value={formData.boardTarget}
                      onChange={(e) => handleInputChange('boardTarget', e.target.value)}
                      className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="">Select Board...</option>
                      <option value="CBSE Board">CBSE Board</option>
                      <option value="ICSE Board">ICSE Board</option>
                      <option value="State Board">State Board</option>
                      <option value="NEET">NEET</option>
                      <option value="JEE">JEE Main & Advanced</option>
                      <option value="UPSC">UPSC</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Teaching Medium</label>
                    <select
                      value={formData.teachingMedium}
                      onChange={(e) => handleInputChange('teachingMedium', e.target.value)}
                      className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Hinglish">Hinglish</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Timing</label>
                    <Input 
                      placeholder="e.g. 4 PM - 6 PM (MWF)"
                      value={formData.timing}
                      onChange={(e) => handleInputChange('timing', e.target.value)}
                      className="h-11 bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Batch Mode</label>
                    <select
                      value={formData.batchMode}
                      onChange={(e) => handleInputChange('batchMode', e.target.value)}
                      className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="Offline">Offline</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">Current Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full h-11 px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                    >
                      <option value="Active">Active / Running</option>
                      <option value="Draft">Draft (Planning)</option>
                      <option value="Archived">Archived / Past</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Batch Thumbnail
                    </label>
                    <div className="relative">
                       <Input 
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => handleInputChange('thumbnail', reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="h-11 bg-background transition-all border-input text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                       />
                       {formData.thumbnail && formData.thumbnail.startsWith('data:image') && (
                          <button
                            type="button"
                            onClick={() => handleInputChange('thumbnail', '')}
                            className="absolute right-2 top-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                       )}
                    </div>
                    {formData.thumbnail && (
                       <img src={formData.thumbnail} alt="preview" className="h-24 w-full mt-2 object-cover rounded-xl border border-border" onError={(e) => e.currentTarget.style.display = 'none'} />
                    )}
                  </div>
                </div>

                {/* SCARCITY ENGINE */}
                <div className="border border-orange-500/20 bg-orange-50/50 rounded-2xl p-6 dark:bg-orange-950/10">
                  <h3 className="text-xs font-black tracking-widest text-orange-600 dark:text-orange-400 mb-6 uppercase">Scarcity Engine</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-foreground">Total Seats *</label>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="50"
                        value={formData.totalSeats}
                        onChange={(e) => handleInputChange('totalSeats', e.target.value)}
                        className={`h-11 bg-background font-bold ${formErrors.totalSeats ? 'border-red-500' : ''}`}
                      />
                      {formErrors.totalSeats && <p className="text-[9px] text-red-500 font-bold mt-1">{formErrors.totalSeats}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-foreground">Available</label>
                      <Input 
                        type="number"
                        min="0"
                        placeholder="50"
                        value={formData.availableSeats}
                        onChange={(e) => handleInputChange('availableSeats', e.target.value)}
                        className="h-11 bg-background font-bold text-orange-600 dark:text-orange-400 border-orange-500/30 focus-visible:ring-orange-500/20"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveBatch} disabled={isSubmitting} className="w-full font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 h-12 shadow-sm rounded-xl">
                  {isSubmitting ? 'Saving...' : editingBatchId ? 'Update Configuration' : 'Publish To Live Website'}
                </Button>

              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="mt-0 focus-visible:outline-none focus:outline-none">
          {/* Layer 2: The Active Ledger Data Display Table */}
          <div className="space-y-6">
          <Card className="border-border/60 shadow-[0_4px_24px_rgba(var(--primary),0.04)]">
            <CardHeader className="pb-2 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-black tracking-tight uppercase">Active Program Ledger</CardTitle>
                <CardDescription className="text-xs">
                  Showing active system directories and dynamic installment bounds constraints.
                </CardDescription>
              </div>
              
              <div className="relative w-full sm:w-48 shrink-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/70" />
                <Input
                  placeholder="Search ledger..."
                  className="pl-8 h-9 text-xs bg-card border-muted/40 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-muted/20 font-black text-[10px] uppercase tracking-widest text-muted-foreground h-11">
                      <th className="px-4 py-2">Batch Tracker</th>
                      <th className="px-4 py-2">Anchor Fee</th>
                      <th className="px-4 py-2 text-center">Permitted Steps</th>
                      <th className="px-4 py-2 text-right">Operational Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="animate-pulse border-b border-muted/10 h-16">
                            <td className="px-4 py-2"><Skeleton className="h-4 w-40 mb-1" /><Skeleton className="h-3 w-20" /></td>
                            <td className="px-4 py-2"><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-3 w-16" /></td>
                            <td className="px-4 py-2"><div className="mx-auto w-20"><Skeleton className="h-7 w-full rounded-lg" /></div></td>
                            <td className="px-4 py-2 text-right"><div className="flex justify-end gap-2"><Skeleton className="h-8 w-16 rounded-md" /><Skeleton className="h-8 w-16 rounded-md" /><Skeleton className="h-8 w-8 rounded-md" /></div></td>
                          </tr>
                        ))
                      ) : filteredBatches.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground">
                            <BookOpen className="h-9 w-9 mx-auto opacity-40 mb-3" />
                            <h4 className="font-bold">No academic batches indexed</h4>
                            <p className="text-[11px] mt-1">Configure your first batch parameters on the left card panel.</p>
                          </td>
                        </tr>
                      ) : (
                        filteredBatches.map((batch) => (
                          <motion.tr 
                            key={batch.id} 
                            variants={itemVariants}
                            initial="hidden"
                            animate="show"
                            exit="hidden"
                            layout
                            className={`border-b border-muted/15 h-16 hover:bg-muted/10 transition-colors ${selectedSimBatch?.id === batch.id ? 'bg-primary/5' : ''}`}
                          >
                            <td className="px-4 py-2 max-w-[180px]">
                              <div className="flex items-center gap-3">
                                {batch.thumbnail && (
                                  <img src={batch.thumbnail} alt={batch.name} className="h-12 w-12 rounded-lg object-cover border border-border shrink-0" onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                                <div>
                                  <div className="font-black text-foreground text-sm line-clamp-1">{batch.name}</div>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/20 text-primary font-bold">
                                      {batch.durationMonths || batch.maxInstallments} Months
                                    </Badge>
                                    {batch.totalSeats && (
                                       <span className="text-[8px] font-bold text-muted-foreground/80 bg-muted px-1 py-0.5 rounded">
                                         {batch.availableSeats !== undefined ? batch.availableSeats : batch.totalSeats} / {batch.totalSeats} Seats
                                       </span>
                                    )}
                                    {batch.facultyAssign && (
                                       <span className="text-[8px] font-bold text-muted-foreground/80 bg-muted px-1 py-0.5 rounded truncate max-w-[60px]">
                                         {batch.facultyAssign}
                                       </span>
                                    )}
                                    {batch.description && (
                                      <span className="text-[10px] text-muted-foreground line-clamp-1 truncate w-full mt-0.5">{batch.description}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className="font-black text-foreground font-mono">₹{batch.totalBatchAmount.toLocaleString()}</span>
                              <div className="mt-0.5">
                                <Badge variant={batch.status === 'Active' ? 'success' : batch.status === 'Draft' ? 'warning' : 'destructive'} className="font-semibold text-[9px] px-1.5 py-0">
                                  {batch.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <div className="font-bold flex items-center justify-center gap-1.5 bg-muted/40 py-1 px-2.5 rounded-lg w-fit mx-auto border border-border/40 font-mono text-foreground">
                                <span>{batch.minInstallments}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-primary font-black text-[13px]">{batch.maxInstallments}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-1.5 flex-wrap">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setViewingBatchDetail(batch)}
                                  className="h-8 text-[11px] font-bold text-muted-foreground hover:text-primary hover:border-primary px-2 gap-1"
                                >
                                  <Eye className="h-3 w-3" /> View
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditInit(batch)}
                                  className="h-8 text-[11px] font-bold text-muted-foreground hover:text-amber-600 hover:border-amber-600 px-2 gap-1"
                                >
                                  <Edit className="h-3 w-3" /> Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setSelectedSimBatch(batch);
                                    setSimChosenInst(batch.minInstallments || 1);
                                    setSimStudentId('');
                                    setSimStudentName('');
                                    setActiveTab('simulator');
                                  }}
                                  className="h-8 text-[11px] font-bold text-primary border-primary/20 bg-primary/5 hover:bg-primary/15 px-2.5 gap-1 shadow-sm"
                                >
                                  <UserPlus className="h-3 w-3" /> Enroll
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleDeleteBatch(batch.id)}
                                  className="h-8 text-[11px] text-red-500 hover:bg-red-500/10 hover:text-red-600 px-2.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="simulator" className="mt-0 focus-visible:outline-none focus:outline-none">
        <div className="max-w-7xl mx-auto pb-12 mt-2">
          {!selectedSimBatch ? (
            <div className="flex flex-col items-center justify-center p-20 border border-dashed border-border rounded-[3rem] bg-muted/5 mt-12">
               <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mb-6">
                  <Calculator className="h-10 w-10 text-muted-foreground" />
               </div>
               <h3 className="text-2xl font-black tracking-tight">Simulator Standby</h3>
               <p className="text-sm text-muted-foreground max-w-sm text-center mt-3 leading-relaxed">
                 Please select an active program from the <span className="font-bold text-foreground italic">Ledger</span> and click <span className="text-primary font-bold">"Enroll"</span> to start a policy-aligned simulation.
               </p>
               <Button onClick={() => setActiveTab('ledger')} className="mt-8 bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest px-10 h-12 rounded-2xl shadow-xl">
                 Return to Ledger
               </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Simulator Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Calculator className="h-48 w-48 text-emerald-500" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] uppercase tracking-[0.3em] font-black">
                    <Sparkles className="h-3 w-3" /> Policy-Aware Billing Simulation Engine
                  </div>
                  <h2 className="text-3xl font-black mt-2 tracking-tight">
                    Enrolling Student in: <span className="text-primary">{selectedSimBatch.name}</span>
                  </h2>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Testing allocation for <span className="font-bold text-foreground">₹{((customEmiPrices[selectedSimBatch.id] || {})[simChosenInst] || selectedSimBatch.totalBatchAmount).toLocaleString()}</span> across {simChosenInst} installments.
                    </p>
                    {((customEmiPrices[selectedSimBatch.id] || {})[simChosenInst]) && (
                      <Badge className="bg-blue-500 text-white border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5">
                        Custom Pricing Applied
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Button 
                  onClick={() => setSelectedSimBatch(null)}
                  variant="ghost"
                  className="relative z-10 text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-widest flex items-center gap-1.5 self-start"
                >
                  <Trash2 className="h-3 w-3" /> Reset Engine
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* SIMULATOR CONTROLS */}
                <div className="bg-card/40 border border-muted/30 backdrop-blur-md rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <UserPlus className="h-3 w-3" /> Enrollment Attributes
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between items-center">
                      Target Student ID
                      {simLookupLoading && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                    </label>
                    <Input 
                      placeholder="ENTER STUDENT ID..."
                      value={simStudentId}
                      onChange={(e) => setSimStudentId(e.target.value.toUpperCase())}
                      className="font-black h-12 bg-card border-muted/40 uppercase tracking-widest rounded-xl text-sm"
                    />
                    {simStudentName && (
                      <div className={`text-[10px] font-bold px-3 py-2 rounded-lg mt-2 flex items-center gap-2 ${simStudentName === 'Student Not Found' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {simStudentName === 'Student Not Found' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        {simStudentName}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                      <span>Installment Count</span>
                      <span className="text-emerald-500 font-black">{simChosenInst} Parts</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from(
                        { length: (selectedSimBatch.maxInstallments || 1) - (selectedSimBatch.minInstallments || 1) + 1 }, 
                        (_, i) => (selectedSimBatch.minInstallments || 1) + i
                      ).map((num) => {
                        const hasPolicy = !!(emiSchemes[selectedSimBatch.id] || {})[num];
                        return (
                          <button
                            key={num}
                            onClick={() => setSimChosenInst(num)}
                            className={`h-11 rounded-xl text-xs font-black transition-all flex flex-col items-center justify-center relative ${simChosenInst === num ? 'bg-emerald-500 text-white shadow-lg' : 'bg-card border border-muted/40 text-muted-foreground hover:bg-muted/10'}`}
                          >
                            {num}
                            {hasPolicy && (
                              <div className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[9px] text-muted-foreground italic mt-3 leading-tight opacity-70">
                      * Dots indicate enrollment distributions governed by custom EMI policies.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-muted/20">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Settlement Total</span>
                       <span className="text-lg font-black">₹{((customEmiPrices[selectedSimBatch.id] || {})[simChosenInst] || selectedSimBatch.totalBatchAmount).toLocaleString()}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Adjusted per batch-specific pricing rules.</p>
                  </div>

                  <Button 
                    onClick={handleSimulateEnrollment}
                    disabled={simulatingEnrollment || !simStudentName || simStudentName === 'Student Not Found'}
                    className="w-full h-14 text-[10px] uppercase tracking-[0.2em] font-black gap-2 shadow-xl bg-emerald-500 hover:bg-emerald-600 border-none text-black transition-all disabled:opacity-50 disabled:grayscale rounded-2xl group"
                  >
                    {simulatingEnrollment ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />}
                    {simulatingEnrollment ? 'Enrolling...' : 'Trigger Automated Accounting'}
                  </Button>
                </div>
                
                {/* PREVIEW AREA */}
                <div className="lg:col-span-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Generated Scheduled Installments Preview
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {(() => {
                      const effectiveTotal = (customEmiPrices[selectedSimBatch.id] || {})[simChosenInst] || selectedSimBatch.totalBatchAmount;
                      const policyPercentages = (emiSchemes[selectedSimBatch.id] || {})[simChosenInst];
                      
                      return Array.from({ length: simChosenInst }).map((_, idx) => {
                        let amount = Math.floor(effectiveTotal / simChosenInst);
                        if (policyPercentages && policyPercentages[idx] !== undefined) {
                          amount = Math.floor((effectiveTotal * policyPercentages[idx]) / 100);
                        } else if (idx === 0) {
                          // Remainder logic
                          const standard = Math.floor(effectiveTotal / simChosenInst);
                          amount = effectiveTotal - (standard * (simChosenInst - 1));
                        }
                        
                        return (
                          <div key={idx} className="bg-card/40 border border-muted/30 backdrop-blur-md rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                            <Badge className="absolute top-6 right-6 text-[8px] font-black bg-orange-500/10 text-orange-600 border-orange-500/20 tracking-widest">UNPAID</Badge>
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Installment #{idx + 1}</div>
                            <div className="text-3xl font-black text-foreground mb-6 font-mono">₹{amount.toLocaleString()}</div>
                            
                            <div className="space-y-2 border-t border-muted/20 pt-6">
                               <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                 <Calendar className="h-3 w-3 text-emerald-500" /> Due {new Date(Date.now() + (idx * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                               </div>
                               {policyPercentages && (
                                 <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                                    <Percent className="h-3 w-3" /> Weighted Policy: {policyPercentages[idx]}%
                                 </div>
                               )}
                               <div className="text-[10px] text-muted-foreground font-medium truncate opacity-60">Recipient: <span className="text-foreground font-bold">{simStudentName}</span></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
        <TabsContent value="installments" className="mt-0 focus-visible:outline-none focus:outline-none">
          <div className="max-w-6xl mx-auto pb-12 mt-2">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                 <Percent className="h-6 w-6 text-indigo-500" />
                 EMI Policies & Allocations
               </h2>
               <p className="text-sm font-medium text-muted-foreground hidden sm:block">
                 Customize revenue distribution strictly for available payment plans.
               </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Batch Sidebar Selection */}
              <div className="lg:col-span-4 space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-muted/50 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Select Batch</span>
                </div>
                {batches.length === 0 ? (
                  <p className="text-sm font-medium text-muted-foreground p-4 text-center border border-dashed rounded-xl">No active batches</p>
                ) : (
                  batches.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => setSelectedBatchForEmi(batch.id)}
                      className={`w-full text-left p-4 rounded-xl border flex flex-col gap-2 transition-all ${selectedBatchForEmi === batch.id ? 'bg-indigo-50/50 border-indigo-500/50 ring-1 ring-indigo-500 shadow-sm' : 'bg-background hover:bg-muted/30 border-border/60'}`}
                    >
                      <h3 className="font-bold text-sm tracking-tight text-foreground line-clamp-1">{batch.name}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                        <span>₹{batch.totalBatchAmount.toLocaleString()}</span>
                        <span>{batch.minInstallments} - {batch.maxInstallments} EMIs</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Installment Scheme Configurator */}
              <div className="lg:col-span-8">
                {selectedBatchForEmi ? (
                  <div className="bg-background border border-border/60 rounded-2xl p-6 shadow-sm">
                    {(() => {
                      const batch = batches.find(b => b.id === selectedBatchForEmi);
                      if (!batch) return null;
                      
                      const min = batch.minInstallments || 1;
                      const max = batch.maxInstallments || 1;
                      const currentEmiConfig = emiSchemes[batch.id] || {};
                      
                      const availablePlans = [];
                      for (let i = min; i <= max; i++) {
                         availablePlans.push(i);
                      }

                      if (availablePlans.length === 0) {
                         return <p className="text-sm">Config error</p>;
                      }

                      return (
                        <div className="space-y-8">
                          <div className="mb-2">
                             <h3 className="font-black text-lg">{batch.name}</h3>
                             <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 font-bold">Configure Percentage Distributions</p>
                          </div>
                          
                          {availablePlans.map(planNum => {
                             const currentPercents = currentEmiConfig[planNum] || Array(planNum).fill(Math.floor(100 / planNum));
                             const totalPercent = currentPercents.reduce((a: number,c: number) => a + (Number(c) || 0), 0);
                             
                             return (
                               <div key={planNum} className="space-y-4 p-5 rounded-xl border border-muted bg-muted/10">
                                 <div className="flex items-center justify-between border-b pb-3 border-border/50">
                                   <div>
                                     <h4 className="font-bold text-sm">{planNum} Installment{planNum > 1 ? 's' : ''} Plan</h4>
                                     <p className="text-xs text-muted-foreground mt-0.5">Customize pricing and percentage splits.</p>
                                   </div>
                                   <div className={`text-[10px] font-mono font-black px-2 py-1 rounded-full ${totalPercent === 100 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                     Split: {totalPercent}%
                                   </div>
                                 </div>

                                 <div className="space-y-1.5 pt-1">
                                    <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
                                      <span>Custom Total Price (₹)</span>
                                      <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded border border-border/60">Default: ₹{batch.totalBatchAmount.toLocaleString()}</span>
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                                      <Input 
                                        type="number"
                                        placeholder={batch.totalBatchAmount.toString()}
                                        value={customEmiPrices[batch.id]?.[planNum] || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setCustomEmiPrices(prev => {
                                                const next = { ...prev };
                                                if (!next[batch.id]) next[batch.id] = {};
                                                if (val === '') {
                                                    delete next[batch.id][planNum];
                                                } else {
                                                    next[batch.id][planNum] = Number(val);
                                                }
                                                localStorage.setItem('emiCustomPrices', JSON.stringify(next));
                                                return next;
                                            });
                                        }}
                                        className="h-10 pl-8 font-mono text-sm border-muted-foreground/30 focus-visible:ring-indigo-500/30 bg-background"
                                      />
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                                   {Array.from({length: planNum}).map((_, idx) => (
                                      <div key={idx} className="space-y-1.5">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">EMI {idx + 1}</label>
                                        <div className="relative">
                                          <Input 
                                            type="number"
                                            min="0" max="100"
                                            value={currentPercents[idx]}
                                            onChange={(e) => {
                                               const val = Number(e.target.value);
                                               const next = [...currentPercents];
                                               next[idx] = val;
                                               setEmiSchemes(prev => {
                                                  const newSchemes = { ...prev };
                                                  if (!newSchemes[batch.id]) newSchemes[batch.id] = {};
                                                  newSchemes[batch.id][planNum] = next;
                                                  localStorage.setItem('emiConfigData', JSON.stringify(newSchemes));
                                                  return newSchemes;
                                               });
                                            }}
                                            className="h-10 pr-8 bg-background font-mono text-sm border-muted-foreground/30 focus-visible:ring-indigo-500/30"
                                          />
                                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-black">%</span>
                                        </div>
                                      </div>
                                   ))}
                                 </div>
                                 {totalPercent !== 100 && (
                                   <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1.5">
                                     <AlertCircle className="h-3 w-3" /> Warning: The total percentage for this plan must equal exactly 100%. Currently it is {totalPercent}%.
                                   </p>
                                 )}
                               </div>
                             );
                          })}
                          <div className="pt-4 flex justify-end">
                             <Button 
                               onClick={() => handleSaveEmiPolicies(batch.id)}
                               className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                             >
                               Confirm & Apply to Enrollments
                             </Button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="h-full min-h-[400px] border border-dashed border-border/80 rounded-2xl flex flex-col items-center justify-center p-8 bg-muted/10 text-center">
                    <Calculator className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-bold text-foreground">No Batch Selected</h3>
                    <p className="text-sm font-medium text-muted-foreground max-w-sm mt-1">Select a batch from the sidebar to configure customized EMI split percentages for its available plans.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Gateway UPI QR Dialog Modal */}
      <Dialog open={!!payingInvoice} onOpenChange={() => { if(!qrLoading) setPayingInvoice(null); }}>
        <DialogContent className="sm:max-w-md bg-background border-border p-0 overflow-hidden">
          <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          
          <DialogHeader className="pt-6 px-6 pb-2">
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-500" /> secure dynamic UPI qr
            </DialogTitle>
            <DialogDescription className="text-xs">
              Securely synchronized webhook pipeline through gateway sandbox environments.
            </DialogDescription>
          </DialogHeader>

          {payingInvoice && (
            <div className="px-6 py-4 space-y-5">
              
              <div className="bg-muted/40 p-4 rounded-xl border border-muted-foreground/15 text-center leading-snug space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ledger Invoice Amount</span>
                <p className="text-2xl font-black text-foreground font-mono">₹{payingInvoice.amount.toLocaleString()}</p>
                <div className="text-[10px] text-muted-foreground truncate flex items-center justify-center gap-1 mt-1 font-mono">
                  <span>ID: {payingInvoice.id}</span>
                  <span className="text-muted-foreground/45">•</span>
                  <span>Student: {payingInvoice.studentName}</span>
                </div>
              </div>

              {qrLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground font-mono">Generating Gateway QR Token...</p>
                </div>
              ) : qrPayload ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  
                  {/* Dynamic Interactive UPI QR Code SVG */}
                  <div className="bg-white p-4 rounded-xl border border-muted/30 shadow-md">
                    <QRCodeSVG 
                      value={qrPayload.paymentUrl} 
                      size={180} 
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-500 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      {qrPayload.mode === 'live' ? 'Razorpay Live active' : 'Razorpay Sandbox active'}
                    </span>
                    <p className="text-[10px] text-muted-foreground/80 leading-relaxed max-w-sm mt-1.5 font-mono">
                      This UPI token is strictly <strong className="text-foreground">fixed_amount: true</strong> and <strong className="text-foreground">usage: "single_use"</strong>. Any manual payer inflation is secure-blocked.
                    </p>
                  </div>

                  {/* Webhook captured event generator simulation */}
                  <div className="w-full pt-4 border-t border-muted/15 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      simulate payment status listener
                    </div>
                    
                    <Button 
                      onClick={handleSimulateWebhookPaid}
                      disabled={simulatingWebhook || payingInvoice.status === 'PAID'}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest text-xs h-11 gap-1.5 transition-all shadow-md"
                    >
                      <Send className="h-4 w-4" />
                      {simulatingWebhook ? 'Captured Webhook Dispatching...' : payingInvoice.status === 'PAID' ? 'Payment Captured Success' : 'Simulate UPI Payment Webhook'}
                    </Button>
                    
                    <p className="text-[9px] text-muted-foreground/75 leading-tight font-mono">
                      Triggers instant <strong className="text-foreground">POST /api/webhooks/payments</strong> captured webhook event payload directly, triggering backend state record mutation instantly.
                    </p>
                  </div>

                </div>
              ) : (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" /> Failed to dispatch gateway handshake.
                </div>
              )}

            </div>
          )}

          <DialogFooter className="px-6 py-4 bg-muted/10 border-t border-muted/20">
            <Button 
              variant="outline" 
              onClick={() => setPayingInvoice(null)} 
              disabled={qrLoading}
              className="font-bold text-xs w-full"
            >
              Close Ledger Dialog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Details Dialog */}
      <Dialog open={!!viewingBatchDetail} onOpenChange={(open) => !open && setViewingBatchDetail(null)}>
        <DialogContent className="sm:max-w-3xl min-h-[50vh] bg-background border-border p-0 overflow-hidden shadow-2xl">
          <div className="h-2 w-full bg-blue-500"></div>
          {viewingBatchDetail && (
            <>
              <DialogHeader className="pt-6 px-6 pb-2 border-b border-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                      {viewingBatchDetail.name}
                      <Badge variant={viewingBatchDetail.status === 'Active' ? 'success' : viewingBatchDetail.status === 'Draft' ? 'warning' : 'destructive'} className="font-semibold text-[10px] px-2 uppercase tracking-wide">
                        {viewingBatchDetail.status}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="mt-1.5 text-sm">
                      {viewingBatchDetail.description || 'No description provided.'}
                    </DialogDescription>
                  </div>
                  {viewingBatchDetail.thumbnail && (
                    <img src={viewingBatchDetail.thumbnail} alt="Batch Thumbnail" className="h-28 w-28 rounded-2xl object-cover border-2 border-border shadow-md shrink-0" />
                  )}
                </div>
              </DialogHeader>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* Financial & Seat Status */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                       Financial & Capacity
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Total Fee</span>
                        <span className="font-black font-mono text-base">₹{Number(viewingBatchDetail.totalBatchAmount).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Installment Bounds</span>
                        <span className="font-bold bg-muted/40 px-2 py-0.5 rounded font-mono border border-border/50">
                           {viewingBatchDetail.minInstallments} - {viewingBatchDetail.maxInstallments}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Duration</span>
                        <span className="font-bold">{viewingBatchDetail.durationMonths} Months</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Seats Available</span>
                        <span className="font-bold text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                          {viewingBatchDetail.availableSeats !== undefined ? viewingBatchDetail.availableSeats : viewingBatchDetail.totalSeats} / {viewingBatchDetail.totalSeats || '∞'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Program Classification */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                       Program Classification
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Subject</span>
                        <span className="font-bold">{viewingBatchDetail.subject || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Stream / Class</span>
                        <span className="font-bold">{viewingBatchDetail.streamCategory || 'Not Set'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Target Board</span>
                        <span className="font-bold px-2 py-0.5 rounded bg-muted">
                           {viewingBatchDetail.boardTarget || 'Not Set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Medium</span>
                        <span className="font-bold">{viewingBatchDetail.teachingMedium || 'Not Set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operation Info */}
                  <div className="space-y-4 md:col-span-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                       Operational Info
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Batch Mode</span>
                        <span className="font-bold text-sm">{viewingBatchDetail.batchMode || 'Not Set'}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Timing / Shift</span>
                        <span className="font-bold text-sm">{viewingBatchDetail.timing || 'Not Set'}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-border/60 bg-muted/20">
                        <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Faculty</span>
                        <span className="font-bold text-sm truncate max-w-full block" title={viewingBatchDetail.facultyAssign}>
                           {viewingBatchDetail.facultyAssign || 'Not Assigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Curriculum Details */}
                  {viewingBatchDetail.curriculumModules && (
                    <div className="space-y-4 md:col-span-2 mt-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 border-b border-border/50 pb-2">
                         Curriculum Modules ({(() => {
                           try {
                             const modules = typeof viewingBatchDetail.curriculumModules === 'string'
                               ? JSON.parse(viewingBatchDetail.curriculumModules)
                               : (Array.isArray(viewingBatchDetail.curriculumModules) ? viewingBatchDetail.curriculumModules : []);
                             return modules.length;
                           } catch(e) {
                             return 0;
                           }
                         })()})
                      </h4>
                      <div className="max-h-[160px] overflow-y-auto pr-2 space-y-2 relative scrollbar-thin">
                        {(() => {
                           try {
                             const modules = typeof viewingBatchDetail.curriculumModules === 'string'
                               ? JSON.parse(viewingBatchDetail.curriculumModules)
                               : (Array.isArray(viewingBatchDetail.curriculumModules) ? viewingBatchDetail.curriculumModules : []);
                             if (modules.length === 0) return <p className="text-sm text-muted-foreground">No modules added.</p>;
                             return modules.map((mod: any, idx: number) => (
                              <div key={idx} className="flex gap-3 text-sm p-3 rounded-lg border border-border/40 bg-muted/10 items-start">
                                <div className="font-mono text-muted-foreground font-black text-xs pt-0.5">{String(idx + 1).padStart(2, '0')}</div>
                                <div>
                                  <div className="font-bold text-foreground mb-0.5">{mod.title || 'Untitled Module'}</div>
                                  {mod.topics && <div className="text-xs text-muted-foreground">{mod.topics}</div>}
                                </div>
                              </div>
                            ));
                          } catch(e) {
                            return <p className="text-sm text-muted-foreground">Invalid curriculum format.</p>;
                          }
                        })()}
                      </div>
                    </div>
                  )}

                </div>
              </div>
              <DialogFooter className="px-6 py-4 bg-muted/10 border-t border-muted/20">
                <Button variant="outline" onClick={() => setViewingBatchDetail(null)} className="w-full sm:w-auto font-bold">Close Details</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Stream Categories Dialog */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border p-0 overflow-hidden">
          <div className="h-2 w-full bg-blue-500"></div>
          <DialogHeader className="pt-6 px-6 pb-2">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Manage Stream Categories
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="New Category Name"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="h-10 bg-background"
              />
              <Button onClick={handleAddCategory} className="h-10 font-bold bg-blue-600 text-white">Add</Button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {streamCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center p-3 border border-border rounded-lg">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-600 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {streamCategories.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">No categories added</p>}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-muted/10 border-t border-muted/20">
            <Button variant="outline" onClick={() => setIsManageCategoriesOpen(false)} className="w-full">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
