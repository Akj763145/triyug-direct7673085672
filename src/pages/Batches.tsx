import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen, 
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
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

// Interfaces aligning with Prisma/Express Backends
interface Batch {
  id: string;
  name: string;
  description?: string;
  totalBatchAmount: number;
  minInstallments: number;
  maxInstallments: number;
  status: 'Active' | 'Archived' | 'Draft';
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
  
  // Setup Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalBatchAmount: '',
    minInstallments: '1',
    maxInstallments: '1',
    status: 'Active' as const
  });
  
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiSuccessMsg, setApiSuccessMsg] = useState('');

  // Simulation Hub states
  const [selectedSimBatch, setSelectedSimBatch] = useState<Batch | null>(null);
  const [simStudentName, setSimStudentName] = useState('Rahul Sharma');
  const [simChosenInst, setSimChosenInst] = useState<number>(1);
  const [simulatingEnrollment, setSimulatingEnrollment] = useState(false);
  
  // Gateway QR Drawer state
  const [payingInvoice, setPayingInvoice] = useState<SimulatedInvoice | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchInvoices();
  }, []);

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
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, val: string) => {
    const updated = { ...formData, [field]: val };
    setFormData(updated);
    validateField(field, val);
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
          status: 'Active'
        });
        setEditingBatchId(null);
        setFormErrors({});
        
        // Refetch active datasets
        await fetchBatches();
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
      minInstallments: batch.minInstallments.toString(),
      maxInstallments: batch.maxInstallments.toString(),
      status: batch.status
    });
    setFormErrors({});
    setApiSuccessMsg('');
    
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
      status: 'Active'
    });
    setFormErrors({});
    setApiSuccessMsg('');
  };

  const handleSimulateEnrollment = async () => {
    if (!selectedSimBatch) return;
    setSimulatingEnrollment(true);
    
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: `STU-SIM-${Math.floor(Math.random() * 100000)}`,
          studentName: simStudentName,
          batchId: selectedSimBatch.id,
          chosenInstallments: simChosenInst
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

      {/* Main Administrative Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Layer 1: Management Control Form card (Spans 5 columns) */}
        <div className="lg:col-span-5">
          <Card className="border-border/60 shadow-[0_4px_24px_rgba(var(--primary),0.04)] overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary to-blue-500"></div>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">
                {editingBatchId ? 'Edit Configuration' : 'Setup Financial Rules'}
              </CardTitle>
              <CardDescription className="text-xs">
                Launch programs with strict currency anchors and secure monthly partitions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBatch} className="space-y-5">
                
                {/* Batch Name Input with Validation highlight */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                    Batch Name <span className="text-red-500">*</span>
                  </label>
                  <Input 
                    placeholder="e.g. JEE Intensive Crash Course 2026"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`h-11 font-bold text-sm bg-card/60 transition-all focus-visible:ring-primary/20 ${formErrors.name ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-muted/40'}`}
                  />
                  {formErrors.name && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Description Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Description / Syllabus Accent
                  </label>
                  <Input 
                    placeholder="e.g. 6-Month Fasttrack JEE Prep including Mock Tests"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="h-11 text-xs bg-card/60 border-muted/40 focus-visible:ring-primary/20"
                  />
                </div>

                {/* Financial Anchor Input (Total Fee) */}
                <div className="space-y-2 p-4 rounded-xl border border-primary/25 bg-primary/5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5" /> Total Batch Anchor Fee <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed mb-2">
                    Enforced static sum. Individual installments always compile back to this precise total.
                  </p>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground/70 font-bold text-sm">
                      ₹
                    </div>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      value={formData.totalBatchAmount}
                      onChange={(e) => handleInputChange('totalBatchAmount', e.target.value)}
                      className={`pl-8 font-black text-lg bg-background transition-all focus-visible:ring-primary/20 ${formErrors.totalBatchAmount ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-muted/40'}`}
                    />
                  </div>
                  {formErrors.totalBatchAmount && (
                    <p className="text-[10px] font-bold text-red-500 mt-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {formErrors.totalBatchAmount}
                    </p>
                  )}
                </div>

                {/* Parallel installment number selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Min Installments <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number"
                      min="1"
                      value={formData.minInstallments}
                      onChange={(e) => handleInputChange('minInstallments', e.target.value)}
                      className={`font-black text-center h-11 bg-card/60 transition-all focus-visible:ring-primary/20 ${formErrors.minInstallments ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-muted/40'}`}
                    />
                    {formErrors.minInstallments ? (
                      <p className="text-[9px] font-bold text-red-500 mt-1 leading-tight">{formErrors.minInstallments}</p>
                    ) : (
                      <p className="text-[9px] text-muted-foreground/75 leading-tight">Must be ≥ 1 upfront transaction.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Max Installments <span className="text-red-500">*</span>
                    </label>
                    <Input 
                      type="number"
                      min="1"
                      value={formData.maxInstallments}
                      onChange={(e) => handleInputChange('maxInstallments', e.target.value)}
                      className={`font-black text-center h-11 bg-card/60 transition-all focus-visible:ring-primary/20 ${formErrors.maxInstallments ? 'border-red-500 focus-visible:border-red-500 ring-2 ring-red-500/10' : 'border-muted/40'}`}
                    />
                    {formErrors.maxInstallments ? (
                      <p className="text-[9px] font-bold text-red-500 mt-1 leading-tight">{formErrors.maxInstallments}</p>
                    ) : (
                      <p className="text-[9px] text-muted-foreground/75 leading-tight">Installment bounds ceiling threshold.</p>
                    )}
                  </div>
                </div>

                {/* Status selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Deploy Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Active', 'Draft', 'Archived'] as const).map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => handleInputChange('status', s)}
                        className={`py-2 px-1 text-xs font-black uppercase tracking-wider rounded-lg border transition-all ${formData.status === s ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-background border-muted/40 text-muted-foreground hover:bg-muted/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  {editingBatchId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={handleCancelEdit} 
                      className="flex-1 font-bold h-11 text-xs shrink-0"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 font-black uppercase tracking-wider text-xs h-11"
                  >
                    {isSubmitting ? 'Securing Config...' : editingBatchId ? 'Apply Rules' : 'Launch Batch'}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>

        {/* Layer 2: The Active Ledger Data Display Table (Spans 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
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
                    {loading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="animate-pulse border-b border-muted/10 h-14">
                          <td className="px-4 py-2"><div className="h-4 bg-muted w-3/4 rounded"></div></td>
                          <td className="px-4 py-2"><div className="h-4 bg-muted w-1/2 rounded"></div></td>
                          <td className="px-4 py-2"><div className="h-4 bg-muted w-1/3 mx-auto rounded"></div></td>
                          <td className="px-4 py-2"><div className="h-4 bg-muted w-1/2 ml-auto rounded"></div></td>
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
                        <tr 
                          key={batch.id} 
                          className={`border-b border-muted/15 h-16 hover:bg-muted/10 transition-colors ${selectedSimBatch?.id === batch.id ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-2 max-w-[180px]">
                            <div className="font-black text-foreground text-sm line-clamp-1">{batch.name}</div>
                            {batch.description ? (
                              <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{batch.description}</div>
                            ) : (
                              <div className="text-[10px] text-muted-foreground/50 italic mt-0.5">No syllabus accents</div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-black text-foreground font-mono">₹{batch.totalBatchAmount.toLocaleString()}</span>
                            <div className="mt-0.5">
                              <Badge variant={batch.status === 'Active' ? 'success' : batch.status === 'Draft' ? 'secondary' : 'destructive'} className="font-semibold text-[9px] px-1.5 py-0">
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
                                onClick={() => handleEditInit(batch)}
                                className="h-8 text-[11px] font-bold text-muted-foreground hover:text-primary hover:border-primary px-2 gap-1"
                              >
                                <Edit className="h-3 w-3" /> Config
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSelectedSimBatch(batch);
                                  setSimChosenInst(batch.minInstallments);
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Simulator Layer: Enrollment Billing Schedules & Razorpay dynamic UPI endpoint */}
      <AnimatePresence>
        {selectedSimBatch && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 15 }}
          >
            <Card className="border-primary/20 bg-muted/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setSelectedSimBatch(null)} 
                  className="font-bold text-xs"
                >
                  ✕ Close Simulator
                </Button>
              </div>

              <CardHeader className="pb-4">
                <span className="text-primary font-mono text-[10px] uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-yellow-500" /> Interactive Billing Simulation Engine
                </span>
                <CardTitle className="text-xl font-black text-foreground">
                  Enroll Student in Program: <span className="text-primary">{selectedSimBatch.name}</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Runs dynamic divide calculations. Splitting ₹{selectedSimBatch.totalBatchAmount.toLocaleString()} safely across preferred installment increments.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                
                {/* Simulator Inputs (Col spans 4) */}
                <div className="md:col-span-4 bg-background/80 backdrop-blur border border-border p-5 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground border-b border-muted/20 pb-2">
                    Enrollment Attributes
                  </h4>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Student Full Name
                    </label>
                    <Input 
                      value={simStudentName}
                      onChange={(e) => setSimStudentName(e.target.value)}
                      className="font-bold h-10 bg-card border-muted/40"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between">
                      Selected Installments Count 
                      <span className="text-primary font-black font-mono">
                        {simChosenInst} Parts
                      </span>
                    </label>
                    <div className="flex gap-1.5 items-center bg-muted p-1 rounded-xl border border-muted-foreground/10">
                      {Array.from(
                        { length: selectedSimBatch.maxInstallments - selectedSimBatch.minInstallments + 1 }, 
                        (_, i) => selectedSimBatch.minInstallments + i
                      ).map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setSimChosenInst(count)}
                          className={`flex-1 py-2 px-1 text-xs font-black font-mono rounded-lg transition-all ${simChosenInst === count ? 'bg-primary text-primary-foreground shadow-md font-extrabold scaling-hover' : 'hover:bg-muted-foreground/10 text-muted-foreground'}`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/80 leading-snug">
                      Constrained strictly by Batch criteria: [Min: <span className="font-bold font-mono">{selectedSimBatch.minInstallments}</span>, Max: <span className="font-bold font-mono">{selectedSimBatch.maxInstallments}</span>]
                    </p>
                  </div>

                  <Button 
                    onClick={handleSimulateEnrollment}
                    disabled={simulatingEnrollment}
                    className="w-full h-11 text-xs uppercase tracking-widest font-black gap-2 mt-2 shadow-md bg-emerald-500 hover:bg-emerald-600 border-none text-black transition-all"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                    {simulatingEnrollment ? 'Enrolling Ledger Plan...' : 'Trigger Automated Accounting'}
                  </Button>
                </div>

                {/* Simulated Scheduled Invoices (Col spans 8) */}
                <div className="md:col-span-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Generated Scheduled Installments
                    </h4>
                    <span className="text-[10px] font-bold text-muted-foreground italic font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      Math.floor Remainder added to first installment
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {invoices.filter(i => i.enrollmentId.startsWith('ENR-')).length === 0 ? (
                      <div className="col-span-full py-12 text-center bg-background p-6 rounded-2xl border border-dashed border-border text-muted-foreground">
                        <ArrowRight className="h-7 w-7 mx-auto opacity-40 mb-2 rotate-90 sm:rotate-0 animate-bounce" />
                        <h4 className="font-bold">No dynamic schedules generated yet</h4>
                        <p className="text-[10px] mt-0.5">Click "Trigger Automated Accounting" to compile student invoices.</p>
                      </div>
                    ) : (
                      invoices
                        .filter(i => i.enrollmentId.startsWith('ENR-'))
                        .map((inv) => (
                          <div 
                            key={inv.id}
                            className={`border bg-background p-4 rounded-xl shadow-xs border-border flex flex-col justify-between h-40 hover:shadow-md transition-shadow relative overflow-hidden group ${inv.status === 'PAID' ? 'ring-2 ring-emerald-500/20' : ''}`}
                          >
                            <div className="absolute top-2 right-2">
                              <Badge variant={inv.status === 'PAID' ? 'success' : 'destructive'} className="font-black text-[9px] font-mono tracking-widest uppercase">
                                {inv.status === 'PAID' ? 'PAID' : 'UNPAID'}
                              </Badge>
                            </div>
                            
                            <div>
                              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1">
                                Installment #{inv.installmentNo}
                              </div>
                              <div className="font-black text-lg font-mono text-foreground mt-2">
                                ₹{inv.amount.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-muted-foreground/80 mt-1 flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3 text-muted-foreground" /> Due: {inv.dueDate}
                              </div>
                              <div className="text-[9px] text-muted-foreground font-mono mt-1 line-clamp-1">
                                Student: {inv.studentName}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-muted/15 flex justify-between items-center">
                              <span className="text-[9px] font-mono font-bold text-muted-foreground truncate max-w-[120px]">{inv.id}</span>
                              {inv.status !== 'PAID' ? (
                                <button
                                  type="button"
                                  onClick={() => handleGenerateInvoiceQR(inv)}
                                  className="text-[10px] font-bold text-primary hover:text-primary-foreground hover:bg-primary px-2.5 py-1.5 rounded-lg border border-primary/20 hover:border-primary flex items-center gap-1 transition-all"
                                >
                                  <QrCode className="h-3 w-3" /> Pay Gateway
                                </button>
                              ) : (
                                <span className="font-black font-mono text-[10px] text-emerald-500 flex items-center gap-0.5">
                                  <CheckCircle className="h-3 w-3 shrink-0" /> Verified
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                  
                  {invoices.filter(i => i.enrollmentId.startsWith('ENR-')).length > 0 && (
                    <div className="bg-background/40 p-3 rounded-lg flex items-center justify-between text-[10px] font-mono border border-border text-muted-foreground">
                      <span>Total Sum check:</span>
                      <span className="font-black text-foreground">
                        ₹{invoices.filter(i => i.enrollmentId.startsWith('ENR-')).reduce((a,c) => a + c.amount, 0).toLocaleString()} / ₹{selectedSimBatch.totalBatchAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
    </div>
  );
}
