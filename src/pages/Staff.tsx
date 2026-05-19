import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { api } from "../lib/api";
import { Staff as StaffType } from "../types";

export function Staff() {
  const [search, setSearch] = useState("");
  const [staffList, setStaffList] = useState<StaffType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const loadStaff = async () => {
      const data = await api.getStaff();
      setStaffList(data as StaffType[]);
      setLoading(false);
    };
    loadStaff();
  }, []);

  const handleGeneratePayroll = async () => {
    const totalPayout = staffList.reduce((acc, curr) => acc + curr.salary, 0);

    // Record as transaction
    await api.addTransaction({
      date: new Date().toISOString().split('T')[0],
      description: "Staff Payroll - Auto Generated",
      type: "Expense",
      category: "Payroll",
      amount: totalPayout
    });

    // Record activity log
    await api.addActivityLog({
      action: "Generated monthly payroll",
      module: "Staff",
      time: new Date().toISOString().split('T')[0],
      user: "Admin"
    });

    setIsDialogOpen(false);
  };

  const filteredStaff = (staffList || []).filter(s => 
    (s.name?.toLowerCase() || "").includes(search.toLowerCase()) || 
    (s.department?.toLowerCase() || "").includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading directory...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/20">
              <Calculator className="mr-2 h-4 w-4" /> Generate Monthly Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Monthly Payroll Generation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Net Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No staff found.</TableCell>
                    </TableRow>
                  ) : (
                    staffList.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.role}</Badge></TableCell>
                        <TableCell className="text-right">₹{s.salary?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2} className="text-right">Total Payout:</TableCell>
                    <TableCell className="text-right text-primary">
                      ₹{staffList.reduce((acc, curr) => acc + (curr.salary || 0), 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button onClick={handleGeneratePayroll} disabled={staffList.length === 0}>
                Confirm & Initiate Processing
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Staff Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center space-x-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by name or department..." 
              className="max-w-sm border-0 focus-visible:ring-0 bg-transparent px-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No staff members found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((staff) => (
                  <TableRow key={staff.id}>
                    <TableCell className="font-medium text-muted-foreground">{staff.id}</TableCell>
                    <TableCell>{staff.name}</TableCell>
                    <TableCell>
                      <Badge variant={staff.role === "Admin" ? "secondary" : "default"}>
                        {staff.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{staff.department}</TableCell>
                    <TableCell>{staff.contact}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
