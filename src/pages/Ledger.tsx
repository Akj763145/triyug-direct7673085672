import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";
import { api } from "../lib/api";
import { Transaction } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

const expenseData = [
  { name: "Payroll", value: 450000 },
  { name: "Rent & Utilities", value: 120000 },
  { name: "Resources", value: 85000 },
  { name: "Marketing", value: 40000 },
];
const COLORS = ["#16A34A", "#2563EB", "#DC2626", "#D97706", "#7C3AED"];

export function Ledger() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter & Sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Income" | "Expense">("All");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [sortField, setSortField] = useState<"date" | "amount" | "description" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadTransactions = async () => {
    const [txData, expData] = await Promise.all([
      api.getTransactions(),
      api.getExpenses()
    ]);

    const unified: any[] = [];
    
    (txData || []).forEach((tx: any) => {
      unified.push({
        id: tx.id,
        date: tx.date || new Date().toISOString().split("T")[0],
        description: tx.description || `Fee Payment (${tx.payment_method || tx.paymentMethod || 'Online'})`,
        category: tx.category || "Fees",
        amount: Number(tx.amount || 0),
        type: "Income"
      });
    });

    (expData || []).forEach((exp: any) => {
      unified.push({
        id: exp.id,
        date: exp.date || new Date().toISOString().split("T")[0],
        description: exp.description || "General Expense",
        category: exp.category || "Operations",
        amount: Number(exp.amount || 0),
        type: "Expense"
      });
    });

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(unified as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useAutoRefresh(() => {
    loadTransactions();
  }, ['transactions', 'expenses']);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0 }
  };

  const totalIncome = transactions.filter(t => t.type === "Income").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "Expense").reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Filter and Sort Logic
  const filteredAndSortedTransactions = [...transactions]
    .filter(txn => {
      const matchesSearch = 
        (txn.description?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (txn.category?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesType = filterType === "All" || txn.type === filterType;
      const matchesMonth = filterMonth ? (txn.date?.startsWith(filterMonth) ?? false) : true;
      const matchesDate = filterDate ? (txn.date === filterDate) : true;
      return matchesSearch && matchesType && matchesMonth && matchesDate;
    })
    .sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      
      if (sortField === "amount") {
        valA = a.amount || 0;
        valB = b.amount || 0;
      }
      
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const totalResults = filteredAndSortedTransactions.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterMonth, filterDate]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent className="p-0">
               <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 px-4">
                      <div className="flex gap-8">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Group expenses for the chart
  const dynamicExpenseData = transactions
    .filter(t => t.type === "Expense")
    .reduce((acc: any[], curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, []);

  const chartDataToUse = dynamicExpenseData.length > 0 ? dynamicExpenseData : expenseData;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tight">Ledger & Financial Hub</motion.h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="bg-primary/10 border-primary/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium tracking-tight text-primary mb-2">Net Balance</h3>
              <div className="text-4xl font-bold text-primary">₹{netBalance.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium tracking-tight text-muted-foreground mb-2">Total Revenue</h3>
              <div className="text-3xl font-bold text-success">₹{totalIncome.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card 
            className="hover:shadow-lg transition-shadow cursor-pointer hover:border-slate-300" 
            onClick={() => navigate('/expenses')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Expenses</h3>
                <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1 group-hover:bg-slate-200 transition-colors">View <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
              </div>
              <div className="text-3xl font-bold text-destructive">₹{totalExpense.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants} className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartDataToUse}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {chartDataToUse.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '8px', color: '#2d2a26', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#2d2a26' }}
                      formatter={(value: number) => `₹${value.toLocaleString()}`}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <CardTitle>Central Transaction Ledger</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:flex-wrap sm:justify-end">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 w-full sm:w-[150px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="flex h-10 w-full sm:w-[110px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value as any)}
                >
                  <option value="All">All Types</option>
                  <option value="Income">Income</option>
                  <option value="Expense">Expense</option>
                </select>
                <Input 
                  type="month"
                  className="w-full sm:w-[140px]"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    if (e.target.value) setFilterDate("");
                  }}
                />
                <Input 
                  type="date"
                  className="w-full sm:w-[140px]"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value);
                    if (e.target.value) setFilterMonth("");
                  }}
                />
                {(searchTerm || filterType !== "All" || filterMonth || filterDate) && (
                  <Button variant="ghost" className="px-2" onClick={() => {
                    setSearchTerm("");
                    setFilterType("All");
                    setFilterMonth("");
                    setFilterDate("");
                  }}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => { setSortField("date"); setSortOrder(prev => prev === "desc" ? "asc" : "desc"); }} className="-ml-3">
                        Date <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => { setSortField("description"); setSortOrder(prev => prev === "desc" ? "asc" : "desc"); }} className="-ml-3">
                        Description <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => { setSortField("category"); setSortOrder(prev => prev === "desc" ? "asc" : "desc"); }} className="-ml-3">
                        Category <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setSortField("amount"); setSortOrder(prev => prev === "desc" ? "asc" : "desc"); }} className="ml-auto -mr-3 flex">
                        Amount <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions recorded.</TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((txn) => (
                        <motion.tr 
                          key={txn.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          layout
                          className="group border-b border-slate-100 hover:bg-muted/50 transition-colors"
                        >
                          <TableCell className="text-muted-foreground">{txn.date}</TableCell>
                          <TableCell className="font-medium">{txn.description}</TableCell>
                          <TableCell><Badge variant="outline">{txn.category}</Badge></TableCell>
                          <TableCell className={`text-right font-bold ${txn.type === "Income" ? "text-emerald-600" : "text-foreground"}`}>
                            {txn.type === "Income" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500">
                    Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-xs border rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-xs border rounded-full hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
