import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { api } from "../lib/api";
import { Transaction } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const expenseData = [
  { name: "Payroll", value: 450000 },
  { name: "Rent & Utilities", value: 120000 },
  { name: "Resources", value: 85000 },
  { name: "Marketing", value: 40000 },
];
const COLORS = ["#06b6d4", "#a855f7", "#3b82f6", "#ef4444"];

export function Ledger() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      const data = await api.getTransactions();
      setTransactions(data as Transaction[]);
      setLoading(false);
    };
    loadTransactions();
  }, []);

  const totalIncome = transactions.filter(t => t.type === "Income").reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "Expense").reduce((acc, curr) => acc + curr.amount, 0);
  const netBalance = totalIncome - totalExpense;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading ledger...</div>;
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
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Ledger & Financial Hub</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium tracking-tight text-primary mb-2">Net Balance</h3>
            <div className="text-4xl font-bold text-primary">₹{netBalance.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium tracking-tight text-muted-foreground mb-2">Total Revenue</h3>
            <div className="text-3xl font-bold text-emerald-500">₹{totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium tracking-tight text-muted-foreground mb-2">Total Expenses</h3>
            <div className="text-3xl font-bold text-destructive">₹{totalExpense.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
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
                  >
                    {chartDataToUse.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121214', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `₹${value.toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
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
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No transactions recorded.</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-muted-foreground">{txn.date}</TableCell>
                      <TableCell className="font-medium">{txn.description}</TableCell>
                      <TableCell><Badge variant="outline">{txn.category}</Badge></TableCell>
                      <TableCell className={`text-right font-bold ${txn.type === "Income" ? "text-emerald-500" : "text-foreground"}`}>
                        {txn.type === "Income" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
