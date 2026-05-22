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
  gender: z.string().min(1, "Required"),
  bloodGroup: z.string().optional(),
  nationality: z.string().default("Domestic"),
  isInternational: z.boolean().default(false),
  passportNumber: z.string().optional(),
  visaStatus: z.string().optional(),
  motherTongue: z.string().optional(),
  primaryLanguage: z.string().optional(),
  grade: z.string().min(1, "Grade is required"),
  batchId: z.string().min(1, "Batch is required"),
  installmentsCount: z.string().min(1, "Installments count is required"),

  parent1Name: z.string().min(2, "Required"),
  parent1Relation: z.string().min(2, "Required"),
  parent1Occupation: z.string().optional(),
  parent1Income: z.string().optional(),
  parent1Email: z.string().email("Invalid email").optional().or(z.literal('')),
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
  emergencyContactName: z.string().min(2, "Required"),
  emergencyContactRelation: z.string().optional(),
  emergencyContactNumber: z.string().regex(/^\d{10}$/, "Must be 10 digits"),
});

type WizardFormValues = z.infer<typeof wizardSchema>;

const STEPS = [
  { id: 1, title: "Student details", icon: User },
  { id: 2, title: "Parent & Address", icon: Users },
  { id: 3, title: "Academics & Med", icon: GraduationCap },
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

  React.useEffect(() => {
    (async () => {
      const data = await api.getBatches();
      if (data) setAvailableBatches(data);
    })();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
    reset
  } = useForm<WizardFormValues>({
    // @ts-ignore
    resolver: zodResolver(wizardSchema),
    mode: "onChange",
    defaultValues: {
      isInternational: false,
    }
  });

  const isInternational = watch("isInternational");
  const dob = watch("dateOfBirth");
  const selectedBatchId = watch("batchId");
  const selectedBatch = availableBatches.find(b => b.id === selectedBatchId);

  const nextStep = async () => {
    let fieldsToValidate: (keyof WizardFormValues)[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'grade', 'batchId', 'installmentsCount', 'bloodGroup', 'motherTongue', 'primaryLanguage'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['parent1Name', 'parent1Relation', 'parent1Contact', 'parent1Email', 'parent1Occupation', 'parent1Income', 'addressLine1', 'city', 'state', 'zipCode'];
    } else if (currentStep === 3) {
      fieldsToValidate = ['emergencyContactName', 'emergencyContactNumber', 'previousSchool', 'lastGradeCompleted', 'previousGpa', 'reasonForLeaving', 'allergies', 'medicalConditions', 'dailyMedications'];
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
        gender: data.gender,
        blood_group: data.bloodGroup,
        nationality: data.nationality,
        is_international: data.isInternational,
        passport_number: data.passportNumber,
        visa_status: data.visaStatus,
        mother_tongue: data.motherTongue,
        primary_language: data.primaryLanguage,
        grade: data.grade,
        batch_id: data.batchId,
        installments_count: parseInt(data.installmentsCount || "1", 10),
        parent1_name: data.parent1Name,
        parent1_relation: data.parent1Relation,
        parent1_occupation: data.parent1Occupation,
        parent1_income: data.parent1Income,
        parent1_email: data.parent1Email,
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

      const { error } = await api.addStudentProfile(payload);
      if (error) throw error;

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
               <p className="font-bold text-sm tracking-widest uppercase">Step {currentStep} of 4</p>
               <div className="flex gap-1">
                  {[1,2,3,4].map(s => (
                    <div key={s} className={`h-1.5 w-6 rounded-full ${s <= currentStep ? 'bg-primary' : 'bg-muted'}`} />
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
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date of Birth *</label>
                          <Input type="date" {...register("dateOfBirth")} />
                          {errors.dateOfBirth && <span className="text-[10px] text-destructive">{errors.dateOfBirth.message}</span>}
                        </div>
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
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Grade *</label>
                          <select {...register("grade")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
                            <option value="">Select...</option>
                            <option value="9th">9th Grade</option>
                            <option value="10th">10th Grade</option>
                            <option value="11th">11th Grade</option>
                            <option value="12th">12th Grade</option>
                          </select>
                          {errors.grade && <span className="text-[10px] text-destructive">{errors.grade.message}</span>}
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
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Installment Plan *</label>
                          <select {...register("installmentsCount")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm" disabled={!selectedBatch}>
                            <option value="">Select Plan...</option>
                            {selectedBatch && Array.from({ length: selectedBatch.max_installments - selectedBatch.min_installments + 1 }, (_, i) => selectedBatch.min_installments + i).map(num => (
                              <option key={num} value={num}>{num} Installment(s)</option>
                            ))}
                          </select>
                          {errors.installmentsCount && <span className="text-[10px] text-destructive">{errors.installmentsCount.message}</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blood Group</label>
                          <Input {...register("bloodGroup")} placeholder="e.g. O+" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mother Tongue</label>
                          <Input {...register("motherTongue")} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary Lang</label>
                          <Input {...register("primaryLanguage")} />
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

                  {/* STEP 2: Parent & Address */}
                  {currentStep === 2 && (
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
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</label>
                            <Input type="email" {...register("parent1Email")} placeholder="parent@example.com" />
                            {errors.parent1Email && <span className="text-[10px] text-destructive">{errors.parent1Email.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Occupation</label>
                            <Input {...register("parent1Occupation")} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annual Income</label>
                            <select {...register("parent1Income")} className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm">
                              <option value="">Select Bracket...</option>
                              <option value="<5L">Less than 5 Lakhs</option>
                              <option value="5L-10L">5 Lakhs - 10 Lakhs</option>
                              <option value="10L-25L">10 Lakhs - 25 Lakhs</option>
                              <option value=">25L">More than 25 Lakhs</option>
                            </select>
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

                  {/* STEP 3: Academics & Med */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <div className="space-y-4 border-b border-muted/20 pb-4">
                        <h3 className="font-bold text-sm tracking-tight">Academic History</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previous School</label>
                            <Input {...register("previousSchool")} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Grade Completed</label>
                            <Input {...register("lastGradeCompleted")} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GPA / Board Marks</label>
                            <Input {...register("previousGpa")} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason for Leaving</label>
                            <Input {...register("reasonForLeaving")} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 border-b border-muted/20 pb-4">
                        <h3 className="font-bold text-sm tracking-tight">Medical Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Known Allergies</label>
                            <Input {...register("allergies")} placeholder="None" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Medications</label>
                            <Input {...register("dailyMedications")} placeholder="None" />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pre-existing Medical Conditions</label>
                            <Input {...register("medicalConditions")} placeholder="None" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-bold text-sm tracking-tight">Alternative Emergency Contact</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Name *</label>
                            <Input {...register("emergencyContactName")} />
                            {errors.emergencyContactName && <span className="text-[10px] text-destructive">{errors.emergencyContactName.message}</span>}
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Number *</label>
                            <Input {...register("emergencyContactNumber")} maxLength={10} />
                            {errors.emergencyContactNumber && <span className="text-[10px] text-destructive">{errors.emergencyContactNumber.message}</span>}
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
                
                {currentStep < 4 ? (
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
