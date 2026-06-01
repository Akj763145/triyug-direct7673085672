import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "./ui/checkbox";
import { ChevronRight, ChevronLeft, Save, Upload, User, Users, GraduationCap, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDropzone } from "react-dropzone";
import { api } from "../lib/api";

const wizardSchema = z.object({
  firstName: z.string().min(2, "Required"),
  lastName: z.string().min(2, "Required"),
  dateOfBirth: z.string().min(1, "DOB is required"),
  enrollmentDate: z.string().min(1, "Enrollment Date is required"),
  gender: z.string().min(1, "Required"),
  nationality: z.string().default("Domestic"),
  isInternational: z.boolean().default(false),
  passportNumber: z.string().optional(),
  visaStatus: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  batchId: z.string().min(1, "Batch is required"),
  installmentsCount: z.string().optional(), // Make optional because we have custom fee structure now

  // Fee Structure
  downpaymentAmount: z.string().optional(),
  feePerInstallmentAmount: z.string().min(1, "Amount is required"),
  feeInstallmentGap: z.string().min(1, "Gap (in months) is required"),
  feeDuration: z.string().optional(),
  feeAsLongAsContinues: z.boolean().default(false),

  parent1Name: z.string().min(2, "Required"),
  parent1Relation: z.string().min(2, "Required"),
  parent1Occupation: z.string().optional(),
  parent1Whatsapp: z.string().optional().or(z.literal('')),
  parent1Contact: z.string().regex(/^\d{10}$/, "Must be 10 digits"),

  addressLine1: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(4, "Required"),

  previousSchool: z.string().optional(),
  lastGradeCompleted: z.string().optional(),
  reasonForLeaving: z.string().optional(),
  previousGpa: z.string().optional(),

  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  dailyMedications: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
});

type WizardFormValues = z.infer<typeof wizardSchema>;

const STEPS = [
  { id: 1, title: "Student details", icon: User },
  { id: 2, title: "Fee Structure", icon: GraduationCap }, // We will use GraduationCap or FileText, let's use GraduationCap
  { id: 3, title: "Parent & Address", icon: Users },
  { id: 4, title: "Documents", icon: FileText },
];

interface DocumentDropzoneProps {
  docType: string;
  label: string;
  file?: File;
  onDropFile: (docType: string, file: File) => void;
}

const DocumentDropzone = ({ docType, label, file, onDropFile }: DocumentDropzoneProps) => {
  // @ts-ignore
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxSize: 5242880, // 5MB
    onDrop: ((acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onDropFile(docType, acceptedFiles[0]);
      }
    }) as any
  });

  return (
    <div 
      {...getRootProps()} 
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        file ? 'border-emerald-500/50 bg-emerald-500/5' : 
        isDragActive ? 'border-primary bg-primary/5' : 
        'border-muted hover:border-primary/50'
      }`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex flex-col items-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 mb-2" />
          <p className="text-sm font-medium text-emerald-600">{file.name}</p>
          <p className="text-xs text-muted-foreground">Click or drag to replace</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-muted-foreground">
          <Upload className="h-6 w-6 mb-2 opacity-50" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs">Max 5MB (PDF, JPG, PNG)</p>
        </div>
      )}
    </div>
  );
};

export function AddStudentWizard({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [documents, setDocuments] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [availableGrades, setAvailableGrades] = useState<any[]>([]);

  React.useEffect(() => {
    (async () => {
      const data = await api.getBatches();
      if (data) setAvailableBatches(data);
      const gradesData = await api.getGrades();
      if (gradesData) setAvailableGrades(gradesData);
    })();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
    reset,
    setValue
  } = useForm<WizardFormValues>({
    // @ts-ignore
    resolver: zodResolver(wizardSchema),
    mode: "onChange",
    defaultValues: {
      isInternational: false,
      enrollmentDate: new Date().toISOString().split('T')[0],
    }
  });

  const isInternational = watch("isInternational");
  const dob = watch("dateOfBirth");
  const selectedBatchId = watch("batchId");
  const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);
  
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [newGradeName, setNewGradeName] = useState("");
  const [isAddingGradeSubmitting, setIsAddingGradeSubmitting] = useState(false);

  const handleCreateGrade = async () => {
    if (!newGradeName.trim()) return;
    setIsAddingGradeSubmitting(true);
    const newGrade = { name: newGradeName };
    const res = await api.addGrade(newGrade);
    if (res.data && res.data.length > 0) {
      setAvailableGrades([...availableGrades, res.data[0]]);
      setValue("grade", res.data[0].name, { shouldValidate: true });
      setNewGradeName("");
      setIsAddingGrade(false);
    }
    setIsAddingGradeSubmitting(false);
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof WizardFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth', 'enrollmentDate', 'gender', 'grade', 'batchId'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['feePerInstallmentAmount', 'feeInstallmentGap'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['parent1Name', 'parent1Relation', 'parent1Contact', 'parent1Whatsapp', 'parent1Occupation', 'addressLine1', 'city', 'state', 'zipCode'];
    }

    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(s => s + 1);
    }
  };

  const prevStep = () => setCurrentStep(s => s - 1);

  const onSubmit = async (data: any) => {
    // Prevent implicit submission (like pressing Enter) before the final step
    if (currentStep !== 4) {
      if (currentStep < 4) {
        nextStep();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const studentId = `${data.firstName.toLowerCase()}_${Date.now()}`;
      const docUrls: Record<string, string> = {};

      // 1. Upload documents
      for (const [type, fileVal] of Object.entries(documents)) {
        if (!fileVal) continue;
        const file = fileVal as any;
        try {
          const path = `${studentId}/${type}_${file.name}`;
          const { url, error } = await api.uploadFile(path, file);
          
          if (error) {
             console.warn(`File upload skipped for ${type}: ${error.message}. Ensure 'student-documents' bucket exists in Supabase.`);
             continue; // Skip individual file if bucket missing but don't fail entire form
          }
          if (url) docUrls[`${type}Url`] = url;
        } catch (fileErr) {
          console.warn(`Failed to upload ${type}:`, fileErr);
        }
      }

      // 2. Prepare database payload (map camelCase to snake_case)
      const payload = {
        first_name: data.firstName,
        last_name: data.lastName,
        date_of_birth: data.dateOfBirth,
        // enrollment_date: data.enrollmentDate, // Removed to fix DB insert error
        gender: data.gender,
        nationality: data.nationality,
        is_international: data.isInternational,
        passport_number: data.passportNumber,
        visa_status: data.visaStatus,
        grade: data.grade,
        batch_id: data.batchId,
        installments_count: 1, // Will be overridden manually
        parent1_name: data.parent1Name,
        parent1_relation: data.parent1Relation,
        parent1_occupation: data.parent1Occupation,
        parent1_whatsapp: data.parent1Whatsapp,
        parent1_contact: data.parent1Contact,
        address_line1: data.addressLine1,
        city: data.city,
        state: data.state,
        zip_code: data.zipCode,
        previous_school: data.previousSchool,
        last_grade_completed: data.lastGradeCompleted,
        reason_for_leaving: data.reasonForLeaving,
        previous_gpa: data.previousGpa,
        allergies: data.allergies,
        medical_conditions: data.medicalConditions,
        daily_medications: data.dailyMedications,
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_relation: data.emergencyContactRelation,
        emergency_contact_number: data.emergencyContactNumber,
        photo_url: docUrls.photoUrl,
        birth_certificate_url: docUrls.birthCertificateUrl,
        transcript_url: docUrls.transcriptUrl,
        medical_record_url: docUrls.medicalRecordUrl,
        id_proof_url: docUrls.idProofUrl,
        status: "Pending"
      };

      const { data: profileResp, error } = await api.addStudentProfile(payload);
      if (error) throw error;
      
      const activeProfileId = profileResp && profileResp.length > 0 ? profileResp[0].id : null;
      const actualStudentId = profileResp && profileResp.length > 0 ? profileResp[0].student_id || profileResp[0].id : null;

      // 3. Generate Custom Invoices (Override trigger-generated)
      try {
         const feeAmount = parseFloat(data.feePerInstallmentAmount);
         const downpayment = data.downpaymentAmount && data.downpaymentAmount.trim() !== "" ? parseFloat(data.downpaymentAmount) : null;
         const feeGap = parseInt(data.feeInstallmentGap, 10);
         const numInstallments = parseInt(data.feeDuration || "12", 10); // Standardize to 12 if indefinite, or we can use duration value.
         
         const invoicesToCreate = [];
         const today = new Date(data.enrollmentDate || new Date());
         for (let i = 1; i <= numInstallments; i++) {
            const dueDate = new Date(today);
            // First installment (i=1) on enrollment date, second after gap, etc.
            dueDate.setMonth(today.getMonth() + ((i - 1) * feeGap));
            
            let amt = feeAmount;
            let cat = `Custom Fee - Installment ${i}`;
            if (i === 1 && downpayment !== null) {
               amt = downpayment;
               cat = `Downpayment / Installment 1`;
            }

            invoicesToCreate.push({
               id: `INV-${actualStudentId || activeProfileId}-${Date.now()}-${i}`,
               student_id: actualStudentId || activeProfileId,
               student_name: `${data.firstName} ${data.lastName}`,
               category: cat,
               amount: amt,
               due_date: dueDate.toISOString().split('T')[0],
               status: 'Unpaid'
            });
         }

         // Backend API call to replace invoices
         await fetch('/api/fees/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              studentId: actualStudentId || activeProfileId, 
              batchId: data.batchId,
              invoices: invoicesToCreate
            })
         });
      } catch (invoiceErr) {
         console.warn("Failed to generate custom invoices, fallback to trigger:", invoiceErr);
      }

      // Log activity
      await api.addActivityLog({
        action: `Enrolled student: ${data.firstName} ${data.lastName}`,
        module: "Enrollment",
        time: new Date().toLocaleTimeString(),
        user: "Admin"
      });

      onSuccess();
      reset();
      setCurrentStep(1);
      setDocuments({});
    } catch (err: any) {
      console.error("Submission failed:", err);
      let message = err.message || "Unknown error";
      
      if (message.includes("row-level security")) {
        message = "Database Access Denied: Please run the updated SQL script in /supabase_student_profiles.sql to enable public enrollment submissions.";
      } else if (message.includes("Bucket not found")) {
        message = "Storage Error: The 'student-documents' bucket was not found. Please create it in your Supabase Storage dashboard.";
      }
      
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    const data = watch();
    localStorage.setItem("student_draft", JSON.stringify(data));
    alert("Draft saved locally. You can resume later.");
  };

  const handleDropFile = (docType: string, file: File) => {
    setDocuments(prev => ({ ...prev, [docType]: file }));
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) { reset(); setCurrentStep(1); setDocuments({}); }
    }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} className="max-w-4xl p-0 overflow-hidden bg-background border-muted/20">
        <div className="grid grid-cols-1 md:grid-cols-4 h-full min-h-[600px]">
          {/* Sidebar */}
          <div className="bg-muted/10 p-6 border-r border-muted/20 hidden md:block">
            <h2 className="font-bold text-lg mb-8 tracking-tight">Enrollment Wizard</h2>
            <div className="space-y-6">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isPassed = currentStep > step.id;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? "border-primary bg-primary/10 text-primary" : 
                      isPassed ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : 
                      "border-muted text-muted-foreground"
                    }`}>
                      {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Step {step.id}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-auto pt-12">
               <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                  <p className="text-xs font-bold text-primary mb-1">Save Progress</p>
                  <p className="text-[10px] text-muted-foreground mb-3">Applications can take time. Save and return via your portal.</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSaveDraft}>
                    <Save className="h-3 w-3 mr-2" /> Save Draft
                  </Button>
               </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="md:col-span-3 p-6 flex flex-col max-h-[85vh] overflow-y-auto">
            {/* Mobile Progress */}
            <div className="md:hidden flex items-center justify-between mb-6">
               <p className="font-bold text-sm tracking-widest uppercase">Step {currentStep} of {STEPS.length}</p>
               <div className="flex gap-1">
                  {STEPS.map(s => (
                    <div key={s.id} className={`h-1.5 w-6 rounded-full ${s.id <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
                  ))}
               </div>
            </div>

            <form 
              className="flex-1 flex flex-col" 
              onSubmit={handleSubmit(onSubmit, (errors) => {
                console.error("Form validation errors:", errors);
                // If there are errors on a different step, we should probably tell the user
                const errorFields = Object.keys(errors);
                if (errorFields.length > 0) {
                  alert(`Please fix the errors in the ${errorFields.length > 1 ? 'fields' : 'field'}: ${errorFields.join(", ")}`);
                }
              })}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {/* STEP 1: Student Details */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div className="flex flex-col items-center mb-6">
                        <div className="w-full max-w-[200px] mb-2">
                           <DocumentDropzone docType="photo" label="Student Photo" file={documents.photo} onDropFile={handleDropFile} />
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Profile Photo</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">First Name *</label>
                          <Input {...register("firstName")} />
                          {errors.firstName && <span className="text-[10px] text-destructive">{errors.firstName.message}</span>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Name *</label>
                          <Input {...register("lastName")} />
                          {errors.lastName && <span className="text-[10px] text-destructive">{errors.lastName.message}</span>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth *</label>
                          <Input type="date" {...register("dateOfBirth")} />
                          {errors.dateOfBirth && <span className="text-[10px] text-destructive">{errors.dateOfBirth.message}</span>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrollment Date *</label>
                          <Input type="date" {...register("enrollmentDate")} />
                          {errors.enrollmentDate && <span className="text-[10px] text-destructive">{errors.enrollmentDate.message}</span>}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender *</label>
                          <select {...register("gender")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                          {errors.gender && <span className="text-[10px] text-destructive">{errors.gender.message}</span>}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                            <span>Grade *</span>
                            <button
                              type="button"
                              onClick={() => setIsAddingGrade(!isAddingGrade)}
                              className="text-[10px] text-primary hover:underline font-bold focus:outline-none"
                            >
                              {isAddingGrade ? 'Cancel' : '+ Add New'}
                            </button>
                          </label>
                          {isAddingGrade ? (
                            <div className="flex gap-2">
                              <Input 
                                value={newGradeName} 
                                onChange={(e) => setNewGradeName(e.target.value)} 
                                placeholder="New grade name..." 
                                className="h-9"
                              />
                              <Button 
                                type="button" 
                                onClick={handleCreateGrade} 
                                disabled={!newGradeName.trim() || isAddingGradeSubmitting}
                                className="h-9 px-3 shrink-0"
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div>
                              <select {...register("grade")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
                                <option value="">Select...</option>
                                {availableGrades.map((g) => (
                                  <option key={g.id} value={g.name}>{g.name}</option>
                                ))}
                              </select>
                              {errors.grade && <span className="text-[10px] text-destructive">{errors.grade.message}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Batch *</label>
                          <select {...register("batchId")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
                            <option value="">Select Batch...</option>
                            {availableBatches.map((b) => (
                              <option key={b.id} value={b.id}>{b.name} (₹{b.total_batch_amount})</option>
                            ))}
                          </select>
                          {errors.batchId && <span className="text-[10px] text-destructive">{errors.batchId.message}</span>}
                        </div>
                      </div>

                      {/* Conditional logic: International Student */}
                      <div className="p-4 border border-muted/20 bg-muted/5 rounded-lg space-y-4">
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="isInternational"
                            control={control}
                            render={({ field }) => (
                              <Checkbox 
                                id="isInternational" 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                              />
                            )}
                          />
                          <label htmlFor="isInternational" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            International Student
                          </label>
                        </div>

                        <AnimatePresence>
                          {isInternational && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }} 
                              animate={{ height: "auto", opacity: 1 }} 
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden grid grid-cols-2 gap-4 pt-2"
                            >
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passport Number</label>
                                <Input {...register("passportNumber")} />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Visa Status</label>
                                <Input {...register("visaStatus")} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Fee Structure */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div className="space-y-4 border-b border-muted/20 pb-4">
                        <h3 className="font-bold text-sm tracking-tight">Custom Fee Structure</h3>
                        <p className="text-sm text-muted-foreground">Define a particular fee breakdown for this specific student.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Downpayment (Optional)</label>
                            <Input type="number" {...register("downpaymentAmount")} placeholder="e.g. 10000" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regular Installment Amount *</label>
                            <Input type="number" {...register("feePerInstallmentAmount")} placeholder="e.g. 5000" />
                            {errors.feePerInstallmentAmount && <span className="text-[10px] text-destructive">{errors.feePerInstallmentAmount.message}</span>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per Installment Gap (Months) *</label>
                            <Input type="number" {...register("feeInstallmentGap")} placeholder="e.g. 1" />
                            {errors.feeInstallmentGap && <span className="text-[10px] text-destructive">{errors.feeInstallmentGap.message}</span>}
                          </div>
                           <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration (Total Installments)</label>
                            <Input type="number" {...register("feeDuration")} placeholder="Leave empty if indefinite" />
                          </div>
                          
                          <div className="flex items-center space-x-2 pt-6">
                            <Controller
                              name="feeAsLongAsContinues"
                              control={control}
                              render={({ field }) => (
                                <Checkbox 
                                  id="feeAsLongAsContinues" 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange} 
                                />
                              )}
                            />
                            <label htmlFor="feeAsLongAsContinues" className="text-sm font-medium leading-none">
                              As long as student continues
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Parent & Address */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <div className="space-y-4 border-b border-muted/20 pb-4">
                        <h3 className="font-bold text-sm tracking-tight">Primary Parent / Guardian</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name *</label>
                            <Input {...register("parent1Name")} />
                            {errors.parent1Name && <span className="text-[10px] text-destructive">{errors.parent1Name.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relationship *</label>
                            <Input {...register("parent1Relation")} />
                            {errors.parent1Relation && <span className="text-[10px] text-destructive">{errors.parent1Relation.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact No. (10-Digit) *</label>
                            <Input {...register("parent1Contact")} maxLength={10} />
                            {errors.parent1Contact && <span className="text-[10px] text-destructive">{errors.parent1Contact.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">WhatsApp Number</label>
                            <Input type="text" {...register("parent1Whatsapp")} placeholder="+91..." />
                            {errors.parent1Whatsapp && <span className="text-[10px] text-destructive">{errors.parent1Whatsapp.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Occupation</label>
                            <Input {...register("parent1Occupation")} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-sm tracking-tight">Residential Address</h3>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address Line 1 *</label>
                          <Input {...register("addressLine1")} />
                          {errors.addressLine1 && <span className="text-[10px] text-destructive">{errors.addressLine1.message}</span>}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City *</label>
                            <Input {...register("city")} />
                            {errors.city && <span className="text-[10px] text-destructive">{errors.city.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State *</label>
                            <Input {...register("state")} />
                            {errors.state && <span className="text-[10px] text-destructive">{errors.state.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zip Code *</label>
                            <Input {...register("zipCode")} />
                            {errors.zipCode && <span className="text-[10px] text-destructive">{errors.zipCode.message}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Documents */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <p className="text-sm text-muted-foreground mb-4 border-b border-muted/20 pb-4">
                        Please upload clear digital copies of the requested documents. Accepted formats are PDF, JPEG, and PNG (Max 5MB each).
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <DocumentDropzone docType="birthCertificate" label="Birth Certificate" file={documents.birthCertificate} onDropFile={handleDropFile} />
                        <DocumentDropzone docType="transcript" label="Academic Transcript" file={documents.transcript} onDropFile={handleDropFile} />
                        <DocumentDropzone docType="idProof" label="Govt ID Proof" file={documents.idProof} onDropFile={handleDropFile} />
                        <DocumentDropzone docType="medicalRecord" label="Medical Records" file={documents.medicalRecord} onDropFile={handleDropFile} />
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Wizard Footer Navigation */}
              <div className="mt-8 pt-4 border-t border-muted/20 flex justify-between items-center bg-background shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                
                {currentStep < STEPS.length ? (
                  <Button type="button" onClick={nextStep}>
                    Next Step <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground min-w-[160px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Submit Application
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
