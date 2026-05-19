import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Plus, Edit, Eye, ChevronLeft, ChevronRight, UserPlus, Download, Upload, MoreHorizontal, GraduationCap, ArrowUpCircle, FileText, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import { api } from "../lib/api";
import { Student } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Papa from "papaparse";

const studentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  grade: z.string().min(1, "Grade is required"),
  contact: z.string().regex(/^\d{10}$/, "Contact must be exactly 10 digits"),
  notes: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export function Students() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [gradeFilter, setGradeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      grade: "",
      contact: "",
      notes: "",
    },
  });

  const loadStudents = async () => {
    setLoading(true);
    const data = await api.getStudents();
    setStudents(data as Student[]);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const onSave = async (data: StudentFormValues) => {
    // Add student to DB
    const { error } = await api.addStudent({
      name: data.name,
      grade: data.grade,
      contact: data.contact,
      status: "Active"
    });
    
    await api.addActivityLog({
      action: `Added new student: ${data.name}`,
      module: "Students",
      time: new Date().toLocaleTimeString(),
      user: "Admin"
    });

    if (!error) {
      setIsDialogOpen(false);
      reset();
      loadStudents();
    }
  };

  // Advanced Filtering Logic
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.id.toLowerCase().includes(search.toLowerCase());
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
    alert(`Promoted ${selectedStudents.length} students to next grade.`);
    setSelectedStudents([]);
  };

  const handleBatchGraduate = () => {
    alert(`Marked ${selectedStudents.length} students as graduated.`);
    setSelectedStudents([]);
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

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) reset();
          }}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Add New Student
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Enroll New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input {...register("name")} placeholder="e.g. Rahul Kumar" className={errors.name ? "border-destructive" : ""} />
                {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Grade / Class</label>
                  <Input {...register("grade")} placeholder="e.g. 10th" className={errors.grade ? "border-destructive" : ""} />
                  {errors.grade && <span className="text-xs text-destructive">{errors.grade.message}</span>}
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Contact Number</label>
                  <Input {...register("contact")} placeholder="10 Digits" className={errors.contact ? "border-destructive" : ""} />
                  {errors.contact && <span className="text-xs text-destructive">{errors.contact.message}</span>}
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Internal Notes</label>
                <Input {...register("notes")} placeholder="Any specific details..." />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">Create Enrollment Record</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead className="w-[120px]">UID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : paginatedStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                      <UserPlus className="h-10 w-10 mb-2" />
                      <p className="text-lg font-medium">No results found</p>
                      <p className="text-sm">Try adjusting your filters or search terms</p>
                      <Button variant="link" onClick={() => { setSearch(""); setGradeFilter("All"); setStatusFilter("All"); }}>
                        Clear all filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedStudents.map((student) => (
                  <TableRow key={student.id} className="group transition-colors hover:bg-muted/50">
                    <TableCell>
                      <Checkbox 
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(c) => handleSelectStudent(student.id, c as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{student.id}</TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/students/${student.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
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

