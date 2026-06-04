import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../components/ui/card";
import { IndianRupee, X, Calendar, User, Send, FileText, CheckCircle2, Search, MessageCircle } from "lucide-react";
import { api, apiCache } from "../lib/api";
import { Invoice } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { isSameMonth, subMonths, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export function Fees() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return (apiCache.get('invoices')?.data || []) as Invoice[];
  });
  const [loading, setLoading] = useState(() => !apiCache.has('invoices'));
  const [selectedList, setSelectedList] = useState<'collected' | 'overdue' | null>(null);

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentModeInput, setPaymentModeInput] = useState<string>("Cash");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("All");
  const [dateFilterType, setDateFilterType] = useState<'all' | 'month' | 'date'>('all');
  const [dateFilterValue, setDateFilterValue] = useState<string>('');

  const [batchFilter, setBatchFilter] = useState<string>("All");
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([]);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<Invoice | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [invoicesData, batchesData] = await Promise.all([
        api.getInvoices(),
        api.getBatches()
      ]);
      if (invoicesData) {
        setInvoices(invoicesData as Invoice[]);
      }
      if (batchesData) {
        setBatches(batchesData as { id: string; name: string }[]);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('fees-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Lists for display
  const overdueInvoices = useMemo(() => invoices.filter(i => 
    i.status === 'Overdue' || 
    (i.status !== 'Paid' && new Date(i.dueDate) < new Date())
  ), [invoices]);
  
  const collectedInvoices = useMemo(() => invoices.filter(i => 
    i.status === 'Paid'
  ), [invoices]);

  const filteredCollectedInvoices = useMemo(() => {
    return collectedInvoices.filter(i => {
      const matchesSearch = !search || 
        i.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        i.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        i.category?.toLowerCase().includes(search.toLowerCase()) ||
        i.amount.toString().includes(search) ||
        i.studentContact?.toLowerCase().includes(search.toLowerCase()) ||
        i.studentWhatsapp?.toLowerCase().includes(search.toLowerCase());
      
      const matchesPaymentMode = paymentModeFilter === "All" || i.paymentMethod === paymentModeFilter;
      const matchesBatch = batchFilter === "All" || (i.batchIds && i.batchIds.includes(batchFilter));
      
      let matchesDate = true;
      if (dateFilterType === 'month' && dateFilterValue) {
        matchesDate = i.dueDate.startsWith(dateFilterValue);
      } else if (dateFilterType === 'date' && dateFilterValue) {
        matchesDate = i.dueDate.startsWith(dateFilterValue);
      }
      
      return matchesSearch && matchesPaymentMode && matchesDate && matchesBatch;
    });
  }, [collectedInvoices, search, paymentModeFilter, dateFilterType, dateFilterValue, batchFilter]);

  const filteredOverdueInvoices = useMemo(() => {
    return overdueInvoices.filter(i => {
      const matchesSearch = !search || 
        i.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        i.studentId?.toLowerCase().includes(search.toLowerCase()) ||
        i.category?.toLowerCase().includes(search.toLowerCase()) ||
        i.amount.toString().includes(search) ||
        i.studentContact?.toLowerCase().includes(search.toLowerCase()) ||
        i.studentWhatsapp?.toLowerCase().includes(search.toLowerCase());

      const matchesPaymentMode = paymentModeFilter === "All" || i.paymentMethod === paymentModeFilter;
      const matchesBatch = batchFilter === "All" || (i.batchIds && i.batchIds.includes(batchFilter));
      
      let matchesDate = true;
      if (dateFilterType === 'month' && dateFilterValue) {
        matchesDate = i.dueDate.startsWith(dateFilterValue);
      } else if (dateFilterType === 'date' && dateFilterValue) {
        matchesDate = i.dueDate.startsWith(dateFilterValue);
      }
      
      return matchesSearch && matchesPaymentMode && matchesDate && matchesBatch;
    });
  }, [overdueInvoices, search, paymentModeFilter, dateFilterType, dateFilterValue, batchFilter]);

  // Analytics Calculations
  const metrics = useMemo(() => {
    const totalCollected = filteredCollectedInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalOverdue = filteredOverdueInvoices.reduce((acc, curr) => acc + curr.amount, 0);

    const now = new Date();
    // MoM comparison for collected
    const thisMonthCollected = filteredCollectedInvoices.filter(i => isSameMonth(new Date(i.dueDate), now)).reduce((a,b) => a+b.amount, 0);
    const lastMonthCollected = filteredCollectedInvoices.filter(i => isSameMonth(new Date(i.dueDate), subMonths(now, 1))).reduce((a,b) => a+b.amount, 0);
    
    let growthRate = 0;
    if (lastMonthCollected > 0) {
      growthRate = ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100;
    }

    return { totalCollected, totalOverdue, growthRate };
  }, [filteredCollectedInvoices, filteredOverdueInvoices]);

  // Chart Calculations
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const data = months.map(m => ({ name: m, collected: 0, overdue: 0 }));

    const allFilteredInvoices = [...filteredCollectedInvoices, ...filteredOverdueInvoices];

    allFilteredInvoices.forEach(inv => {
      const d = new Date(inv.dueDate);
      if (d.getFullYear() === currentYear) {
        const monthIndex = d.getMonth();
        if (inv.status === 'Paid') {
          data[monthIndex].collected += inv.amount;
        } else if (inv.status === 'Overdue' || (inv.status !== 'Paid' && d < new Date())) {
          data[monthIndex].overdue += inv.amount;
        }
      }
    });
    return data;
  }, [filteredCollectedInvoices, filteredOverdueInvoices]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === "Paid") {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
        setSelectedInvoiceForPayment(inv);
        setPaymentDialogOpen(true);
      }
      return;
    }

    try {
      if (newStatus === "Overdue" || newStatus === "Pending") {
        await api.deleteTransactionsByInvoice(id);
      }
      await api.updateInvoiceStatus(id, newStatus);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus as any } : inv));
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const processSecurePaymentForFee = async () => {
    if (!selectedInvoiceForPayment) return;
    setIsProcessingPayment(true);
    try {
      // Use the RPC if available, otherwise just use addTransaction
      const { supabase } = await import("../lib/supabase");
      if (supabase) {
        // Find if this is an installment invoice, or normal. process_installment_payment_v5 works for both
        const { error } = await supabase.rpc("process_installment_payment_v5", {
          p_invoice_id: selectedInvoiceForPayment.id,
          p_student_id: selectedInvoiceForPayment.studentId,
          p_amount: selectedInvoiceForPayment.amount,
          p_payment_method: paymentModeInput,
          p_reference_id: `SYS-${Date.now()}`,
          p_adjustment_amount: 0,
          p_adjustment_title: "0",
          p_payment_date: paymentDate || new Date().toISOString()
        });
        if (error) throw error;
      } else {
        await api.updateInvoiceStatus(selectedInvoiceForPayment.id, "Paid");
        await api.addTransaction({
           studentId: selectedInvoiceForPayment.studentId,
           invoiceId: selectedInvoiceForPayment.id,
           date: paymentDate || new Date().toISOString().split("T")[0],
           description: `Payment for ${selectedInvoiceForPayment.title || selectedInvoiceForPayment.category}`,
           type: "Payment",
           category: "Fees",
           amount: selectedInvoiceForPayment.amount,
           status: "Success",
           paymentMethod: paymentModeInput
        });
      }
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoiceForPayment.id ? { ...inv, status: "Paid", paymentMethod: paymentModeInput } : inv));
      setPaymentDialogOpen(false);
      setSelectedInvoiceForPayment(null);
    } catch (err) {
      console.error("Failed to process payment:", err);
      alert("Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tight">Fee Management</motion.h2>
        <motion.div variants={itemVariants} className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              id="fees-search-input"
              placeholder="Search by ID, name, amount..." 
              className="pl-9 w-full sm:w-[250px] border-none focus-visible:ring-1 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
            value={dateFilterType}
            onChange={(e) => {
              setDateFilterType(e.target.value as any);
              setDateFilterValue('');
            }}
          >
            <option value="all">All Time</option>
            <option value="month">By Month</option>
            <option value="date">By Date</option>
          </select>
          
          {dateFilterType === 'month' && (
            <Input
              type="month"
              className="h-9 w-[160px] bg-white"
              value={dateFilterValue}
              onChange={(e) => setDateFilterValue(e.target.value)}
            />
          )}

          {dateFilterType === 'date' && (
            <Input
              type="date"
              className="h-9 w-[160px] bg-white"
              value={dateFilterValue}
              onChange={(e) => setDateFilterValue(e.target.value)}
            />
          )}

          <select
            className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 max-w-[200px] truncate"
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
          >
            <option value="All">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          
          <select
            className="h-9 px-3 py-1 rounded-md border border-input bg-white text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
          >
            <option value="All">All Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Card">Card</option>
            <option value="Online Gateway">Online Gateway</option>
          </select>
        </motion.div>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card 
            className={`hover:shadow-lg transition-all cursor-pointer border ${selectedList === 'collected' ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-emerald-500/10'} h-full bg-white`}
            onClick={() => setSelectedList(prev => prev === 'collected' ? null : 'collected')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-slate-500">Total Collected</h3>
                <div className="bg-emerald-100 p-2 rounded-full">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">₹{metrics.totalCollected.toLocaleString()}</div>
              {metrics.growthRate !== 0 && (
                <p className={`text-xs mt-3 font-semibold ${metrics.growthRate > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}% from last month
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card 
            className={`hover:shadow-lg transition-all cursor-pointer border ${selectedList === 'overdue' ? 'border-red-500 shadow-md ring-1 ring-red-500' : 'border-red-500/10'} h-full bg-white`}
            onClick={() => setSelectedList(prev => prev === 'overdue' ? null : 'overdue')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-slate-500">Total Overdue</h3>
                <div className="bg-red-100 p-2 rounded-full">
                  <IndianRupee className="h-4 w-4 text-red-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2">₹{metrics.totalOverdue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Selected List Breakdown */}
      <AnimatePresence>
        {selectedList && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <Card className={`border ${selectedList === 'collected' ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'} shadow-sm`}>
              <div className={`p-4 border-b flex items-center justify-between ${selectedList === 'collected' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${selectedList === 'collected' ? 'text-emerald-800' : 'text-red-800'}`}>
                  {selectedList === 'collected' ? 'Collected Fees Breakdown' : 'Overdue Fees Breakdown'} 
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white font-bold opacity-70">
                    {selectedList === 'collected' ? filteredCollectedInvoices.length : filteredOverdueInvoices.length} entries
                  </span>
                </h3>
                <button 
                  onClick={() => setSelectedList(null)} 
                  className={`p-1 rounded-full transition-colors ${selectedList === 'collected' ? 'hover:bg-emerald-200 text-emerald-700' : 'hover:bg-red-200 text-red-700'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead className={`sticky top-0 bg-white shadow-sm z-10 text-xs uppercase font-bold ${selectedList === 'collected' ? 'text-emerald-700' : 'text-red-700'}`}>
                    <tr>
                      <th className="px-4 py-3 w-28 whitespace-nowrap">Student ID</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center w-40">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedList === 'collected' ? filteredCollectedInvoices : filteredOverdueInvoices).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          {search ? 'No fees found matching your search.' : `No ${selectedList === 'collected' ? 'collected' : 'overdue'} fees found.`}
                        </td>
                      </tr>
                    ) : (
                      (selectedList === 'collected' ? filteredCollectedInvoices : filteredOverdueInvoices).map(invoice => (
                        <tr key={invoice.id} className="hover:bg-white/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-mono font-medium text-slate-500 whitespace-nowrap">
                            {invoice.studentId}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {invoice.studentName}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">
                            {invoice.category}
                          </td>
                          <td className="px-4 py-3">
                            {invoice.paymentMethod ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider whitespace-nowrap">
                                {invoice.paymentMethod}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
                            ₹{invoice.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <select 
                                className={`text-xs font-medium border rounded-full px-2.5 py-1.5 cursor-pointer outline-none ${
                                  invoice.status === 'Paid' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : invoice.status === 'Overdue' || new Date(invoice.dueDate) < new Date()
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                                value={invoice.status === 'Overdue' || (invoice.status !== 'Paid' && new Date(invoice.dueDate) < new Date()) ? 'Overdue' : invoice.status}
                                onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                              >
                                <option value="Paid">Paid</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Pending">Pending</option>
                              </select>
                              {invoice.status !== 'Paid' && (
                                <button className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded-full transition-colors flex-shrink-0" title="Send Reminder" onClick={() => {
                                  setSelectedInvoiceForReminder(invoice);
                                  setReminderDialogOpen(true);
                                }}>
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                              <button className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-full transition-colors border border-slate-200 flex-shrink-0 bg-white" title="View Document">
                                <FileText className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white hover:shadow-lg transition-shadow border-slate-500/10">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-6 tracking-tight text-slate-800">Collection vs. Overdue Breakdown ({new Date().getFullYear()})</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                    tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000) + 'k' : value}`} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 600 }} />
                  <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="overdue" name="Overdue" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Confirmation Dialog for Fees */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Confirm Payment Collection
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Please enter the date this payment was actually received. This will generate a transaction in the student's ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between border-b pb-2 text-sm">
              <span className="text-muted-foreground font-medium">Invoice Amount</span>
              <span className="font-bold text-lg text-emerald-600">
                ₹{selectedInvoiceForPayment?.amount?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2 text-sm">
              <span className="text-muted-foreground font-medium">Student</span>
              <span className="font-medium text-slate-700">
                {selectedInvoiceForPayment?.studentName} 
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Payment Mode</label>
                <select
                  className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={paymentModeInput}
                  onChange={(e) => setPaymentModeInput(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="Online Gateway">Online Gateway</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 block">Collection Date</label>
                <Input 
                  type="date"
                  value={paymentDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full font-mono mt-1"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPaymentDialogOpen(false);
                setSelectedInvoiceForPayment(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={processSecurePaymentForFee}
              disabled={!paymentDate || isProcessingPayment}
            >
              {isProcessingPayment ? "Processing..." : "Confirm Collection"}
            </Button>
          </DialogFooter>
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
                        window.open(`https://wa.me/${selectedInvoiceForReminder?.studentWhatsapp}?text=${encodeURIComponent(message)}`, '_blank');
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
    </motion.div>
  );
}
