import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Plus, Edit, Eye, ChevronLeft, ChevronRight, UserPlus, Download, Upload, ArrowUpCircle, GraduationCap } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { Checkbox } from "../components/ui/checkbox";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
import { Student } from "../types";
import Papa from "papaparse";
import { motion, AnimatePresence } from "motion/react";
import { AddStudentWizard } from "../components/AddStudentWizard";

export function Students() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [gradeFilter, setGradeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadStudents = async () => {
    setLoading(true);
    const data = await api.getStudents();
    setStudents(data as Student[]);
    setLoading(false);
  };

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
                         (s.student_id || s.id).toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "All" || s.grade === gradeFilter;
    const matchesStatus = statusFilter === "All" || s.status === statusFilter;
    
    return matchesSearch && matchesGrade && matchesStatus;
  });

  // Unique grades for filter
  const grades = ["All", ...new Set(students.map(s => s.grade))];
  const statuses = ["All", "Active", "Inactive", "Graduated"];

  // Pagination logic
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filtering
  }, [search, gradeFilter, statusFilter]);

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
      const { error: profileError } = await supabase
        .from('student_profiles')
        .update({ status: 'Graduated' })
        .in('id', selectedStudents);
      
      const { error: studentError } = await supabase
        .from('students')
        .update({ status: 'Graduated' })
        .in('id', selectedStudents);

      if (profileError && studentError) throw profileError;
      
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
      // Parallel update attempt for both potential tables
      await Promise.all([
        supabase.from('student_profiles').update({ status: newStatus }).eq('id', student.id),
        supabase.from('students').update({ status: newStatus }).eq('id', student.id)
      ]);
      
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error("Error toggling status:", err);
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
    <>
      {[...Array(5)].map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
          <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or student ID..." 
              className="pl-9 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Card>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <select 
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              {grades.map(g => <option key={g} value={g}>{g === "All" ? "All Grades" : g}</option>)}
            </select>
          </div>
          <div className="flex-1">
             <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring appearance-none"
            >
              {statuses.map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
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
                    <TableCell colSpan={7} className="h-64 text-center">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center space-y-2 opacity-50"
                      >
                        <UserPlus className="h-10 w-10 mb-2" />
                        <p className="text-lg font-medium">No results found</p>
                        <p className="text-sm">Try adjusting your filters or search terms</p>
                        <Button variant="link" onClick={() => { setSearch(""); setGradeFilter("All"); setStatusFilter("All"); }}>
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
                          className={`h-8 w-8 ${student.status === 'Active' ? 'text-emerald-500' : 'text-blue-500'}`}
                          onClick={() => toggleStudentStatus(student)}
                          title={student.status === 'Active' ? "Mark as Graduated" : "Re-activate"}
                        >
                          {student.status === 'Active' ? <GraduationCap className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${student.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
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

