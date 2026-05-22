import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, IndianRupee, FileText } from "lucide-react";
import { api } from "../lib/api";
import { Invoice } from "../types";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";

export function Fees() {
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      const data = await api.getInvoices();
      setInvoices(data as Invoice[]);
      setLoading(false);
    };
    loadInvoices();
  }, []);

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const filteredInvoices = (invoices || []).filter(inv => 
    (inv.studentName?.toLowerCase() || "").includes(search.toLowerCase()) || 
    (inv.id?.toLowerCase() || "").includes(search.toLowerCase())
  );

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

  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDue = invoices.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.h2 variants={itemVariants} className="text-3xl font-bold tracking-tight">Fee Management</motion.h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow border-emerald-500/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Collected</h3>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-bold">₹{totalCollected.toLocaleString()}</div>
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
              <div className="text-3xl font-bold">₹{totalDue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-lg transition-shadow border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Invoices</h3>
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Invoice Tracking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-center space-x-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search invoices by student name or ID..." 
                className="max-w-sm border-0 focus-visible:ring-0 bg-transparent px-2"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout" initial={false}>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <motion.tr 
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        layout
                        className="group border-b border-slate-100 hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium text-muted-foreground">{inv.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{inv.studentName}</span>
                            <span className="text-xs text-muted-foreground">{inv.studentId}</span>
                          </div>
                        </TableCell>
                        <TableCell>{inv.category}</TableCell>
                        <TableCell>₹{inv.amount.toLocaleString()}</TableCell>
                        <TableCell>{inv.dueDate}</TableCell>
                        <TableCell>
                          <Badge variant={inv.status === "Paid" ? "success" : inv.status === "Partial" ? "warning" : "destructive"}>
                            {inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-8">
                            <FileText className="mr-2 h-3 w-3" /> Receipt
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
