import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Plus, Edit, Eye, ChevronLeft, ChevronRight, UserPlus, Download, Upload, ArrowUpCircle, GraduationCap, Loader2, Bus } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { Checkbox } from "../components/ui/checkbox";
import { api, apiCache } from "../lib/api";
import { supabase } from "../lib/supabase";
import { Student } from "../types";
import Papa from "papaparse";
import { motion, AnimatePresence } from "motion/react";
import { AddStudentWizard } from "../components/AddStudentWizard";

export function Students() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>(() => {
    // If we have cached profiles and students, we could theoretically piece them together.
    // For simplicity, if they aren't fully resolved, we will just await it.
    // But we don't have synchronous getStudents().
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters & Sorting Option
  const [gradeFilter, setGradeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [batchFilter, setBatchFilter] = useState("All");
  const [transportFilter, setTransportFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "batch" | "newest">("newest");
  const [batches, setBatches] = useState<any[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadStudents = async () => {
    setLoading(true);
    const [studentsData, batchesData] = await Promise.all([
      api.getStudents(),
      api.getBatches()
    ]);
    setStudents(studentsData as Student[]);
    setBatches(batchesData as any[]);
    
    // Add visual delay so Loader2 shows
    setTimeout(() => {
      setLoading(false);
    }, 600);
  };

  const batchMap = React.useMemo(() => {
    const map = new Map<string, string>();
    batches.forEach(b => {
      if (b.id && b.name) map.set(b.id, b.name);
    });
    return map;
  }, [batches]);

  useEffect(() => {
    loadStudents();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  // Advanced Filtering Logic
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          (s.student_id || s.id).toLowerCase().includes(search.toLowerCase()) ||
                          (s.contact && s.contact.toLowerCase().includes(search.toLowerCase())) ||
                          (s.parent1_contact && s.parent1_contact.toLowerCase().includes(search.toLowerCase())) ||
                          (s.parent2_contact && s.parent2_contact.toLowerCase().includes(search.toLowerCase())) ||
                          (s.parent1_whatsapp && s.parent1_whatsapp.toLowerCase().includes(search.toLowerCase()));
    const matchesGrade = gradeFilter === "All" || s.grade === gradeFilter;
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    const matchesBatch = batchFilter === "All" || s.batch_id === batchFilter;
    const matchesTransport = transportFilter === "All" || 
      (transportFilter === "Transport" ? s.transport_facilitated === true : !s.transport_facilitated);
    
    return matchesSearch && matchesGrade && matchesStatus && matchesBatch && matchesTransport;
  });

  const sortedStudents = React.useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortBy === "batch") {
        const batchA = batchMap.get(a.batch_id || "") || "";
        const batchB = batchMap.get(b.batch_id || "") || "";
        if (batchA === batchB) {
          return a.name.localeCompare(b.name); // Secondary sort by name
        }
        if (!batchA) return 1; // Put "No Batch" at the bottom
        if (!batchB) return -1;
        return batchA.localeCompare(batchB);
      } else if (sortBy === "newest") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        // If created_at is strictly identical (e.g., both 0 or equal date), fallback to name reversed or string comparison of ID
        if (dateB === dateA) {
          return b.id.localeCompare(a.id);
        }
        return dateB - dateA;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [filteredStudents, sortBy, batchMap]);

  // Unique grades for filter
  const grades = ["All", ...new Set(students.map(s => s.grade))];
  const statuses = ["All", "Active", "Inactive", "Graduated", "Pending"];

  // Pagination logic
  const totalItems = sortedStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedStudents = sortedStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filtering
  }, [search, gradeFilter, statusFilter, batchFilter, transportFilter, sortBy]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(paginatedStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, id]);
    } else {
      setSelectedStudents(prev => prev.filter(studentId => studentId !== id));
    }
  };

  const handleBatchPromote = () => {
    alert(`Promotion logic for ${selectedStudents.length} students would increment their grade in a production environment.`);
    setSelectedStudents([]);
  };

  const handleBatchGraduate = async () => {
    if (!selectedStudents.length || !supabase) return;
    
    setLoading(true);
    try {
      const uuids = selectedStudents.filter(id => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id));
      
      const promises = [];
      if (uuids.length > 0) {
        promises.push(supabase.from('student_profiles').update({ status: 'Graduated' }).in('id', uuids));
      }
      promises.push(supabase.from('student_profiles').update({ status: 'Graduated' }).in('student_id', selectedStudents));
      promises.push(supabase.from('students').update({ status: 'Graduated' }).in('id', selectedStudents));

      await Promise.allSettled(promises);
      
      apiCache.clear();
      await loadStudents();
      setSelectedStudents([]);
    } catch (err) {
      console.error("Batch graduation failed:", err);
      alert("Failed to update status for some students.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentStatus = async (student: Student) => {
    if (!supabase) return;
    const newStatus = student.status === 'Active' ? 'Graduated' : 'Active';
    
    try {
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(student.id);

      const promises = [];
      if (isUUID) {
        promises.push(supabase.from('student_profiles').update({ status: newStatus }).eq('id', student.id));
      }
      promises.push(supabase.from('student_profiles').update({ status: newStatus }).eq('student_id', student.id));
      promises.push(supabase.from('students').update({ status: newStatus }).eq('id', student.id));

      const results = await Promise.allSettled(promises);
      
      const hasSuccess = results.some(r => r.status === 'fulfilled' && !r.value.error);
      
      if (hasSuccess) {
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: newStatus } : s));
        apiCache.clear();
      }
    } catch (err) {
      console.error("Error toggling status:", err);
    }
  };

  const handleToggleTransport = async (studentId: string, currentValue: boolean) => {
    try {
      await api.updateStudentTransport(studentId, !currentValue);
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, transport_facilitated: !currentValue } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(filteredStudents);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "students_export.csv";
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          alert(`Successfully parsed ${results.data.length} rows from CSV.`);
          // In a real app, you would batch insert these into Supabase here
        }
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const TableSkeleton = () => (
    <TableRow>
      <TableCell colSpan={8} className="py-24 text-center">
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
             Loading students...
           </p>
        </motion.div>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Students</h2>
          <p className="text-muted-foreground">Manage your student roster and information</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>

          <Button className="shadow-lg shadow-primary/20" onClick={() => setIsWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add New Student
          </Button>
          
          <AddStudentWizard 
            open={isWizardOpen} 
            onOpenChange={setIsWizardOpen} 
            onSuccess={() => {
              setIsWizardOpen(false);
              loadStudents();
            }} 
          />
        </div>
      </div>

      {selectedStudents.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 mb-4 animate-in fade-in slide-in-from-top-2">
          <CardContent className="flex items-center justify-between py-3 px-4">
            <div className="text-sm font-medium text-primary">
              {selectedStudents.length} student(s) selected
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleBatchPromote}>
                <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" />
                Promote to Next Grade
              </Button>
              <Button size="sm" variant="outline" onClick={handleBatchGraduate}>
                <GraduationCap className="mr-2 h-4 w-4 text-blue-500" />
                Mark as Graduated
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="col-span-1 lg:col-span-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, student ID, mobile or WhatsApp no..." 
              className="pl-9 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>
        
        <div className="col-span-1 lg:col-span-9 grid grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <select 
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
            >
              {grades.map(g => <option key={g} value={g}>{g === "All" ? "All Grades" : g}</option>)}
            </select>
          </div>
          <div>
             <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
            >
              {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
            </select>
          </div>
          <div>
            <select 
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
            >
              <option value="All">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <select 
              value={transportFilter}
              onChange={(e) => setTransportFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
            >
              <option value="All">All Transport</option>
              <option value="Transport">Using Transport</option>
              <option value="No Transport">No Transport</option>
            </select>
          </div>
          <div>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "batch" | "newest")}
              className="w-full h-10 px-3 py-2 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-md text-sm font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-gold appearance-none cursor-pointer transition-colors"
            >
              <option value="newest">Sort: Newest First 🕒</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="batch">Sort: Batch Wise 🗂️</option>
            </select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox 
                    checked={paginatedStudents.length > 0 && selectedStudents.length === paginatedStudents.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[120px]">Student ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout" initial={false}>
                {loading ? (
                  <TableSkeleton />
                ) : paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-64 text-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center space-y-2 opacity-50"
                      >
                        <UserPlus className="h-10 w-10 mb-2" />
                        <p className="text-lg font-medium">No results found</p>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                        <Button variant="link" onClick={() => { setSearch(""); setGradeFilter("All"); setStatusFilter("All"); setBatchFilter("All"); setSortBy("name"); }}>
                          Clear all filters
                        </Button>
                      </motion.div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student, idx) => (
                    <motion.tr 
                      key={student.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      layout
                      className="group transition-colors hover:bg-muted/50 border-b border-slate-100"
                    >
                      <TableCell>
                        <Checkbox 
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(c) => handleSelectStudent(student.id, c as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{student.student_id || student.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">
                        <button 
                          onClick={() => navigate(`/students/${student.id}`)}
                          className="hover:text-primary transition-colors hover:underline cursor-pointer text-left"
                        >
                          {student.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        {student.batch_id ? (
                          <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-150 rounded font-medium text-xs px-2.5 py-0.5 max-w-[160px] truncate block text-center">
                            {batchMap.get(student.batch_id) || "Loading..."}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No Batch Assigned</span>
                        )}
                      </TableCell>
                      <TableCell>{student.grade}</TableCell>
                      <TableCell className="text-sm font-mono">{student.contact}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.status === "Active" ? "success" : student.status === "Graduated" ? "default" : "secondary"}
                          className="rounded-full px-2"
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={`h-8 w-8 ${student.transport_facilitated ? 'text-amber-500 bg-amber-50 shadow-sm border border-amber-200/50' : 'text-slate-400'}`}
                          onClick={() => handleToggleTransport(student.id, student.transport_facilitated || false)}
                          title={student.transport_facilitated ? "Using Transport" : "No Transport"}
                        >
                          <Bus className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${student.status === 'Active' ? 'text-emerald-500' : 'text-blue-500'}`}
                          onClick={() => toggleStudentStatus(student)}
                          title={student.status === 'Active' ? "Mark as Graduated" : "Re-activate"}
                        >
                          {student.status === 'Active' ? <GraduationCap className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${student.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => navigate(`/students/${student.id}?edit=true`)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
          
          {!loading && filteredStudents.length > 0 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Showing {Math.min(filteredStudents.length, itemsPerPage)} of {totalItems} Students
              </p>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <div className="flex items-center space-x-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <Button 
                      key={i} 
                      variant={currentPage === i + 1 ? "default" : "ghost"}
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

