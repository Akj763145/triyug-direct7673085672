import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "../components/ui/card";
import { IndianRupee, X, Calendar, User, Send, FileText } from "lucide-react";
import { api, apiCache } from "../lib/api";
import { Invoice } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { isSameMonth, subMonths, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function Fees() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return (apiCache.get('invoices')?.data || []) as Invoice[];
  });
  const [loading, setLoading] = useState(() => !apiCache.has('invoices'));
  const [selectedList, setSelectedList] = useState<'collected' | 'overdue' | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await api.getInvoices();
      if (data) {
        setInvoices(data as Invoice[]);
      }
      setLoading(false);
    };
    loadInvoices();
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

  // Analytics Calculations
  const metrics = useMemo(() => {
    const totalCollected = collectedInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const totalOverdue = overdueInvoices.reduce((acc, curr) => acc + curr.amount, 0);

    const now = new Date();
    // MoM comparison for collected
    const thisMonthCollected = collectedInvoices.filter(i => isSameMonth(new Date(i.dueDate), now)).reduce((a,b) => a+b.amount, 0);
    const lastMonthCollected = collectedInvoices.filter(i => isSameMonth(new Date(i.dueDate), subMonths(now, 1))).reduce((a,b) => a+b.amount, 0);
    
    let growthRate = 0;
    if (lastMonthCollected > 0) {
      growthRate = ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100;
    }

    return { totalCollected, totalOverdue, growthRate };
  }, [collectedInvoices, overdueInvoices]);

  // Chart Calculations
  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    const data = months.map(m => ({ name: m, collected: 0, overdue: 0 }));

    invoices.forEach(inv => {
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
  }, [invoices]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateInvoiceStatus(id, newStatus);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus as any } : inv));
    } catch (err) {
      console.error("Failed to update status", err);
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
                    {selectedList === 'collected' ? collectedInvoices.length : overdueInvoices.length} entries
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
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center w-40">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedList === 'collected' ? collectedInvoices : overdueInvoices).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No {selectedList === 'collected' ? 'collected' : 'overdue'} fees found.
                        </td>
                      </tr>
                    ) : (
                      (selectedList === 'collected' ? collectedInvoices : overdueInvoices).map(invoice => (
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
                                <button className="text-emerald-500 hover:bg-emerald-50 p-1.5 rounded-full transition-colors flex-shrink-0" title="Send Reminder">
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
    </motion.div>
  );
}
