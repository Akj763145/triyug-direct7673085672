import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { IndianRupee, Plus, CheckCircle2, Search, Filter, ArrowUpDown, X, Paperclip, FileText, UploadCloud, Download, Printer, Check, Ban, Lock, ShieldCheck, AlertCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { Expense } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";

function convertNumberToWords(amount: number): string {
  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teenDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const doubleDigits = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatTenths = (num: number): string => {
    if (num < 10) return singleDigits[num];
    if (num < 20) return teenDigits[num - 10];
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return doubleDigits[tens] + (ones ? " " + singleDigits[ones] : "");
  };

  const convert = (num: number): string => {
    if (num === 0) return "";
    let words = "";

    if (num >= 10000000) {
      words += convert(Math.floor(num / 10000000)) + " Crore ";
      num %= 10000000;
    }
    if (num >= 100000) {
      words += convert(Math.floor(num / 100000)) + " Lakh ";
      num %= 100000;
    }
    if (num >= 1000) {
      words += convert(Math.floor(num / 1000)) + " Thousand ";
      num %= 1000;
    }
    if (num >= 100) {
      words += singleDigits[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num > 0) {
      if (words !== "") words += "and ";
      words += formatTenths(num);
    }
    return words.trim();
  };

  const rounded = Math.floor(amount);
  if (rounded === 0) return "Zero Rupees Only";
  return convert(rounded) + " Rupees Only";
}

export function Expenses() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");
  const [customCategory, setCustomCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterMonth, setFilterMonth] = useState("All Months");
  const [filterDate, setFilterDate] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  
  const [savedCustomCategories, setSavedCustomCategories] = useState<string[]>([]);
  const [isManageCatsOpen, setIsManageCatsOpen] = useState(false);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Expense | null>(null);

  const [userRole, setUserRole] = useState(() => localStorage.getItem("triyuga_user_role") || "Admin");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadExpenses = async () => {
    const data = await api.getExpenses();
    setExpenses(data as Expense[]);
    setLoading(false);
  };

  useEffect(() => {
    loadExpenses();
    const savedCats = localStorage.getItem('expense_custom_categories');
    if (savedCats) {
      try {
        setSavedCustomCategories(JSON.parse(savedCats));
      } catch(e) {}
    }
  }, []);

  useAutoRefresh(() => {
    loadExpenses();
  }, ['expenses']);

  useEffect(() => {
    const handleRoleChange = () => {
      setUserRole(localStorage.getItem("triyuga_user_role") || "Admin");
    };
    window.addEventListener('triyuga_permissions_updated', handleRoleChange);
    return () => {
      window.removeEventListener('triyuga_permissions_updated', handleRoleChange);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategory, filterStatus, sortBy, filterMonth, filterDate]);

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  const handleAddExpense = async () => {
    if (!description || !amount || !expenseDate) return;

    let finalCategory = category;
    if (category === "Custom" && customCategory) {
      finalCategory = customCategory;
      if (!savedCustomCategories.includes(customCategory)) {
        const newCats = [...savedCustomCategories, customCategory];
        setSavedCustomCategories(newCats);
        localStorage.setItem('expense_custom_categories', JSON.stringify(newCats));
      }
    }

    let receiptUrl = "";
    if (receiptFile) {
      setUploadingReceipt(true);
      try {
        const cleanFileName = receiptFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uploadPath = `receipts/${Date.now()}_${cleanFileName}`;
        const uploadResult = await api.uploadFile(uploadPath, receiptFile);
        if (uploadResult.url) {
          receiptUrl = uploadResult.url;
          console.log("Uploaded receipt successfully:", receiptUrl);
        } else {
          console.error("Upload did not return a valid URL:", uploadResult.error);
        }
      } catch (err) {
        console.error("Error occurred while uploading receipt:", err);
      } finally {
        setUploadingReceipt(false);
      }
    }

    const parsedAmount = parseFloat(amount);
    const initialStatus = parsedAmount > 5000 ? "Awaiting Approval" : "Pending";
    const userDisplay = localStorage.getItem("triyuga_user_fullname") || "Admin";

    await api.addExpense({
      description,
      amount: parsedAmount,
      category: finalCategory,
      date: expenseDate,
      status: initialStatus,
      receipt_url: receiptUrl || undefined
    });

    await api.addActivityLog({
      action: `Added expense for ${description} (${initialStatus})`,
      module: "Expenses",
      time: new Date().toISOString().split('T')[0],
      user: userDisplay
    });

    setOpenDialog(false);
    setDescription("");
    setAmount("");
    setCategory("Other");
    setCustomCategory("");
    setExpenseDate("");
    setReceiptFile(null);
    loadExpenses();
  };

  const approveExpense = async (id: string, expName: string) => {
    await api.updateExpenseStatus(id, "Approved");
    await api.addActivityLog({
      action: `Approved expense: ${expName}`,
      module: "Expenses",
      time: new Date().toISOString().split('T')[0],
      user: localStorage.getItem("triyuga_user_fullname") || "Admin"
    });
    loadExpenses();
  };

  const rejectExpense = async (id: string, expName: string) => {
    await api.updateExpenseStatus(id, "Rejected");
    await api.addActivityLog({
      action: `Rejected expense: ${expName}`,
      module: "Expenses",
      time: new Date().toISOString().split('T')[0],
      user: localStorage.getItem("triyuga_user_fullname") || "Admin"
    });
    loadExpenses();
  };

  const markPaid = async (id: string, expName: string) => {
    await api.updateExpenseStatus(id, "Paid");
    await api.addActivityLog({
      action: `Marked expense paid: ${expName}`,
      module: "Expenses",
      time: new Date().toISOString().split('T')[0],
      user: localStorage.getItem("triyuga_user_fullname") || "Admin"
    });
    loadExpenses();
  };

  const handleDeleteExpenseRow = async (id: string, expDesc: string) => {
    if (confirm(`Are you sure you want to delete the expense: "${expDesc}"?`)) {
      await api.deleteExpense(id);
      await api.addActivityLog({
        action: `Deleted expense record: ${expDesc}`,
        module: "Expenses",
        time: new Date().toISOString().split('T')[0],
        user: localStorage.getItem("triyuga_user_fullname") || "Admin"
      });
      loadExpenses();
    }
  };
  
  const deleteCustomCategory = (catToDelete: string) => {
    const newCats = savedCustomCategories.filter(c => c !== catToDelete);
    setSavedCustomCategories(newCats);
    localStorage.setItem('expense_custom_categories', JSON.stringify(newCats));
    if (category === catToDelete) setCategory("Other");
    if (filterCategory === catToDelete) setFilterCategory("All Categories");
  };

  const filteredAndSortedExpenses = expenses
    .filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "All Categories" || exp.category === filterCategory;
      const matchesStatus = filterStatus === "All Status" || exp.status === filterStatus;
      
      const matchesMonth = (() => {
        if (filterMonth === "All Months") return true;
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        if (!exp.date) return false;
        const parts = exp.date.split('-');
        if (parts.length < 2) return false;
        const monthIndex = parseInt(parts[1], 10) - 1;
        return months[monthIndex] === filterMonth;
      })();

      const matchesDate = !filterDate || exp.date === filterDate;

      return matchesSearch && matchesCategory && matchesStatus && matchesMonth && matchesDate;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "date-asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "amount-desc") return b.amount - a.amount;
      if (sortBy === "amount-asc") return a.amount - b.amount;
      return 0;
    });

  const totalPages = Math.ceil(filteredAndSortedExpenses.length / itemsPerPage);
  const finalCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedExpenses = filteredAndSortedExpenses.slice(
    (finalCurrentPage - 1) * itemsPerPage,
    finalCurrentPage * itemsPerPage
  );

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        totalPages <= 5 ||
        i === 1 ||
        i === totalPages ||
        (i >= finalCurrentPage - 1 && i <= finalCurrentPage + 1)
      ) {
        pages.push(i);
      } else if (i === finalCurrentPage - 2 || i === finalCurrentPage + 2) {
        pages.push("...");
      }
    }
    return pages.filter((item, index, arr) => item !== "..." || arr[index - 1] !== "...");
  };

  const allCategories = ["Salary", "Utilities", "Maintenance", "Supplies", "Other", ...savedCustomCategories];
  const pendingExpensesCount = expenses.filter(exp => ["Pending", "Awaiting Approval"].includes(exp.status)).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-0">
             <div className="p-4 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-4 border-b last:border-0 px-4">
                    <div className="flex gap-12">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex gap-6 items-center">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 border-none">Expense Management</h2>
            {pendingExpensesCount > 0 && (
              <span className="relative flex h-3.5 w-3.5" title={`${pendingExpensesCount} expenses awaiting review`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Approval threshold is set to <span className="font-semibold text-slate-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">₹5,000</span> for auditing and super-admin sign-offs.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
          <Dialog open={isManageCatsOpen} onOpenChange={setIsManageCatsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Manage Categories</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Custom Categories</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex gap-2 items-center">
                  <Input 
                    placeholder="New Custom Category Name..." 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                  />
                  <Button onClick={() => {
                    const trimmed = customCategory.trim();
                    if (trimmed && !savedCustomCategories.includes(trimmed)) {
                      const newCats = [...savedCustomCategories, trimmed];
                      setSavedCustomCategories(newCats);
                      localStorage.setItem('expense_custom_categories', JSON.stringify(newCats));
                      setCustomCategory("");
                    }
                  }}>
                    Add
                  </Button>
                </div>
                {savedCustomCategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">No custom categories found.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {savedCustomCategories.map(cat => (
                      <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <span className="font-medium">{cat}</span>
                        <Button variant="ghost" size="sm" onClick={() => deleteCustomCategory(cat)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => {
                  setCustomCategory("");
                  setIsManageCatsOpen(false);
                }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Record Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    placeholder="e.g. Electricity Bill" 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Amount (₹)</label>
                  <Input 
                    type="number" 
                    placeholder="2500" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {amount && parseFloat(amount) > 5000 && (
                    <div className="flex items-start gap-2 p-2.5 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200 mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                      <div>
                        <span className="font-semibold">Super-Admin Approval Required:</span> Expenses exceeding ₹5,000 require Super-Admin approval before they can be marked as Paid.
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Expense Date</label>
                  <Input 
                    type="date" 
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Category</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Salary">Salary</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Other">Other</option>
                    {savedCustomCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Custom">Custom...</option>
                  </select>
                </div>
                {category === "Custom" && (
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Custom Category Name</label>
                    <Input 
                      placeholder="e.g. Marketing" 
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>Receipt Document</span>
                    <span className="text-xs text-slate-400 font-normal">Optional (PDF or Image)</span>
                  </label>
                  <label className="border border-dashed border-slate-200 hover:border-slate-400 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-100/50 group">
                    <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-amber-600 transition-colors" />
                    <span className="text-xs font-medium text-slate-600 text-center">
                      {receiptFile ? receiptFile.name : "Click to select receipt file"}
                    </span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG up to 10MB</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setReceiptFile(file);
                      }}
                    />
                  </label>
                  {receiptFile && (
                    <div className="flex justify-between items-center bg-slate-100/80 px-2 py-1.5 rounded text-xs">
                      <span className="truncate max-w-[280px] font-mono text-slate-600">{receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)</span>
                      <Button variant="ghost" size="sm" onClick={() => setReceiptFile(null)} className="h-5 w-5 p-0 text-slate-500 hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddExpense} disabled={uploadingReceipt}>
                  {uploadingReceipt ? "Saving & Uploading..." : "Save Expense"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {pendingExpensesCount > 0 && (
        <div className="bg-rose-50/60 border border-slate-200/60 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-slate-700 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100/80 text-rose-700 rounded-lg shrink-0 mt-0.5 relative animate-bounce h-9 w-9 flex items-center justify-center">
              <span className="animate-ping absolute -top-0.5 -right-0.5 inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-90"></span>
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-950">Pending Approval Attention</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                {userRole === "Admin" ? (
                  <>There are <span className="font-semibold underline text-rose-900">{pendingExpensesCount}</span> expense claims awaiting super-admin approval or payment clearance.</>
                ) : (
                  <>There are <span className="font-semibold underline text-rose-900">{pendingExpensesCount}</span> submitted expenses currently pending in the system.</>
                )}
              </p>
            </div>
          </div>
          {filterStatus !== "Pending" && filterStatus !== "Awaiting Approval" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const hasAwaiting = expenses.some(e => e.status === "Awaiting Approval");
                setFilterStatus(hasAwaiting ? "Awaiting Approval" : "Pending");
              }} 
              className="border-rose-200 hover:bg-rose-100 bg-white text-rose-950 font-semibold shrink-0 self-start sm:self-auto text-xs h-8"
            >
              Filter Awaiting Tasks
            </Button>
          )}
        </div>
      )}
    </div>
      
      <div className="flex flex-col gap-4 mb-6 bg-slate-50/50 p-4 rounded-xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input 
              placeholder="Search expenses by description..." 
              className="pl-10 h-10 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {(searchQuery !== "" || filterCategory !== "All Categories" || filterStatus !== "All Status" || filterMonth !== "All Months" || filterDate !== "") && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery("");
                setFilterCategory("All Categories");
                setFilterStatus("All Status");
                setFilterMonth("All Months");
                setFilterDate("");
              }}
              className="h-10 text-xs font-semibold px-4 border-dashed border-slate-300 text-slate-600 hover:text-slate-900 shrink-0 self-start md:self-auto"
            >
              <X className="h-4 w-4 mr-1.5 text-slate-400" /> Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Categories select */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Category</span>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5 z-10" />
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-white pl-9 pr-2 py-2 text-xs sm:text-sm ring-offset-background appearance-none cursor-pointer text-slate-700"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All Categories">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Status Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Status</span>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs sm:text-sm ring-offset-background cursor-pointer text-slate-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All Status">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          {/* Month Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Month</span>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs sm:text-sm ring-offset-background cursor-pointer text-slate-700"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="All Months">All Months</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>
          </div>

          {/* Date Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Specific Date</span>
            <div className="relative flex items-center">
              <input 
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-xs sm:text-sm ring-offset-background cursor-pointer text-slate-700"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              {filterDate && (
                <button 
                  onClick={() => setFilterDate("")} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Sort Select */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Sort Order</span>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5 z-10" />
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-white pl-9 pr-2 py-2 text-xs sm:text-sm ring-offset-background appearance-none cursor-pointer text-slate-700"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expense ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout" initial={false}>
                {(filteredAndSortedExpenses || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.map((exp) => (
                    <motion.tr 
                      key={exp.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      layout
                      className="group border-b border-slate-100 hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium text-muted-foreground">{exp.id}</TableCell>
                      <TableCell>{exp.date}</TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell>{exp.category}</TableCell>
                      <TableCell className="font-medium text-emerald-600">₹{exp.amount}</TableCell>
                      <TableCell>
                        {exp.status === "Paid" && (
                          <Badge variant="success" className="font-semibold px-2.5 py-0.5">
                            Paid
                          </Badge>
                        )}
                        {exp.status === "Awaiting Approval" && (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <Badge variant="info" className="font-semibold px-2.5 py-0.5 bg-rose-50 text-rose-700 border-rose-200">
                              Awaiting Approval
                            </Badge>
                          </div>
                        )}
                        {exp.status === "Approved" && (
                          <Badge variant="success" className="font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                            Approved
                          </Badge>
                        )}
                        {exp.status === "Pending" && (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <Badge variant="warning" className="font-semibold px-2.5 py-0.5">
                              Pending
                            </Badge>
                          </div>
                        )}
                        {exp.status === "Rejected" && (
                          <Badge variant="destructive" className="font-semibold px-2.5 py-0.5">
                            Rejected
                          </Badge>
                        )}
                        {!["Paid", "Awaiting Approval", "Approved", "Pending", "Rejected"].includes(exp.status) && (
                          <Badge variant="outline">
                            {exp.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {exp.receipt_url ? (
                          <a 
                            href={exp.receipt_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                          >
                            <Paperclip className="h-3.5 w-3.5 mr-1" />
                            Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {exp.status === "Paid" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedVoucher(exp)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Voucher
                            </Button>
                          ) : exp.status === "Awaiting Approval" ? (
                            userRole === "Admin" ? (
                              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => approveExpense(exp.id, exp.description)}
                                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 font-semibold"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rejectExpense(exp.id, exp.description)}
                                  className="text-destructive hover:bg-destructive/5 hover:text-destructive border-transparent hover:border-destructive/30 font-semibold"
                                >
                                  <Ban className="h-3.5 w-3.5 mr-1 text-destructive" /> Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded border border-slate-100 select-none">
                                <Lock className="h-3.5 w-3.5 text-slate-400" /> Pending Super-Admin
                              </span>
                            )
                          ) : exp.status === "Approved" ? (
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase font-bold py-1 px-1.5 select-none shrink-0" variant="success">Approved</Badge>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-semibold"
                                onClick={() => markPaid(exp.id, exp.description)}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4 text-primary" /> Mark Paid
                              </Button>
                            </div>
                          ) : exp.status === "Rejected" ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="destructive" className="text-[10px] uppercase font-bold py-1 px-1.5 select-none shrink-0">Rejected</Badge>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteExpenseRow(exp.id, exp.description)}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 px-2"
                              >
                                <Trash2 className="h-4 w-4" /> Delete
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => markPaid(exp.id, exp.description)}
                              className="font-semibold"
                            >
                              <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" /> Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
          
          {!loading && filteredAndSortedExpenses.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-slate-50/50 border-slate-100 text-slate-600">
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Showing {Math.min(filteredAndSortedExpenses.length - (finalCurrentPage - 1) * itemsPerPage, itemsPerPage)} of {filteredAndSortedExpenses.length} Expenses
              </p>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={finalCurrentPage === 1}
                  className="h-8 text-xs font-semibold"
                >
                  <ChevronLeft className="h-4 w-4 mr-1 text-slate-500" /> Prev
                </Button>
                <div className="flex items-center space-x-1">
                  {getPageNumbers().map((pageNum, idx) => (
                    <Button 
                      key={idx} 
                      variant={finalCurrentPage === pageNum ? "default" : "ghost"}
                      size="sm"
                      className={`h-8 w-8 p-0 text-xs font-semibold ${pageNum === "..." ? "pointer-events-none text-slate-400" : ""}`}
                      onClick={() => typeof pageNum === "number" && setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={finalCurrentPage === totalPages}
                  className="h-8 text-xs font-semibold"
                >
                  Next <ChevronRight className="h-4 w-4 ml-1 text-slate-500" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modern High-Fidelity Printable Voucher Dialog */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-slate-900">
              <span>Disbursement Voucher Preview</span>
              <Badge variant="success" className="text-xs select-none">PAID VOUCHER</Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedVoucher && (
            <div className="py-6 px-1">
              <div className="border-2 border-slate-200 rounded-xl p-6 bg-slate-50/50 shadow-sm relative overflow-hidden">
                {/* Visual Watermark */}
                <div className="absolute right-4 bottom-4 font-bold text-[72px] text-slate-200/40 select-none pointer-events-none rotate-12 uppercase">
                  PAID
                </div>

                <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 mb-5">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 uppercase tracking-tight">Triyuga Academy</h3>
                    <p className="text-xs text-muted-foreground">Accounts & Financial Disbursals Office</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Voucher No.</p>
                    <p className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{selectedVoucher.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-sm text-slate-700 mb-6 font-sans">
                  <div>
                    <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Disbursal Date</span>
                    <span className="font-medium">{selectedVoucher.date}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Category</span>
                    <span className="font-medium">{selectedVoucher.category}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Account Status</span>
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Cleared
                    </span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Particulars / Description</span>
                    <span className="font-medium text-slate-900 bg-white p-2 rounded border border-slate-100 block">{selectedVoucher.description}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-xs uppercase font-semibold text-slate-400 block mb-0.5">Amount In Words</span>
                    <span className="italic text-slate-600 bg-white p-2 rounded border border-slate-100 block text-xs">
                      {convertNumberToWords(selectedVoucher.amount)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-100 border border-slate-200 p-4 rounded-lg">
                  <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Net Amount Paid</span>
                  <span className="text-xl font-bold text-slate-900">₹{selectedVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-200 text-xs">
                  <div>
                    <div className="h-10"></div>
                    <div className="w-32 border-t border-slate-400 pt-1 text-slate-500 text-center uppercase tracking-wider text-[10px]">Prepared By</div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end justify-center font-mono text-[9px] text-emerald-500 tracking-wider uppercase">
                      ● DIGITALLY VERIFIED
                    </div>
                    <div className="w-36 border-t border-slate-400 pt-1 text-slate-500 text-center uppercase tracking-wider text-[10px]">Authorized Signatory</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (!selectedVoucher) return;
                const printWindow = window.open("", "_blank");
                if (!printWindow) {
                  window.print();
                  return;
                }
                const amtWords = convertNumberToWords(selectedVoucher.amount);
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>Payment Voucher - ${selectedVoucher.id}</title>
                      <style>
                        body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; }
                        .voucher-container { border: 2px solid #e2e8f0; border-radius: 12px; padding: 32px; max-width: 800px; margin: 0 auto; background: #fff; position: relative; }
                        .header-layout { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 24px; }
                        .logo-title { font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a; }
                        .voucher-badge { background: #10b981; color: #fff; padding: 6px 12px; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; }
                        .voucher-meta { text-align: right; }
                        .meta-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 500; }
                        .meta-val { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
                        .title-banner { font-size: 18px; font-weight: 700; text-align: center; text-transform: uppercase; background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 24px; border: 1px solid #f1f5f9; letter-spacing: 0.05em; }
                        .grid-details { display: grid; grid-template-columns: 150px 1fr; row-gap: 16px; margin-bottom: 32px; font-size: 14px; }
                        .detail-label { font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 12px; display: flex; align-items: center; }
                        .detail-value { color: #0f172a; padding-bottom: 4px; border-bottom: 1px dashed #e2e8f0; }
                        .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 700; margin-bottom: 40px; }
                        .sign-section { display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; }
                        .sign-line { width: 180px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-weight: 500; color: #475569; }
                        @media print {
                          body { padding: 20px; }
                          .voucher-container { border: 1px solid #cbd5e1; box-shadow: none; }
                        }
                      </style>
                    </head>
                    <body onload="window.print(); window.close();">
                      <div class="voucher-container">
                        <div class="header-layout">
                          <div>
                            <div class="logo-title">Triyuga Academy</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Main Administrative Office • Finance Dept</div>
                          </div>
                          <div class="voucher-meta">
                            <div class="meta-label">Voucher No.</div>
                            <div class="meta-val">${selectedVoucher.id}</div>
                            <span class="voucher-badge">PAID VOUCHER</span>
                          </div>
                        </div>
                        
                        <div class="title-banner">EXPENSE DISBURSEMENT VOUCHER</div>
                        
                        <div class="grid-details">
                          <div class="detail-label">Payment Date</div>
                          <div class="detail-value">${selectedVoucher.date}</div>
                          
                          <div class="detail-label">Particulars / Desc</div>
                          <div class="detail-value" style="font-weight: 500;">${selectedVoucher.description}</div>
                          
                          <div class="detail-label">Expense Category</div>
                          <div class="detail-value">${selectedVoucher.category}</div>
                          
                          <div class="detail-label">Amount in Words</div>
                          <div class="detail-value" style="font-style: italic; color: #475569;">${amtWords}</div>
                        </div>
                        
                        <div class="amount-box">
                          <span style="font-size: 14px; text-transform: uppercase; color: #475569; font-weight: 600;">Total Disbursed:</span>
                          <span style="color: #059669; font-size: 22px;">₹${selectedVoucher.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        
                        <div class="sign-section">
                          <div>
                            <div style="height: 40px;"></div>
                            <div class="sign-line">Prepared By</div>
                          </div>
                          <div>
                            <div style="height: 40px; text-align: center; font-family: monospace; color: #64748b; font-size: 11px;">DIGITALLY SECURED</div>
                            <div class="sign-line">Authorized Signatory</div>
                          </div>
                        </div>
                      </div>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
