import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { MonitorPlay } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import { Resource } from "../types";

export function Resources() {
  const [assignee, setAssignee] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);

  const loadResources = async () => {
    const data = await api.getResources();
    setResources(data as Resource[]);
    setLoading(false);
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleCheckout = async (resourceId: string, resourceName: string) => {
    if (!assignee) return;

    // Update status in DB
    await api.updateResourceStatus(resourceId, "In Use");

    // Add Activity Log
    await api.addActivityLog({
      action: `Checked out ${resourceName} to ${assignee}`,
      module: "Resources",
      time: new Date().toISOString().split('T')[0],
      user: "Admin"
    });

    setOpenDialogId(null);
    setAssignee("");
    setReturnDate("");
    loadResources(); // Reload updated resources
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading resources...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Resource Management</h2>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(resources || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No resources found.</TableCell>
                </TableRow>
              ) : (
                resources.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium text-muted-foreground">{res.id}</TableCell>
                    <TableCell>{res.name}</TableCell>
                    <TableCell>{res.category}</TableCell>
                    <TableCell>{res.location}</TableCell>
                    <TableCell>
                       <Badge variant={res.status === "Available" ? "success" : res.status === "In Use" ? "warning" : "destructive"}>
                        {res.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={openDialogId === res.id} onOpenChange={(open) => setOpenDialogId(open ? res.id : null)}>
                        <DialogTrigger asChild>
                           <Button variant="outline" size="sm" disabled={res.status !== "Available"}>
                              <MonitorPlay className="mr-2 h-4 w-4" /> Checkout
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Checkout Asset: {res.name}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Assign To (Staff ID/Name)</label>
                              <Input 
                                placeholder="e.g. STF-201" 
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <label className="text-sm font-medium">Expected Return Date</label>
                              <Input 
                                type="date" 
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button onClick={() => handleCheckout(res.id, res.name)}>Confirm Assignment</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
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
