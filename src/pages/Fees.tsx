import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, IndianRupee, FileText } from "lucide-react";
import { mockInvoices } from "../data/mockDb";

export function Fees() {
  const [search, setSearch] = useState("");

  const filteredInvoices = mockInvoices.filter(inv => 
    inv.studentName.toLowerCase().includes(search.toLowerCase()) || 
    inv.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Collected (YTD)</h3>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-bold">â¹1,240,000</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Due</h3>
              <IndianRupee className="h-4 w-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">â¹450,000</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium tracking-tight text-muted-foreground">Total Overdue</h3>
              <IndianRupee className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-3xl font-bold text-destructive">â¹85,000</div>
          </CardContent>
        </Card>
      </div>

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
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-muted-foreground">{inv.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{inv.studentName}</span>
                      <span className="text-xs text-muted-foreground">{inv.studentId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{inv.category}</TableCell>
                  <TableCell>â¹{inv.amount.toLocaleString()}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
