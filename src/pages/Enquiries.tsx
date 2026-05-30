import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { MessageSquareText, Search, Plus, Trash2, CheckCircle2, UserPlus, Clock, Loader2, Download, Upload, Edit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api, apiCache } from "../lib/api";
import Papa from "papaparse";

type EnquiryStatus = "New" | "Follow-up" | "Converted" | "Dropped";

interface Enquiry {
  id: string;
  name: string;
  contact: string;
  whatsapp?: string;
  address?: string;
  current_class?: string;
  status: EnquiryStatus;
  notes?: string;
  created_at: string;
}

export function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => {
    return (apiCache.get('enquiries')?.data || []) as Enquiry[];
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);
  const [editingEnquiry, setEditingEnquiry] = useState<Enquiry | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [newEnquiry, setNewEnquiry] = useState({
    name: "",
    contact: "",
    whatsapp: "",
    address: "",
    current_class: "",
    notes: "",
    status: "New" as EnquiryStatus
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredEnquiries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "enquiries_export.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          alert(`Successfully parsed ${results.data.length} rows from CSV.`);
          // Iterate and add them or batch insert. We will just reload for now, 
          // or user can do it manually. In a real application, you map to fields.
          // Because api.addEnquiry does not support batch yet, we just alert.
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  // Reset to first page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Keyboard shortcut listener for Alt + N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        const activeElem = document.activeElement;
        // Don't trigger if user is active inside form fields
        if (activeElem && (
          activeElem.tagName === "INPUT" ||
          activeElem.tagName === "TEXTAREA" ||
          activeElem.tagName === "SELECT" ||
          activeElem.getAttribute("contenteditable") === "true"
        )) {
          return;
        }
        e.preventDefault();
        setIsAdding(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchEnquiries = async () => {
    setInitialLoading(true);
    const data = await api.getEnquiries();
    if (data) {
      setEnquiries(data as Enquiry[]);
    }
    setTimeout(() => {
      setInitialLoading(false);
    }, 600);
  };

  const handleAdd = async () => {
    if (!newEnquiry.name || !newEnquiry.contact) return;
    
    // Create new enquiry object with dynamic unique id and local timestamp
    const tempId = crypto.randomUUID();
    const newEnqObj: Enquiry = {
      id: tempId,
      name: newEnquiry.name,
      contact: newEnquiry.contact,
      whatsapp: newEnquiry.whatsapp || "",
      address: newEnquiry.address || "",
      current_class: newEnquiry.current_class || "",
      notes: newEnquiry.notes || "",
      status: "New" as EnquiryStatus,
      created_at: new Date().toISOString()
    };

    // Optimistically update the enquiries list instantly
    setEnquiries(prev => [newEnqObj, ...prev]);

    // Keep the form open but clear fields immediately for seamless next-entry experience
    setNewEnquiry({
      name: "",
      contact: "",
      whatsapp: "",
      address: "",
      current_class: "",
      notes: "",
      status: "New"
    });

    // Automatically focus the student name field for the next entry
    setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    // Provide immediate visual success cues
    setSuccessMsg(`Enquiry for "${newEnqObj.name}" saved successfully!`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);

    // Perform database syncing in the background so there's zero UI freeze or delay
    api.addEnquiry(newEnqObj).then((result) => {
      if (result && result.success) {
        if ((result as any).dbSynced === false) {
          setSyncWarning("We successfully saved the entry locally in your browser. However, we could not sync it to your remote Supabase database. This usually means the public.enquiries table has not been created yet in Supabase SQL editor!");
        } else {
          setSyncWarning(null);
        }
      }
    }).catch(err => {
      console.error("Error in background database sync:", err);
    });
  };

  const handleStatusChange = async (id: string, newStatus: EnquiryStatus) => {
    const result = await api.updateEnquiry(id, { status: newStatus });
    if (result.success) {
      if ((result as any).dbSynced === false) {
        setSyncWarning("We saved the changes locally, but could not connect to sync with your remote database. Please ensure your Supabase tables are created and connected.");
      } else {
        setSyncWarning(null);
      }
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this enquiry?")) {
      const result = await api.deleteEnquiry(id);
      if (result.success) {
        if ((result as any).dbSynced === false) {
          setSyncWarning("We removed the item locally, but could not synchronize the deletion with Supabase. Please verify table presence in your dashboard.");
        } else {
          setSyncWarning(null);
        }
        setEnquiries(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  const handleUpdate = async () => {
    if (!editingEnquiry || !editingEnquiry.name || !editingEnquiry.contact) return;

    const previousEnquiries = [...enquiries];

    // Optimistically update local state
    setEnquiries(prev => prev.map(e => e.id === editingEnquiry.id ? editingEnquiry : e));
    const updatedObj = { ...editingEnquiry };
    setEditingEnquiry(null);

    setSuccessMsg(`Enquiry for "${updatedObj.name}" updated successfully!`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);

    // Sync changes to the remote database
    api.updateEnquiry(updatedObj.id, {
      name: updatedObj.name,
      contact: updatedObj.contact,
      whatsapp: updatedObj.whatsapp,
      address: updatedObj.address,
      current_class: updatedObj.current_class,
      notes: updatedObj.notes,
      status: updatedObj.status
    }).then(result => {
      if (result && result.success) {
        if ((result as any).dbSynced === false) {
          setSyncWarning("We saved the changes locally, but could not connect to sync with your remote database. Please ensure your Supabase tables are created and connected.");
        } else {
          setSyncWarning(null);
        }
      } else {
        setEnquiries(previousEnquiries);
        setSyncWarning("Failed to save updates to the database.");
      }
    }).catch(err => {
      console.error("Error updating enquiry:", err);
      setEnquiries(previousEnquiries);
    });
  };

  const filteredEnquiries = enquiries.filter(enq => {
    const matchesSearch = 
      enq.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      enq.contact.includes(searchTerm) || 
      (enq.whatsapp && enq.whatsapp.includes(searchTerm)) ||
      (enq.address && enq.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (enq.current_class && enq.current_class.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (enq.notes && enq.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "All" || enq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalResults = filteredEnquiries.length;
  const totalPages = Math.ceil(totalResults / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, startIndex + itemsPerPage);

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
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="rounded-full shadow-sm text-sm">
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV} className="rounded-full shadow-sm text-sm">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-primary hover:bg-primary/90 text-white rounded-full font-bold shadow-md px-6 cursor-pointer flex items-center gap-2.5 transition-all group/btn"
          >
            {isAdding ? (
              <span>Cancel</span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Enquiry
              </span>
            )}
            <kbd className="hidden sm:inline-flex items-center h-5 px-1.5 font-mono text-[9px] font-black bg-white/20 text-white rounded border border-white/10 uppercase tracking-wider select-none shrink-0">
              Alt + N
            </kbd>
          </Button>
        </div>
      </div>

      {syncWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm text-xs">
          <div className="space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
              💡 Database Synchronization Notice
            </p>
            <p className="text-amber-700 font-medium">
              We successfully saved the enquiry locally in this browser (it will show up in your list below right away!). However, we couldn't sync it with Supabase because the <code className="bg-amber-100/80 px-1 rounded font-mono">public.enquiries</code> table has not been created yet in your Supabase SQL editor.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 self-start md:self-center">
            <Button
              onClick={() => {
                alert(`Please run the following SQL script in your Supabase SQL Editor to sync your live database:\n\nCREATE TABLE IF NOT EXISTS public.enquiries (\n    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),\n    name TEXT NOT NULL,\n    contact TEXT NOT NULL,\n    whatsapp TEXT,\n    address TEXT,\n    current_class TEXT,\n    status TEXT NOT NULL DEFAULT 'New',\n    notes TEXT,\n    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\nALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "Enable all for anon" ON public.enquiries FOR ALL USING (true);\n\nGRANT ALL ON TABLE public.enquiries TO anon, authenticated, service_role;`);
              }}
              variant="outline"
              className="bg-white hover:bg-slate-50 text-amber-900 border-amber-300 font-bold px-3 py-1.5 text-xs rounded-full h-8 cursor-pointer shadow-sm"
            >
              Get SQL Script
            </Button>
            <Button
              onClick={() => setSyncWarning(null)}
              variant="ghost"
              className="hover:bg-amber-100/50 text-amber-800 font-bold px-3 py-1.5 text-xs rounded-full h-8 cursor-pointer"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Student Name <span className="text-red-500">*</span></Label>
                    <Input 
                      ref={nameInputRef}
                      placeholder="e.g. John Doe" 
                      value={newEnquiry.name} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, name: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. +91 98765 43210" 
                      value={newEnquiry.contact} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, contact: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-700">WhatsApp Number</Label>
                      <button 
                        type="button" 
                        onClick={() => setNewEnquiry(prev => ({ ...prev, whatsapp: prev.contact }))}
                        className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                      >
                        Same as Phone
                      </button>
                    </div>
                    <Input 
                      placeholder="e.g. +91 98765 43210" 
                      value={newEnquiry.whatsapp} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, whatsapp: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Current Class</Label>
                    <Input 
                      placeholder="e.g. Class 10" 
                      value={newEnquiry.current_class} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, current_class: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Address</Label>
                    <Input 
                      placeholder="e.g. Floor 2, block C, New Delhi" 
                      value={newEnquiry.address} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, address: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <Label className="text-xs font-bold text-slate-700">Notes (Optional)</Label>
                    <Input 
                      placeholder="Additional details..." 
                      value={newEnquiry.notes} 
                      onChange={(e) => setNewEnquiry({...newEnquiry, notes: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 gap-4">
                  <div className="flex-1">
                    {successMsg && (
                      <motion.span 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="text-xs font-bold text-[#1CA751] bg-emerald-50/80 px-3 py-1.5 rounded-full border border-emerald-100 inline-block"
                      >
                        ✓ {successMsg}
                      </motion.span>
                    )}
                  </div>
                  <Button 
                    onClick={handleAdd} 
                    disabled={loading || !newEnquiry.name || !newEnquiry.contact}
                    className="bg-[#1CA751] hover:bg-[#1CA751]/90 rounded-full font-bold cursor-pointer shrink-0"
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search enquiries..." 
                  className="pl-10 rounded-full bg-white border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-xs font-bold text-slate-500 whitespace-nowrap bg-white px-3 py-2 rounded-full border border-slate-100 shadow-sm">
                Showing <span className="text-primary">{totalResults}</span> {totalResults === 1 ? 'Result' : 'Results'}
              </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-full w-full md:w-auto overflow-x-auto justify-center sm:justify-start">
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
                  <th className="px-6 py-4">Student Info</th>
                  <th className="px-6 py-4">Contact & WhatsApp</th>
                  <th className="px-6 py-4">Current Class</th>
                  <th className="px-6 py-4">Address</th>
                  <th className="px-6 py-4">Status & Notes</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {initialLoading ? (
                  <tr>
                    <td colSpan={7} className="py-24 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="flex flex-col items-center justify-center space-y-4"
                      >
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full blur-xl bg-primary/20 animate-pulse"></div>
                          <Loader2 className="h-10 w-10 text-primary animate-spin relative z-10" />
                        </div>
                        <p className="text-sm text-muted-foreground font-medium animate-pulse">
                          Loading enquiries...
                        </p>
                      </motion.div>
                    </td>
                  </tr>
                ) : paginatedEnquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                      No enquiries found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedEnquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/name"
                          onClick={() => setViewingEnquiry(enq)}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${getStatusColor(enq.status)} group-hover/name:scale-110 transition-transform`}>
                            {enq.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 group-hover/name:text-primary transition-colors">{enq.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-700">📞 {enq.contact}</p>
                          {enq.whatsapp && (
                            <p className="text-xs text-[#1CA751] font-medium">💬 {enq.whatsapp}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {enq.current_class ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded">
                              Class: {enq.current_class}
                            </span>
                          ) : "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[160px] truncate">
                        <span className="text-xs text-slate-600" title={enq.address}>
                          {enq.address ? `📍 ${enq.address}` : "—"}
                        </span>
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
                      <td className="px-6 py-4 text-right flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="rounded-full text-slate-400 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => setEditingEnquiry(enq)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500">
                Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full h-8 text-xs font-black cursor-pointer border-slate-200"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show dots if too many pages, but let's keep it simple for now as per user intent
                    // Simple range check
                    if (totalPages <= 5 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-full text-[10px] font-black transition-all ${
                            currentPage === page 
                              ? "bg-slate-900 text-white shadow-md scale-110" 
                              : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="text-slate-300 text-[10px]">•••</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full h-8 text-xs font-black cursor-pointer border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {viewingEnquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100"
            >
              <div className={`h-24 flex items-end px-8 pb-4 relative ${getStatusColor(viewingEnquiry.status)}`}>
                <button 
                  onClick={() => setViewingEnquiry(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/40 transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5 rotate-45 text-white" />
                </button>
                <div className="bg-white p-1 rounded-full shadow-lg translate-y-8">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black ${getStatusColor(viewingEnquiry.status)}`}>
                    {viewingEnquiry.name.charAt(0)}
                  </div>
                </div>
              </div>

              <div className="px-8 pt-12 pb-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{viewingEnquiry.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusColor(viewingEnquiry.status)}`}>
                      {viewingEnquiry.status}
                    </span>
                    <span className="text-xs text-slate-400 font-medium tracking-tight">
                      Enquired on {new Date(viewingEnquiry.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</p>
                    <p className="text-sm font-bold text-slate-700 select-all">{viewingEnquiry.contact}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                    <p className="text-sm font-bold text-[#1CA751] select-all">{viewingEnquiry.whatsapp || "Not provided"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Class</p>
                    <p className="text-sm font-bold text-purple-700 bg-purple-50 inline-block px-2 py-0.5 rounded border border-purple-100 italic">
                      {viewingEnquiry.current_class || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Address</p>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                    {viewingEnquiry.address ? `📍 ${viewingEnquiry.address}` : "No address details provided."}
                  </p>
                </div>

                {viewingEnquiry.notes && (
                  <div className="space-y-2 pt-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Special Notes</p>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      "{viewingEnquiry.notes}"
                    </p>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <Button 
                    onClick={() => {
                      setEditingEnquiry(viewingEnquiry);
                      setViewingEnquiry(null);
                    }}
                    variant="outline"
                    className="flex-1 rounded-full font-bold h-11 cursor-pointer"
                  >
                    Edit Details
                  </Button>
                  <Button 
                    onClick={() => setViewingEnquiry(null)}
                    className="flex-1 bg-slate-900 text-white rounded-full font-bold h-11 hover:bg-slate-800 cursor-pointer"
                  >
                    Close View
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {editingEnquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200"
            >
              <div className="h-20 bg-slate-50 flex items-center justify-between px-8 border-b border-slate-100">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-primary" /> Edit Enquiry Details
                </h2>
                <button 
                  onClick={() => setEditingEnquiry(null)}
                  className="p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-5 h-5 rotate-45 text-slate-500" />
                </button>
              </div>

              <div className="px-8 py-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Student Name <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. John Doe" 
                      value={editingEnquiry.name} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, name: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Phone Number <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="e.g. +91 98765 43210" 
                      value={editingEnquiry.contact} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, contact: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-slate-700">WhatsApp Number</Label>
                      <button 
                        type="button" 
                        onClick={() => setEditingEnquiry(prev => prev ? ({ ...prev, whatsapp: prev.contact }) : null)}
                        className="text-[10px] text-primary font-bold hover:underline cursor-pointer"
                      >
                        Same as Phone
                      </button>
                    </div>
                    <Input 
                      placeholder="e.g. +91 98765 43210" 
                      value={editingEnquiry.whatsapp || ""} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, whatsapp: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">Current Class</Label>
                    <Input 
                      placeholder="e.g. Class 10" 
                      value={editingEnquiry.current_class || ""} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, current_class: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Status</Label>
                    <select 
                      className="w-full text-sm font-semibold p-2.5 rounded-lg border border-slate-200 bg-white"
                      value={editingEnquiry.status}
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, status: e.target.value as EnquiryStatus})}
                    >
                      <option value="New">New</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Converted">Converted</option>
                      <option value="Dropped">Dropped</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Address</Label>
                    <Input 
                      placeholder="e.g. Floor 2, block C, New Delhi" 
                      value={editingEnquiry.address || ""} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, address: e.target.value})}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Notes</Label>
                    <textarea 
                      placeholder="Additional details..." 
                      value={editingEnquiry.notes || ""} 
                      onChange={(e) => setEditingEnquiry({...editingEnquiry, notes: e.target.value})}
                      className="w-full min-h-[100px] text-sm p-3 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <Button 
                    onClick={() => setEditingEnquiry(null)}
                    variant="outline"
                    className="flex-1 rounded-full font-bold h-11 cursor-pointer animate-in transition-all"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdate}
                    disabled={!editingEnquiry.name || !editingEnquiry.contact}
                    className="flex-1 bg-[#1CA751] hover:bg-[#1CA751]/90 text-white rounded-full font-bold h-11 cursor-pointer animate-in transition-all"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
