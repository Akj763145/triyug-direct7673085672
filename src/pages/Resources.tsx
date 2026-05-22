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
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";

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

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

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
              <AnimatePresence mode="popLayout" initial={false}>
                {(resources || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No resources found.</TableCell>
                  </TableRow>
                ) : (
                  resources.map((res) => (
                    <motion.tr 
                      key={res.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      layout
                      className="group border-b border-slate-100 hover:bg-muted/50 transition-colors"
                    >
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
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
