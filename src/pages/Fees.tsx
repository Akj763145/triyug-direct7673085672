import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { 
  Search, IndianRupee, FileText, ArrowUpDown, ArrowDown, ArrowUp, 
  Download, Bell, CheckSquare, Filter, FileSpreadsheet, Send
} from "lucide-react";
import { api } from "../lib/api";
import { Invoice } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Papa from "papaparse";
import { format, parseISO, isSameMonth, subMonths, startOfMonth, endOfMonth, isWithinInterval, isThisWeek, isThisMonth } from "date-fns";

export function Fees() {
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");
  
  // Selection State
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());

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

  // Memoized Filtering & Sorting
  const filteredAndSortedInvoices = useMemo(() => {
    let result = invoices || [];

    // 1. Global Search
    if (search.trim() !== '') {
      const lowerSearch = search.toLowerCase();
      result = result.filter(inv => 
        (inv.studentName?.toLowerCase() || "").includes(lowerSearch) || 
        (inv.id?.toLowerCase() || "").includes(lowerSearch) ||
        (inv.studentId?.toLowerCase() || "").includes(lowerSearch) ||
        (inv.title?.toLowerCase() || "").includes(lowerSearch) ||
        (inv.category?.toLowerCase() || "").includes(lowerSearch)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // 3. Date Filter
    if (dateFilter !== 'All') {
      const now = new Date();
      result = result.filter(inv => {
        try {
          const invDate = new Date(inv.dueDate);
          if (dateFilter === 'ThisWeek') return isThisWeek(invDate);
          if (dateFilter === 'ThisMonth') return isThisMonth(invDate);
          return true;
        } catch(e) { return true; }
      });
    }

    // 4. Sorting
    result = [...result].sort((a, b) => {
      const desc = sortConfig.direction === 'desc';
      if (sortConfig.key === 'amount') {
        return desc ? b.amount - a.amount : a.amount - b.amount;
      }
      if (sortConfig.key === 'dueDate') {
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return desc ? dateB - dateA : dateA - dateB;
      }
      if (sortConfig.key === 'status') {
        return desc ? b.status.localeCompare(a.status) : a.status.localeCompare(b.status);
      }
      return 0;
    });

    return result;
  }, [invoices, search, statusFilter, dateFilter, sortConfig]);

  // Handle Sort Toggle
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(filteredAndSortedInvoices.map(inv => inv.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (id: string, checked: boolean) => {
    const newSet = new Set(selectedInvoices);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedInvoices(newSet);
  };

  // Export Logic
  const handleExportCSV = () => {
    const dataToExport = filteredAndSortedInvoices.map(inv => ({
      "Invoice ID": inv.id,
      "Student Name": inv.studentName || 'N/A',
      "Student ID": inv.studentId || 'N/A',
      "Category": inv.category || inv.title || 'N/A',
      "Amount": inv.amount,
      "Due Date": inv.dueDate,
      "Status": inv.status
    }));
    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fees_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    // Optimistic update
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus as any } : inv));
    // API call
    await api.updateInvoiceStatus(id, newStatus);
  };

  // Analytics Calculations
  const metrics = useMemo(() => {
    const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
    const totalDue = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);

    const now = new Date();
    // MoM comparison for collected
    const thisMonthCollected = invoices.filter(i => i.status === 'Paid' && isSameMonth(new Date(i.dueDate), now)).reduce((a,b) => a+b.amount, 0);
    const lastMonthCollected = invoices.filter(i => i.status === 'Paid' && isSameMonth(new Date(i.dueDate), subMonths(now, 1))).reduce((a,b) => a+b.amount, 0);
    
    let growthRate = 0;
    if (lastMonthCollected > 0) {
      growthRate = ((thisMonthCollected - lastMonthCollected) / lastMonthCollected) * 100;
    }

    // Forecasting (Due next month)
    const nextMonthDue = invoices.filter(i => i.status !== 'Paid' && isSameMonth(new Date(i.dueDate), subMonths(now, -1))).reduce((a,b) => a+b.amount, 0);

    return { totalCollected, totalDue, growthRate, nextMonthDue };
  }, [invoices]);

  // Chart Data Preparation (Last 6 Months)
  const chartData = useMemo(() => {
    if (!invoices.length) return [];
    const monthsData: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      monthsData[format(d, 'MMM yyyy')] = 0;
    }

    invoices.forEach(inv => {
      if (inv.status === 'Paid' && inv.dueDate) {
        try {
          const m = format(new Date(inv.dueDate), 'MMM yyyy');
          if (monthsData[m] !== undefined) {
            monthsData[m] += inv.amount;
          }
        } catch(e) {}
      }
    });

    return Object.keys(monthsData).map(key => ({
      name: key,
      collected: monthsData[key]
    }));
  }, [invoices]);


  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <Card>
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b"><Skeleton className="h-10 w-64" /></div>
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
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
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tight">Fee Management</motion.h2>
        <motion.div variants={itemVariants} className="flex space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button className="w-full sm:w-auto">
            <CheckSquare className="mr-2 h-4 w-4" /> Record Issue
          </Button>
        </motion.div>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow border-emerald-500/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Collected</h3>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold">₹{metrics.totalCollected.toLocaleString()}</div>
              {metrics.growthRate !== 0 && (
                <p className={`text-xs mt-2 font-medium ${metrics.growthRate > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}% from last month
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow border-primary/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Pending</h3>
                <IndianRupee className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">₹{metrics.totalDue.toLocaleString()}</div>
              {metrics.nextMonthDue > 0 && (
                <p className="text-xs mt-2 text-muted-foreground font-medium">
                  <span className="text-primary font-bold">₹{metrics.nextMonthDue.toLocaleString()}</span> projected for next month
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Invoices Mapped</h3>
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{invoices.length}</div>
              <p className="text-xs mt-2 text-muted-foreground font-medium">Active fee schedules</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Analytics Chart */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg">Fee Collection Trends</CardTitle>
            <CardDescription>Monthly aggregated paid transactions</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `₹${val>=1000 ? (val/1000)+'k' : val}`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Collected']}
                  />
                  <Bar dataKey="collected" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Action Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <CardTitle>Invoices</CardTitle>
              {selectedInvoices.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-xs font-medium text-muted-foreground mr-2">{selectedInvoices.size} selected</span>
                  <Button size="sm" variant="secondary" className="h-8">
                    <Bell className="h-3 w-3 mr-2" /> Remind All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Filters Row */}
            <div className="p-4 border-b flex flex-col md:flex-row gap-4 items-end md:items-center bg-slate-50/50">
              <div className="relative w-full max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search globally..." 
                  className="pl-9 h-10 w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-input rounded-md bg-background text-sm font-medium focus:ring-primary focus:outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Partial">Partial</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
                
                <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-input rounded-md bg-background text-sm font-medium focus:ring-primary focus:outline-none"
                  >
                    <option value="All">All Dates</option>
                    <option value="ThisWeek">Due This Week</option>
                    <option value="ThisMonth">Due This Month</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-4">
                      <Checkbox 
                        checked={selectedInvoices.size === filteredAndSortedInvoices.length && filteredAndSortedInvoices.length > 0} 
                        onCheckedChange={(c) => handleSelectAll(c as boolean)} 
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[120px]">Invoice ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center">Amount <SortIcon columnKey="amount" /></div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center">Due Date <SortIcon columnKey="dueDate" /></div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">Status <SortIcon columnKey="status" /></div>
                    </TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredAndSortedInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <FileText className="h-10 w-10 text-muted-foreground/30" />
                            <p>No invoices match your filters.</p>
                            <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('All'); setDateFilter('All'); }}>Clear Filters</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedInvoices.map((inv) => (
                        <motion.tr 
                          key={inv.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          layout
                          className={`group border-b border-slate-100 transition-colors ${selectedInvoices.has(inv.id) ? 'bg-indigo-50/50' : 'hover:bg-muted/50'}`}
                        >
                          <TableCell className="pl-4">
                            <Checkbox 
                              checked={selectedInvoices.has(inv.id)} 
                              onCheckedChange={(c) => handleSelectInvoice(inv.id, c as boolean)}
                              aria-label={`Select invoice ${inv.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-muted-foreground uppercase">{inv.id.split('-').shift() || inv.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground text-sm">{inv.studentName}</span>
                              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{inv.studentId}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                             <div className="text-sm">{inv.category || inv.title}</div>
                          </TableCell>
                          <TableCell className="font-bold">₹{inv.amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{format(new Date(inv.dueDate), 'dd MMM yyyy')}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              inv.status === "Paid" ? "success" : 
                              (inv.status === "Partial" || inv.status === "Pending") ? "warning" : "destructive"
                            }>
                              {inv.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            <select 
                              value={inv.status}
                              onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                              className="inline-flex h-8 w-[100px] items-center justify-center rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="Unpaid">Unpaid</option>
                              <option value="Partial">Partial</option>
                              <option value="Paid">Paid</option>
                            </select>
                            {inv.status !== 'Paid' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10" title="Send Reminder">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="icon" className="h-8 w-8" title="Download Receipt">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

