import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MessageSquareText, Search, Plus, Trash2, CheckCircle2, UserPlus, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../lib/api";

type EnquiryStatus = "New" | "Follow-up" | "Converted" | "Dropped";

interface Enquiry {
  id: string;
  name: string;
  contact: string;
  interested_course: string;
  status: EnquiryStatus;
  notes?: string;
  created_at: string;
}

export function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [newEnquiry, setNewEnquiry] = useState({
    name: "",
    contact: "",
    interested_course: "",
    notes: "",
    status: "New" as EnquiryStatus
  });

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    const data = await api.getEnquiries();
    if (data) {
      setEnquiries(data as Enquiry[]);
    }
  };

  const handleAdd = async () => {
    if (!newEnquiry.name || !newEnquiry.contact || !newEnquiry.interested_course) return;
    setLoading(true);
    const result = await api.addEnquiry(newEnquiry);
    if (result.success) {
      await fetchEnquiries();
      setIsAdding(false);
      setNewEnquiry({ name: "", contact: "", interested_course: "", notes: "", status: "New" });
    }
    setLoading(false);
  };

  const handleStatusChange = async (id: string, newStatus: EnquiryStatus) => {
    const result = await api.updateEnquiry(id, { status: newStatus });
    if (result.success) {
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this enquiry?")) {
      const result = await api.deleteEnquiry(id);
      if (result.success) {
        setEnquiries(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  const filteredEnquiries = enquiries.filter(enq => {
    const matchesSearch = enq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          enq.contact.includes(searchTerm) || 
                          enq.interested_course.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || enq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-800";
      case "Follow-up": return "bg-orange-100 text-orange-800";
      case "Converted": return "bg-green-100 text-green-800";
      case "Dropped": return "bg-red-100 text-red-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquareText className="h-6 w-6 text-primary" /> Admissions & Enquiries
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage prospective students, follow-ups, and conversions.</p>
        </div>
        <Button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md px-6 cursor-pointer"
        >
          {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> New Enquiry</>}
        </Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border border-primary/20 shadow-sm bg-primary/5">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Prospect Name</Label>
                    <Input 
                      placeholder="e.g. John Doe" 
                      value={newEnquiry.name} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, name: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Contact Number</Label>
                    <Input 
                      placeholder="+91..." 
                      value={newEnquiry.contact} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, contact: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Interested Course / Batch</Label>
                    <Input 
                      placeholder="e.g. 10th Grade Maths" 
                      value={newEnquiry.interested_course} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, interested_course: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Notes (Optional)</Label>
                    <Input 
                      placeholder="Additional details..." 
                      value={newEnquiry.notes} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, notes: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleAdd} 
                    disabled={loading || !newEnquiry.name || !newEnquiry.contact || !newEnquiry.interested_course}
                    className="bg-[#1CA751] hover:bg-[#1CA751]/90 rounded-full font-bold cursor-pointer"
                  >
                    {loading ? "Saving..." : "Save Enquiry"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border border-slate-100 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search name, phone, or course..." 
                className="pl-10 rounded-full bg-white border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-full w-full sm:w-auto overflow-x-auto">
              {["All", "New", "Follow-up", "Converted", "Dropped"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === status 
                      ? "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Prospect Info</th>
                  <th className="px-6 py-4">Course Interest</th>
                  <th className="px-6 py-4">Status & Notes</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                      No enquiries found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEnquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getStatusColor(enq.status)}`}>
                            {enq.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{enq.name}</p>
                            <p className="text-xs text-slate-500">{enq.contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700 text-sm">{enq.interested_course}</span>
                      </td>
                      <td className="px-6 py-4 space-y-1.5">
                        <select 
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border-none cursor-pointer outline-none appearance-none ${getStatusColor(enq.status)}`}
                          value={enq.status}
                          onChange={(e) => handleStatusChange(enq.id, e.target.value as EnquiryStatus)}
                        >
                          <option value="New">● New</option>
                          <option value="Follow-up">● Follow-up</option>
                          <option value="Converted">● Converted</option>
                          <option value="Dropped">● Dropped</option>
                        </select>
                        {enq.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1" title={enq.notes}>
                            📝 {enq.notes}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> 
                          {new Date(enq.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => handleDelete(enq.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
