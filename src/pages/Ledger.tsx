import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    const data = await api.getTransactions();
    setTransactions(data as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useAutoRefresh(() => {
    loadTransactions();
  }, ['transactions']);

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
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <h3 className="text-sm font-medium tracking-tight text-muted-foreground mb-2">Total Expenses</h3>
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
            <CardHeader>
              <CardTitle>Central Transaction Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions recorded.</TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((txn) => (
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
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
