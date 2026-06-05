import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  Calendar,
  IndianRupee,
  Save,
  X,
  File,
  BarChart3,
  Clock,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  User,
  Award,
  Eye,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  QrCode,
  Send,
  Wallet,
  Receipt,
  History,
  Smartphone,
  MoreHorizontal,
  Printer,
  Share2,
  Plus,
  CreditCard,
  Camera,
  GraduationCap,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tabs";
import { FeeEmiPreview } from "../components/FeeEmiPreview";
import { AnnualEmiPolicyMaker } from "../components/AnnualEmiPolicyMaker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { supabase } from "../lib/supabase";
import {
  Student,
  LedgerInvoice,
  LedgerTransaction,
  AttendanceRecord,
  TeacherRemark,
  StudentAssignment,
} from "../types";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { QRCodeSVG } from "qrcode.react";
import { apiCache } from "../lib/api";

const resizeImage = (
  file: File,
  maxWidth: number = 300,
  maxHeight: number = 300,
): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(dataUrl);
        } else {
          resolve((event.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve("");
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

export function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [invoices, setInvoices] = useState<LedgerInvoice[]>([]);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // New Feature States
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [remarks, setRemarks] = useState<TeacherRemark[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('edit') === 'true') {
      setIsEditing(true);
      // Optional: remove query string without triggering refresh
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, location.pathname]);
  const [uploading, setUploading] = useState(false);
  const [showIDCard, setShowIDCard] = useState(false);

  const [editDivideRemaining, setEditDivideRemaining] = useState(false);
  const [editTargetEndMonth, setEditTargetEndMonth] = useState("");
  const [editEmiFrequency, setEditEmiFrequency] = useState("Monthly");
  const [editCustomEmis, setEditCustomEmis] = useState<any[]>([]);

  const [editActiveEmiTab, setEditActiveEmiTab] = useState("monthly");
  const [editAnnualEmiFrequency, setEditAnnualEmiFrequency] =
    useState("Monthly");
  const [editAnnualEmis, setEditAnnualEmis] = useState<any[]>([]);

  // Attendance specific states
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);

  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [isCustomFeeDialogOpen, setIsCustomFeeDialogOpen] = useState(false);
  const [customFeeTitle, setCustomFeeTitle] = useState("");
  const [customFeeAmount, setCustomFeeAmount] = useState("");
  const [customFeeDueDate, setCustomFeeDueDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [isAddingCustomFee, setIsAddingCustomFee] = useState(false);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editInvoiceAmount, setEditInvoiceAmount] = useState<string>("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null,
  );
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [collectedDate, setCollectedDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "UPI" | "Cash" | "Cheque" | "Card"
  >("UPI");
  const [paymentRefId, setPaymentRefId] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isPaymentConfirmDialogOpen, setIsPaymentConfirmDialogOpen] =
    useState(false);

  const processSecurePayment = async () => {
    setIsPaymentConfirmDialogOpen(false);
    setIsProcessingPayment(true);
    try {
      const timestamp = new Date().toISOString();
      const amount = Number(paymentAmount);
      const adjustment = Number(adjustmentAmount) || 0;

      // Secure Backend Logic: Use Supabase database RPC only
      if (supabase && id) {
        const { data, error } = await supabase.rpc(
          "process_installment_payment_v5",
          {
            p_invoice_id: selectedInvoiceId,
            p_student_id: student?.id,
            p_amount: amount,
            p_payment_method: paymentMethod,
            p_reference_id: paymentRefId || `MAN-${Date.now()}`,
            p_adjustment_amount: adjustment,
            p_adjustment_title:
              adjustment > 0 ? "Late Fee" : "Discount/Scholarship",
            p_payment_date: collectedDate,
          },
        );

        if (error) {
          console.error("RPC Error:", error);
          alert(`Payment processing failed: ${error.message}`);
        } else {
          // If adjustment is specified, create an adjustment transaction client-side to be 100% sure it is tracked!
          if (adjustment !== 0) {
            try {
              await supabase.from("transactions").insert({
                id:
                  "ADJ-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                student_id: student?.id || id,
                invoice_id: selectedInvoiceId,
                date: new Date().toISOString().split("T")[0],
                description:
                  (adjustment > 0 ? "Late Fee" : "Discount/Scholarship") +
                  ` for ${invoices.find((inv) => inv.id === selectedInvoiceId)?.title || selectedInvoiceId}`,
                type: adjustment < 0 ? "Discount" : "Late Fee",
                category: adjustment < 0 ? "Discount" : "Fees",
                amount: adjustment,
                status: "Success",
                payment_method: "SYSTEM",
              });
            } catch (adjErr) {
              console.error("Error inserting adjustment txn:", adjErr);
            }
          }

          // Successfully processed securely, refetch data
          await fetchStudentData(true);
          setIsPaymentDrawerOpen(false);
          setPaymentAmount("");
          setPaymentRefId("");
          setSelectedInvoiceId(null);
          setAdjustmentAmount("");
          setCollectedDate("");

          // Show Receipt automatically
          if (data) {
            setReceiptData({
              ...data,
              student_name: student?.name,
              installment_title: invoices.find(
                (inv) => inv.id === selectedInvoiceId,
              )?.title,
              payment_method: paymentMethod,
              reference_id: paymentRefId || `MAN-${Date.now()}`,
              date: new Date(collectedDate || new Date()).toLocaleDateString(
                "en-IN",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              ),
              paid_amount: amount,
              discount_amount:
                data?.total_discount ||
                (adjustment < 0 ? Math.abs(adjustment) : 0),
            });
            setShowReceiptModal(true);
          }

          setPaymentAmount("");
          setPaymentRefId("");
          setAdjustmentAmount("");
          setSelectedInvoiceId(null);
        }
      } else {
        alert(
          "Database connection is not configured or Student ID is missing.",
        );
      }
    } catch (e) {
      console.error("Payment processing failed:", e);
      alert("Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSubmit = () => {
    if (!student || parseFloat(paymentAmount) <= 0) return;

    setIsProcessingPayment(true);

    // Simulate API delay
    setTimeout(() => {
      const newTransaction: LedgerTransaction = {
        id: `TXN-MAN-${Math.floor(Math.random() * 10000)}`,
        invoiceId: selectedInvoiceId || undefined,
        studentId: student.id,
        date: new Date().toISOString().split("T")[0],
        amount: parseFloat(paymentAmount),
        paymentMethod: paymentMethod as any,
        referenceId: paymentRefId,
        status: "Success",
      };

      setTransactions((prev) => [...prev, newTransaction]);
      setIsProcessingPayment(false);
      setIsPaymentDrawerOpen(false);

      // Reset form
      setPaymentAmount("");
      setPaymentRefId("");
      setSelectedInvoiceId(null);
      setAdjustmentAmount("");
      setCollectedDate("");
    }, 800);
  };

  const viewReceiptFromTxn = (txn: any) => {
    const inv = computedInvoices.find(
      (i) => i.id === txn.invoiceId || i.id === txn.invoice_id,
    );

    setReceiptData({
      transaction_id: txn.id,
      date: txn.date,
      paid_amount: txn.amount,
      payment_method: txn.paymentMethod || txn.payment_method || "SYSTEM",
      reference_id: txn.reference_id || txn.referenceId || txn.id,
      installment_title: inv?.title || "Fee Payment",
      new_status: inv?.computedStatus || inv?.status || "Success",
      amount_due: inv?.amountDue || 0,
      discount_amount: inv?.discountAmount || 0,
    });
    setShowReceiptModal(true);
  };

  // Document management states
  const [activeDocCategory, setActiveDocCategory] = useState<
    "All" | "Academic" | "Legal" | "ID Proof"
  >("All");
  const [viewingDoc, setViewingDoc] = useState<{
    name: string;
    url: string;
    type: string;
  } | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<
    "Academic" | "Legal" | "ID Proof"
  >("Academic");
  const [deletingDocument, setDeletingDocument] = useState<string | null>(null);
  const [currentViewDate, setCurrentViewDate] = useState(new Date());

  const fetchAttendance = useCallback(
    async (preFetchedAtt?: any[], preFetchedHolidays?: any[]) => {
      if (!id || !supabase) return;

      let attData = preFetchedAtt;
      let holidaysData = preFetchedHolidays;

      if (!attData || !holidaysData) {
        const [attRes, holidaysRes] = await Promise.all([
          supabase
            .from("student_attendance")
            .select("*")
            .eq("student_id", id)
            .order("date", { ascending: false }),
          supabase.from("holidays").select("*"),
        ]);
        if (!attData) attData = attRes.data || [];
        if (!holidaysData) holidaysData = holidaysRes.data || [];
      }

      if (attData) {
        let combined = [...(attData as AttendanceRecord[])];
        if (holidaysData && holidaysData.length > 0) {
          holidaysData.forEach((h) => {
            // ensure no duplicates if someone managed to mark holiday manually before
            if (!combined.some((r) => r.date === h.date)) {
              combined.push({
                date: h.date,
                status: "Holiday",
                subject: "General",
                marked_by: "System",
              } as any);
            }
          });
        }
        setAttendance(combined);
      }
    },
    [id, supabase],
  );

  const stats = useMemo(() => {
    if (!attendance.length)
      return {
        consecutiveAbsences: 0,
        punctualityScore: 0,
        trend: 0,
        dateRange: "",
      };

    const sorted = [...attendance].sort((a, b) => b.date.localeCompare(a.date));

    // Consecutive absences
    let consecutiveCount = 0;
    let consecutiveDates: string[] = [];
    for (const record of sorted) {
      if (record.status === "Absent") {
        consecutiveCount++;
        const d = new Date(record.date);
        consecutiveDates.push(
          d.toLocaleDateString("default", { month: "short", day: "numeric" }),
        );
      } else if (record.status === "Excused") {
        continue;
      } else {
        break;
      }
    }
    consecutiveDates.reverse();
    const dateRange =
      consecutiveDates.length > 1
        ? `${consecutiveDates[0]}-${consecutiveDates[consecutiveDates.length - 1].split(" ")[1]}`
        : consecutiveDates[0] || "";

    // Punctuality
    const currentMonth = currentViewDate.getMonth();
    const currentYear = currentViewDate.getFullYear();

    const currentMonthRecords = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthRecords = attendance.filter((a) => {
      const d = new Date(a.date);
      return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
    });

    const calcPunctuality = (recs: AttendanceRecord[]) => {
      const total = recs.filter(
        (r) => r.status === "Present" || r.status === "Late",
      ).length;
      if (total === 0) return 0;
      const present = recs.filter((r) => r.status === "Present").length;
      return (present / total) * 100;
    };

    const score = calcPunctuality(currentMonthRecords);
    const lastScore = calcPunctuality(lastMonthRecords);

    return {
      consecutiveAbsences: consecutiveCount,
      dateRange,
      punctualityScore: Math.round(score),
      trend: Math.round(score - lastScore),
    };
  }, [attendance, currentViewDate]);

  const handleMarkAttendance = async (
    status: "Present" | "Absent" | "Late" | "Excused",
    subject?: string,
  ) => {
    if (!id || !supabase) return;
    const date = new Date().toISOString().split("T")[0];

    // Holiday Check
    const isHoliday = attendance.some(
      (a) => a.date === date && a.status === "Holiday",
    );
    if (isHoliday) {
      alert("Cannot mark attendance on a holiday.");
      return;
    }

    try {
      const { error } = await supabase.from("student_attendance").upsert(
        {
          student_id: id,
          date: date,
          status: status,
          subject: subject || "General",
          marked_by: "Admin",
          created_at: new Date().toISOString(),
        },
        { onConflict: "student_id,date,subject" },
      );

      if (error) throw error;
    } catch (err) {
      console.error("Error marking attendance:", err);
      alert("Failed to mark attendance.");
    }
  };

  const fetchStudentData = useCallback(
    async (silent = false) => {
      if (!id || !supabase) return;

      if (!silent) setLoading(true);
      try {
        // 1. Prepare queries for both modern profile and legacy student records
        const isUUID =
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            id,
          );

        let profileQuery = supabase.from("student_profiles").select("*");
        if (isUUID) {
          profileQuery = profileQuery.eq("id", id);
        } else {
          profileQuery = profileQuery.eq("student_id", id);
        }

        let fallbackQuery = supabase.from("students").select("*");
        if (isUUID) {
          fallbackQuery = fallbackQuery.eq("id", id);
        } else {
          fallbackQuery = fallbackQuery.eq("id", id);
        }

        // CONCURRENT BULK FETCH: Retrieve student records, invoices, enrollments, transactions, documents, attendance, holidays and batches concurrently in a single wave!
        const [
          profileRes,
          fallbackRes,
          invoicesRes,
          sBatchesRes,
          transactionRes,
          docListRes,
          attRes,
          holidaysRes,
          allBatchesRes,
        ] = await Promise.all([
          profileQuery.maybeSingle(),
          fallbackQuery.maybeSingle(),
          supabase.from("invoices").select("*").eq("student_id", id),
          supabase
            .from("student_batches")
            .select("batch_id, enrolled_at")
            .eq("student_id", id),
          supabase.from("transactions").select("*").eq("student_id", id),
          supabase.storage
            .from("student-documents")
            .list(id + "/", { limit: 100, offset: 0 }),
          supabase
            .from("student_attendance")
            .select("*")
            .eq("student_id", id)
            .order("date", { ascending: false }),
          supabase.from("holidays").select("*"),
          supabase
            .from("batches")
            .select("id, name, duration_months, installment_policies"),
        ]);

        const { data: profileData } = profileRes;
        const { data: studentData, error: studentError } = fallbackRes;
        const { data: invoiceData, error: invoiceError } = invoicesRes;
        const sBatches = sBatchesRes.data;
        const { data: transactionData, error: transactionError } =
          transactionRes;
        const { data: docData, error: docError } = docListRes;
        const studentAttendance = attRes.data || [];
        const schoolHolidays = holidaysRes.data || [];
        const allBatches = allBatchesRes.data || [];

        let batchNamesJoined = "";
        if (sBatches && sBatches.length > 0) {
          const batchIds = sBatches.map((sb: any) => sb.batch_id);
          const studentBatches = allBatches.filter((b: any) =>
            batchIds.includes(b.id),
          );
          if (studentBatches.length > 0) {
            batchNamesJoined = studentBatches
              .map((b: any) => b.name)
              .join(", ");
          }
        }

        let derived_fee: number | undefined = undefined;
        let derived_gap: number | undefined = undefined;
        let derived_dur: number | undefined = undefined;

        if (!invoiceError && invoiceData && invoiceData.length > 0) {
          const primaryInvs = invoiceData
            .filter(
              (i: any) =>
                (i.category &&
                  (i.category.includes("Installment") ||
                    i.category.includes("Fee"))) ||
                (i.title &&
                  (i.title.includes("Installment") ||
                    i.title.includes("Fee"))) ||
                i.type === "Primary",
            )
            .sort(
              (a: any, b: any) =>
                new Date(a.due_date).getTime() - new Date(b.due_date).getTime(),
            );
          if (primaryInvs.length > 0) {
            derived_dur = primaryInvs.length;
            derived_fee = Number(primaryInvs[0].amount);
            if (primaryInvs.length > 1) {
              const d1 = new Date(primaryInvs[0].due_date);
              const d2 = new Date(primaryInvs[1].due_date);
              let diffMonths =
                (d2.getFullYear() - d1.getFullYear()) * 12 +
                (d2.getMonth() - d1.getMonth());
              derived_gap = diffMonths > 0 ? diffMonths : 1;
            } else {
              derived_gap = 1;
            }
          }
        }

        if (profileData) {
          // Safe photo URL fetch: fallback to localStorage cached version if database value is empty or invalid blob
          const dbPhoto = profileData.photo_url;
          const localPhoto = localStorage.getItem(`student_photo_${id}`);
          const finalPhoto =
            dbPhoto && !dbPhoto.startsWith("blob:")
              ? dbPhoto
              : localPhoto || undefined;

          const resolvedGrade = profileData.grade || batchNamesJoined || "";

          // Map to expected Student format
          const mappedStudent: Student = {
            ...profileData,
            fee_per_installment: profileData.fee_per_installment !== null ? profileData.fee_per_installment : derived_fee,
            fee_interval_months: profileData.fee_interval_months !== null ? profileData.fee_interval_months : derived_gap,
            fee_duration_value: profileData.fee_duration_value !== null ? profileData.fee_duration_value : derived_dur,
            id: profileData.student_id || profileData.id,
            name: `${profileData.first_name || ""} ${profileData.last_name || ""}`.trim(),
            grade: resolvedGrade,
            contact: profileData.parent1_contact || "N/A",
            status: profileData.status === "Active" ? "Active" : "Graduated", // Simple status mapping
            photo_url: finalPhoto,
          };
          setStudent(mappedStudent);
          setEditForm({ ...mappedStudent });
        } else {
          if (studentError || !studentData)
            throw studentError || new Error("Student not found");

          const dbPhoto = studentData.photo_url;
          const localPhoto = localStorage.getItem(`student_photo_${id}`);
          const finalPhoto =
            dbPhoto && !dbPhoto.startsWith("blob:")
              ? dbPhoto
              : localPhoto || undefined;

          const resolvedGrade = studentData.grade || batchNamesJoined || "";

          const mappedOld: Student = {
            ...studentData,
            fee_per_installment: studentData.fee_per_installment !== null && studentData.fee_per_installment !== undefined ? studentData.fee_per_installment : derived_fee,
            fee_interval_months: studentData.fee_interval_months !== null && studentData.fee_interval_months !== undefined ? studentData.fee_interval_months : derived_gap,
            fee_duration_value: studentData.fee_duration_value !== null && studentData.fee_duration_value !== undefined ? studentData.fee_duration_value : derived_dur,
            grade: resolvedGrade,
            photo_url: finalPhoto,
          };
          setStudent(mappedOld);
          setEditForm({ ...mappedOld });
        }

        if (!invoiceError && invoiceData) {
          // Ensure proper camelCase mapping if needed by UI
          let mappedInvoices = invoiceData.map((inv) => {
            const rawTitle = inv.category || "Invoice";
            const cleanTitle = rawTitle
              .replace(/Installment/g, "Fee")
              .replace(/installment/g, "fee");
            return {
              ...inv,
              id: inv.id,
              studentId: inv.student_id,
              title: cleanTitle,
              totalAmount: Number(inv.amount),
              dueDate: inv.due_date,
              status: inv.status || "Upcoming",
              type: "Primary",
            };
          });

          setInvoices(mappedInvoices);
        } else {
          setInvoices([]);
        }

        // Process pre-fetched payments & transactions
        if (!transactionError && transactionData) {
          const mappedTxns = transactionData
            .map((t: any) => ({
              ...t,
              invoiceId: t.invoice_id,
              amount: Number(t.amount),
              paymentMethod: t.payment_method || "SYSTEM",
              status: t.status || "Success",
            }))
            .sort(
              (a: any, b: any) =>
                new Date(b.date).getTime() - new Date(a.date).getTime(),
            );
          setTransactions(mappedTxns);
        } else {
          setTransactions([]);
        }

        // Process pre-fetched attendance concurrently
        await fetchAttendance(studentAttendance, schoolHolidays);

        // Clear any local hardcoded demo data
        setRemarks([]);
        setAssignments([]);

        // Process pre-fetched document listings
        if (!docError && docData) {
          const docsWithUrls = docData.map((doc) => {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("student-documents")
              .getPublicUrl(`${id}/${doc.name}`);

            return {
              ...doc,
              url: publicUrl,
            };
          });
          setDocuments(docsWithUrls);
        } else {
          setDocuments([]);
        }
      } catch (err) {
        console.error("Error fetching student profile:", err);
      } finally {
        setLoading(false);
      }
    },
    [id, supabase, fetchAttendance],
  );

  useEffect(() => {
    fetchStudentData();

    // Realtime subscription for attendance
    if (!supabase || !id) return;
    const channel = supabase
      .channel(`attendance-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_attendance",
          filter: `student_id=eq.${id}`,
        },
        () => {
          fetchAttendance();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchStudentData, fetchAttendance, supabase]);

  useAutoRefresh(() => {
    fetchStudentData(true);
  }, ['students', 'student_profiles', 'invoices', 'transactions', 'student_attendance']);

  const handleAddCustomFee = async () => {
    if (!id || !supabase || !student) return;
    if (!customFeeTitle || !customFeeAmount) return;

    setIsAddingCustomFee(true);
    try {
      const newInvoice = {
        id: `INV-${student.id}-${Date.now()}`,
        student_id: student.id,
        student_name: student.name,
        category: customFeeTitle,
        amount: Number(customFeeAmount),
        due_date: customFeeDueDate,
        status: "Unpaid",
      };

      const { error } = await supabase
        .from("invoices")
        .insert([newInvoice])
        .select()
        .single();

      if (error) throw error;
      
      await fetchStudentData(true);
      setIsCustomFeeDialogOpen(false);
      setCustomFeeTitle("");
      setCustomFeeAmount("");
    } catch (err) {
      console.error("Failed to add custom fee:", err);
      alert("Failed to add custom fee. Check console for details.");
    } finally {
      setIsAddingCustomFee(false);
    }
  };

  const toggleStatus = async () => {
    if (!id || !supabase || !student) return;

    const newStatus = student.status === "Active" ? "Graduated" : "Active";
    const confirmMsg = `Are you sure you want to mark this student as ${newStatus}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Check which table (supporting both uuid match and student_id code match)
      const isUUID =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          id,
        );
      let pCheckQuery = supabase.from("student_profiles").select("id");
      if (isUUID) {
        pCheckQuery = pCheckQuery.eq("id", id);
      } else {
        pCheckQuery = pCheckQuery.eq("student_id", id);
      }
      const { data: profileCheck } = await pCheckQuery.maybeSingle();

      if (profileCheck) {
        await supabase
          .from("student_profiles")
          .update({ status: newStatus })
          .eq("id", profileCheck.id);
      } else {
        await supabase
          .from("students")
          .update({ status: newStatus })
          .eq("id", id);
      }

      setStudent((prev) => (prev ? { ...prev, status: newStatus } : null));
      setEditForm((prev) => (prev ? { ...prev, status: newStatus } : {}));
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Failed to update status.");
    }
  };

  const handleSaveProfile = async () => {
    if (!id || !supabase) return;

    try {
      // Check which table this student is from
      const isUUID =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          id,
        );

      let profileCheckQuery = supabase.from("student_profiles").select("id");
      if (isUUID) {
        profileCheckQuery = profileCheckQuery.eq("id", id);
      } else {
        profileCheckQuery = profileCheckQuery.eq("student_id", id);
      }

      const { data: profileCheck } = await profileCheckQuery.maybeSingle();

      if (profileCheck) {
        const parts = (editForm.name || "").trim().split(/\s+/);
        const firstName = parts[0] || "";
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
        const { error } = await supabase
          .from("student_profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            grade: editForm.grade,
            status: editForm.status || "Active", // Preserve current selected status (including Pending & Inactive)
            photo_url: editForm.photo_url || undefined,

            // Demographics & Core
            gender: editForm.gender || null,
            blood_group: editForm.blood_group || null,
            nationality: editForm.nationality || null,
            is_international: editForm.is_international || false,
            passport_number: editForm.passport_number || null,
            visa_status: editForm.visa_status || null,
            mother_tongue: editForm.mother_tongue || null,
            primary_language: editForm.primary_language || null,
            date_of_birth: editForm.date_of_birth || null,

            // Fee Structure
            fee_per_installment: editForm.fee_per_installment !== undefined && editForm.fee_per_installment !== "" ? editForm.fee_per_installment : null,
            fee_interval_months: editForm.fee_interval_months !== undefined && editForm.fee_interval_months !== "" ? editForm.fee_interval_months : null,
            fee_duration_value: editForm.fee_duration_value !== undefined && editForm.fee_duration_value !== "" ? editForm.fee_duration_value : null,
            fee_as_long_as_continues:
              editForm.fee_as_long_as_continues || false,

            // Parent/Guardian 1
            parent1_name: editForm.parent1_name || null,
            parent1_relation: editForm.parent1_relation || null,
            parent1_occupation: editForm.parent1_occupation || null,
            parent1_income: editForm.parent1_income || null,
            parent1_whatsapp: editForm.parent1_whatsapp || null,
            parent1_contact:
              editForm.contact || editForm.parent1_contact || null,

            // Parent/Guardian 2
            parent2_name: editForm.parent2_name || null,
            parent2_relation: editForm.parent2_relation || null,
            parent2_occupation: editForm.parent2_occupation || null,
            parent2_income: editForm.parent2_income || null,
            parent2_email: editForm.parent2_email || null,
            parent2_contact: editForm.parent2_contact || null,

            // Address
            address_line1: editForm.address_line1 || null,
            city: editForm.city || null,
            state: editForm.state || null,
            zip_code: editForm.zip_code || null,

            // Academic History
            previous_school: editForm.previous_school || null,
            last_grade_completed: editForm.last_grade_completed || null,
            reason_for_leaving: editForm.reason_for_leaving || null,
            previous_gpa: editForm.previous_gpa || null,

            // Medical & Emergency
            allergies: editForm.allergies || null,
            medical_conditions: editForm.medical_conditions || null,
            daily_medications: editForm.daily_medications || null,
            emergency_contact_name: editForm.emergency_contact_name || null,
            emergency_contact_relation:
              editForm.emergency_contact_relation || null,
            emergency_contact_number: editForm.emergency_contact_number || null,
          })
          .eq("id", profileCheck.id);
        if (error) throw error;
        
        // Also sync students table and invoices
        const targetStudentId = id;
        
        await supabase.from("students").update({
          name: editForm.name,
          contact: editForm.contact || editForm.parent1_contact || null,
          grade: editForm.grade,
          status: editForm.status || "Active",
        }).eq("id", targetStudentId);

        await supabase.from("invoices").update({
          student_name: editForm.name
        }).eq("student_id", targetStudentId);

        // Fetch transactions for the student and update their descriptions
        const { data: txs } = await supabase
          .from("transactions")
          .select("id, description")
          .eq("student_id", targetStudentId);
          
        if (txs && txs.length > 0) {
          for (const tx of txs) {
            let desc = tx.description;
            if (desc) {
               desc = desc.replace(/\(.*\)/, `(${editForm.name})`);
               desc = desc.replace(/by .*$/, `by ${editForm.name}`);
               await supabase.from("transactions").update({ description: desc }).eq("id", tx.id);
            }
          }
        }

        // Clear apiCache so other pages refetch
        apiCache.clear();

        // Check if we need to call override for fee calculation
        const target_fee_per_installment =
          editForm.fee_per_installment !== undefined
            ? editForm.fee_per_installment
            : student.fee_per_installment;

        const feeChanged =
          target_fee_per_installment !== student.fee_per_installment;
        const forceDivide =
          editDivideRemaining &&
          editTargetEndMonth &&
          editActiveEmiTab === "monthly";
        const forceAnnualDivide =
          editActiveEmiTab === "annual" && editAnnualEmis.length > 0;

        if (
          (feeChanged || forceDivide || forceAnnualDivide) &&
          target_fee_per_installment
        ) {
          const feeAmount = parseFloat(target_fee_per_installment.toString());

          // Delete all unpaid Tuition Fee invoices and replace with new ones
          await supabase
            .from("invoices")
            .delete()
            .eq("student_id", student?.student_id || profileCheck.id)
            .in("status", ["Unpaid", "Upcoming"])
            .or(
              "category.eq.Total Tuition Fee,category.eq.Remaining Course Fee Balance,category.like.Course Fee Installment%,category.like.%Installment,category.like.%Fee",
            );

          const todayStr = new Date().toISOString().split("T")[0];
          const invoicesToCreate = [];

          if (
            editActiveEmiTab === "monthly" &&
            forceDivide &&
            editCustomEmis &&
            editCustomEmis.length > 0
          ) {
            let idx = 1;
            editCustomEmis.forEach((emi) => {
              invoicesToCreate.push({
                id: `INV-${student?.student_id || profileCheck.id}-${Date.now()}-upd-${idx++}`,
                student_id: student?.student_id || profileCheck.id,
                student_name: editForm.name || student?.name,
                category: emi.label,
                amount: emi.amount,
                due_date: emi.date,
                status: "Unpaid",
              });
            });
          } else if (
            editActiveEmiTab === "annual" &&
            editAnnualEmis &&
            editAnnualEmis.length > 0
          ) {
            let idx = 1;
            editAnnualEmis.forEach((emi) => {
              invoicesToCreate.push({
                id: `INV-${targetStudentId}-${Date.now()}-upd-${idx++}`,
                student_id: targetStudentId,
                student_name: editForm.name || student?.name,
                category: emi.label,
                amount: emi.amount,
                due_date: emi.date,
                status: "Unpaid",
              });
            });
          } else {
            // Insert the single correct Total Tuition Fee if they didn't divide
            invoicesToCreate.push({
              id: `INV-${targetStudentId}-${Date.now()}-update`,
              student_id: targetStudentId,
              student_name: editForm.name || student?.name,
              category: `Total Tuition Fee`,
              amount: feeAmount,
              due_date: todayStr,
              status: "Unpaid",
            });
          }

          if (invoicesToCreate.length > 0) {
            await supabase.from("invoices").insert(invoicesToCreate);
          }
        }
      } else {
        const { error } = await supabase
          .from("students")
          .update({
            name: editForm.name,
            contact: editForm.contact,
            grade: editForm.grade,
            status: editForm.status || "Active",
          })
          .eq("id", id);
        if (error) throw error;
        
        await supabase.from("invoices").update({
          student_name: editForm.name
        }).eq("student_id", id);

        // Clear apiCache so other pages refetch
        apiCache.clear();
      }

      setStudent({ ...student, ...editForm } as Student);
      setIsEditing(false);
      fetchStudentData();
    } catch (err) {
      console.error("Error updating profile:", err);
      alert("Failed to update profile.");
    }
  };

  const handleSaveInvoiceEdit = async () => {
    if (!editingInvoiceId || !supabase) return;
    try {
      const amount = parseFloat(editInvoiceAmount);
      if (isNaN(amount)) return;
      const { error } = await supabase
        .from("invoices")
        .update({ amount })
        .eq("id", editingInvoiceId);
      if (error) throw error;
      setEditingInvoiceId(null);
      setEditInvoiceAmount("");
      fetchStudentData(true);
    } catch (e) {
      console.error("Failed to edit invoice", e);
    }
  };

  const handleProfilePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !id || !supabase) return;

    setUploading(true);
    try {
      // 1. Convert and compress image to a base64 JPEG format for offline cache and direct DB storage support
      const base64Url = await resizeImage(file);

      // Store in localStorage immediately as extremely reliable backup & local cache
      localStorage.setItem(`student_photo_${id}`, base64Url);

      // 2. Attempt real file upload to Supabase Storage bucket
      const fileName = `photo_${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;

      let finalPhotoUrl = base64Url;

      const { data, error: storageError } = await supabase.storage
        .from("student-documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!storageError) {
        // If storage uploaded successfully, retrieve the public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("student-documents").getPublicUrl(filePath);
        if (publicUrl) {
          finalPhotoUrl = publicUrl;
        }
      } else {
        console.warn(
          "Real photo upload to storage bucket failed, falling back to base64 DB column storage.",
          storageError,
        );
      }

      // 3. Update the database table (student_profiles or older students fallback) with final photo (publicUrl or base64)
      const isUUID =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          id,
        );
      let pCheckQuery = supabase.from("student_profiles").select("id");
      if (isUUID) {
        pCheckQuery = pCheckQuery.eq("id", id);
      } else {
        pCheckQuery = pCheckQuery.eq("student_id", id);
      }
      const { data: profileCheck } = await pCheckQuery.maybeSingle();

      if (profileCheck) {
        await supabase
          .from("student_profiles")
          .update({ photo_url: finalPhotoUrl })
          .eq("id", profileCheck.id);
      } else {
        await supabase
          .from("students")
          .update({ photo_url: finalPhotoUrl })
          .eq("id", id);
      }

      setStudent((prev) =>
        prev ? { ...prev, photo_url: finalPhotoUrl } : null,
      );
      setEditForm((prev) =>
        prev ? { ...prev, photo_url: finalPhotoUrl } : {},
      );
      alert("Profile photo updated successfully!");
    } catch (err: any) {
      console.error("Error uploading profile photo:", err);
      alert("Failed to update profile: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to opening in new tab if blob download fails
      window.open(url, "_blank");
    }
  };

  const handleDeleteDocument = async (docName: string) => {
    if (!id || !supabase) return;
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;

    setDeletingDocument(docName);
    try {
      const { error } = await supabase.storage
        .from("student-documents")
        .remove([`${id}/${docName}`]);

      if (error) {
        console.error("Error deleting document:", error);
        alert(`Failed to delete: ${error.message}`);
      } else {
        fetchStudentData();
      }
    } catch (err) {
      console.error("Delete operation failed:", err);
    } finally {
      setDeletingDocument(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !supabase) return;

    setPendingUploadFile(file);
    // If a category is already selected in the UI (and it's not 'All'), suggest that category
    if (activeDocCategory !== "All") {
      setUploadCategory(activeDocCategory);
    } else {
      setUploadCategory("Academic");
    }
    setIsUploadDialogOpen(true);
  };

  const confirmUpload = async () => {
    if (!pendingUploadFile || !id || !supabase) return;

    setUploading(true);
    setIsUploadDialogOpen(false);

    try {
      const file = pendingUploadFile;
      const categoryToUse = uploadCategory;

      // We encode the category in the filename for easy retrieval
      const fileName = `${categoryToUse}_${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;

      let { error } = await supabase.storage
        .from("student-documents")
        .upload(filePath, file);

      if (error) {
        console.error("Storage upload failed:", error);
        alert(
          `Failed to upload document: ${error.message}. Please verify that the 'student-documents' storage bucket exists.`,
        );
      } else {
        fetchStudentData();
      }
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setUploading(false);
      setPendingUploadFile(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-20">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b">
          <div className="flex items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-10 w-64" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="flex gap-6 border-b mb-6 overflow-x-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-10 w-28 rounded-none border-b-2 border-transparent"
              />
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <h2 className="text-2xl font-bold">Student Not Found</h2>
        <Button onClick={() => navigate("/students")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Students
        </Button>
      </div>
    );
  }

  const today = new Date();

  const computedInvoices = invoices
    .map((inv) => {
      // Standard actual payments (positive amount, not Discount)
      const amountPaid = transactions
        .filter(
          (t) =>
            (t.invoiceId === inv.id || t.invoice_id === inv.id) &&
            (t.status === "Success" || t.status === "success") &&
            t.type !== "Discount" &&
            t.category !== "Discount" &&
            !t.description?.toLowerCase().includes("discount") &&
            !t.description?.toLowerCase().includes("scholarship") &&
            Number(t.amount) > 0,
        )
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Discounts & Scholarships (negative amount, or classified as Discount/Scholarship)
      const discountAmount = transactions
        .filter(
          (t) =>
            (t.invoiceId === inv.id || t.invoice_id === inv.id) &&
            (t.status === "Success" || t.status === "success") &&
            (t.type === "Discount" ||
              t.category === "Discount" ||
              t.description?.toLowerCase().includes("discount") ||
              t.description?.toLowerCase().includes("scholarship") ||
              Number(t.amount) < 0),
        )
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

      // Late fees (positive amount, classified as Late Fee)
      const lateFeeAmount = transactions
        .filter(
          (t) =>
            (t.invoiceId === inv.id || t.invoice_id === inv.id) &&
            (t.status === "Success" || t.status === "success") &&
            (t.type === "Late Fee" ||
              t.description?.toLowerCase().includes("late fee") ||
              t.description?.toLowerCase().includes("penalty")) &&
            Number(t.amount) > 0,
        )
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const netInvoiceAmount = inv.totalAmount + lateFeeAmount - discountAmount;

      let computedStatus = inv.status;
      const isPastDue = new Date(inv.dueDate).getTime() < today.getTime();

      if (inv.status === "Overdue" || (inv.status === "Pending" && isPastDue)) {
        computedStatus = "Overdue";
      } else if (inv.status === "Pending") {
        computedStatus = "Upcoming";
      } else if (inv.status === "Paid") {
        computedStatus = "Paid";
      } else if (inv.status === "Partial") {
        computedStatus = "Partial";
      } else if (amountPaid >= netInvoiceAmount && netInvoiceAmount > 0) {
        computedStatus = "Paid";
      } else if (amountPaid > 0) {
        computedStatus = "Partial";
      } else if (isPastDue) {
        computedStatus = "Overdue";
      } else {
        computedStatus = "Upcoming";
      }

      return {
        ...inv,
        computedStatus,
        amountPaid,
        discountAmount,
        lateFeeAmount,
        netInvoiceAmount,
        amountDue: Math.max(0, netInvoiceAmount - amountPaid),
      };
    })
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

  const totalInvoiceOriginalAmount = computedInvoices.reduce(
    (acc, curr) => acc + curr.totalAmount,
    0,
  );
  const totalDiscounts = computedInvoices.reduce(
    (acc, curr) => acc + (curr.discountAmount || 0),
    0,
  );
  const totalLateFees = computedInvoices.reduce(
    (acc, curr) => acc + (curr.lateFeeAmount || 0),
    0,
  );
  const totalNetInvoiceAmount =
    totalInvoiceOriginalAmount + totalLateFees - totalDiscounts;

  const totalPaid = computedInvoices.reduce(
    (acc, curr) => acc + (curr.amountPaid || 0),
    0,
  );
  const totalDue = computedInvoices.reduce(
    (acc, curr) => acc + (curr.amountDue || 0),
    0,
  );
  const totalInvoiceAmount = totalNetInvoiceAmount; // compatibility alias

  const nextDueDate =
    computedInvoices
      .filter(
        (i) =>
          i.computedStatus === "Upcoming" ||
          i.computedStatus === "Overdue" ||
          i.computedStatus === "Partial",
      )
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )[0]?.dueDate || "None";

  const installmentInvoices = computedInvoices
    .filter(
      (i) =>
        !i.category?.toLowerCase().includes("downpayment") &&
        !i.category?.toLowerCase().includes("registration") &&
        i.totalAmount > 0,
    )
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

  const paidInstallmentsCount = installmentInvoices.filter(
    (i) => i.computedStatus === "Paid",
  ).length;
  const totalInstallmentsCount = installmentInvoices.length;

  let paymentBasisText = "Lump Sum";
  let paymentBasisAmount =
    installmentInvoices[0]?.totalAmount || totalNetInvoiceAmount;

  if (installmentInvoices.length > 1) {
    paymentBasisText = `${installmentInvoices.length} Fees`;
    paymentBasisAmount = installmentInvoices[0].totalAmount;

    const labels = installmentInvoices.map(
      (i) => i.category?.toLowerCase() || "",
    );
    const isAnnualSystem =
      labels.some((l) => l.includes("annual")) ||
      labels.some((l) => /^month \d+/.test(l)) ||
      labels.some((l) => /^quarter \d+/.test(l)) ||
      labels.some((l) => /^half \d+/.test(l)) ||
      labels.some((l) => /^installment \d+/.test(l));

    if (isAnnualSystem) {
      if (labels.some((l) => l.includes("quarter")))
        paymentBasisText = "Annual Plan (Quarterly)";
      else if (labels.some((l) => l.includes("half")))
        paymentBasisText = "Annual Plan (Half-Yearly)";
      else if (labels.some((l) => l.includes("month")))
        paymentBasisText = "Annual Plan (Monthly)";
      else paymentBasisText = "Annual Plan";
      paymentBasisAmount = totalNetInvoiceAmount; // For Annual plan, show the total cost
    } else {
      if (labels.some((l) => l.includes("quarter")))
        paymentBasisText = "Quarterly Basis";
      else if (labels.some((l) => l.includes("half")))
        paymentBasisText = "Half-Yearly Basis";
      else if (labels.some((l) => l.includes("annual")))
        paymentBasisText = "Annually Basis";
      else if (
        labels.some(
          (l) =>
            l.includes("month") ||
            l.includes("term") ||
            l.includes("installment") ||
            l.includes("emi"),
        )
      )
        paymentBasisText = "Monthly Basis";
      else paymentBasisText = "Monthly Basis"; // general fallback for multi-term
    }
  } else if (installmentInvoices.length === 1) {
    paymentBasisText = "Full Payment";
    paymentBasisAmount = installmentInvoices[0].totalAmount;
  }

  let formattedPaymentBasis = "";
  if (paymentBasisText === "Monthly Basis") {
    formattedPaymentBasis = `MONTHLY ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- MONTH`;
  } else if (paymentBasisText === "Quarterly Basis") {
    formattedPaymentBasis = `QUARTERLY ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- QUARTER`;
  } else if (paymentBasisText === "Half-Yearly Basis") {
    formattedPaymentBasis = `HALF-YEARLY ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- HALF`;
  } else if (paymentBasisText === "Annually Basis") {
    formattedPaymentBasis = `ANNUALLY ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- YEAR`;
  } else if (paymentBasisText.startsWith("Annual Plan")) {
    const cycle = paymentBasisText.includes("Monthly")
      ? "MONTH"
      : paymentBasisText.includes("Quarterly")
        ? "QUARTER"
        : paymentBasisText.includes("Half")
          ? "HALF"
          : "YEAR";
    formattedPaymentBasis = `₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/- ${cycle}`;
  } else if (paymentBasisText === "Full Payment") {
    formattedPaymentBasis = `FULL PAYMENT ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    formattedPaymentBasis = `LUMP SUM ₹${paymentBasisAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const formatLedgerDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const cleanDateStr = dateStr.includes("T")
      ? dateStr
      : `${dateStr}T12:00:00`;
    const d = new Date(cleanDateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Dynamically compute the ledger entries chronologically
  const compiledLedgerRows = (() => {
    const rawEntries: Array<{
      date: string;
      preciseDate: Date;
      particulars: string;
      dr: number | null;
      cr: number | null;
      rawTxn?: any;
      rawInvoice?: any;
    }> = [];

    // 1. Every invoice in computedInvoices is a row.
    computedInvoices.forEach((inv) => {
      rawEntries.push({
        date: inv.dueDate,
        preciseDate: new Date(
          inv.dueDate.includes("T") ? inv.dueDate : inv.dueDate + "T12:00:00",
        ),
        particulars: (inv.title || inv.category || "Invoice Due")
          .replace(/Installment/g, "Fee")
          .replace(/installment/g, "fee"),
        dr: inv.amountDue > 0 ? inv.amountDue : null,
        cr: null,
        rawInvoice: inv,
      });
    });

    // 2. Successful transactions that are NOT linked to any invoice.
    transactions
      .filter((t) => t.status === "Success" || t.status === "success")
      .filter((t) => !t.invoiceId && !t.invoice_id)
      .forEach((t) => {
        const isLateFee =
          t.type === "Late Fee" ||
          t.category === "Late Fee" ||
          t.description?.toLowerCase().includes("late fee") ||
          t.description?.toLowerCase().includes("penalty");

        const isDiscount =
          t.type === "Discount" ||
          t.category === "Discount" ||
          t.description?.toLowerCase().includes("discount") ||
          t.description?.toLowerCase().includes("scholarship") ||
          Number(t.amount) < 0;

        const cleanDate = t.date || "";

        if (isLateFee) {
          rawEntries.push({
            date: cleanDate,
            preciseDate: new Date(
              cleanDate.includes("T") ? cleanDate : cleanDate + "T12:00:00",
            ),
            particulars: t.description || "Late Fee Penalty",
            dr: Math.abs(Number(t.amount)),
            cr: null,
            rawTxn: t,
          });
        } else if (isDiscount) {
          rawEntries.push({
            date: cleanDate,
            preciseDate: new Date(
              cleanDate.includes("T") ? cleanDate : cleanDate + "T12:00:00",
            ),
            particulars: t.description || "Discount Applied",
            dr: null,
            cr: Math.abs(Number(t.amount)),
            rawTxn: t,
          });
        } else {
          // Standard Payment
          rawEntries.push({
            date: cleanDate,
            preciseDate: new Date(
              cleanDate.includes("T") ? cleanDate : cleanDate + "T12:00:00",
            ),
            particulars:
              t.description ||
              `Payment Received via ${t.paymentMethod || "SYSTEM"}`,
            dr: null,
            cr: Number(t.amount),
            rawTxn: t,
          });
        }
      });

    // Sort chronologically (oldest first)
    const sorted = [...rawEntries].sort((a, b) => {
      const timeA = a.preciseDate.getTime();
      const timeB = b.preciseDate.getTime();
      if (timeA !== timeB) return timeA - timeB;

      // If same date, invoices first
      if (a.rawInvoice && !b.rawInvoice) return -1;
      if (!a.rawInvoice && b.rawInvoice) return 1;
      return 0;
    });

    // Calculate running balance
    let balance = 0;
    return sorted.map((row) => {
      if (row.dr !== null) {
        balance += row.dr;
      }
      if (row.cr !== null) {
        balance -= row.cr;
      }
      return {
        ...row,
        balance,
      };
    });
  })();

  const attendanceRate =
    (attendance.filter((a) => a.status === "Present").length /
      attendance.length) *
    100;
  const submissionRate =
    (assignments.filter((a) => a.status !== "Pending").length /
      assignments.length) *
    100;

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate("/students")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleStatus}
            className={
              student.status === "Active"
                ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                : "border-blue-200 text-blue-600 hover:bg-blue-50"
            }
          >
            {student.status === "Active" ? (
              <>
                <GraduationCap className="mr-2 h-4 w-4" /> Mark as Graduated
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" /> Re-activate Student
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowIDCard(true)}
          >
            <Award className="mr-2 h-4 w-4 text-primary" /> Generate ID Card
          </Button>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b">
        <div className="flex items-center gap-6">
          <div className="relative h-24 w-24 group">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner overflow-hidden">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt={student.name}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="h-12 w-12" />
              )}
            </div>
            {isEditing && (
              <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5" />
                <span className="text-[9px] mt-1 font-bold">Change</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePhotoUpload}
                />
              </label>
            )}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
              {student.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-mono text-sm">
              <span className="bg-muted/50 px-2 py-0.5 rounded">
                {student.student_id || student.id.slice(0, 8)}
              </span>
              <span className="text-muted-foreground/50">•</span>
              <span className="uppercase tracking-widest">{student.grade}</span>
              <span className="text-muted-foreground/50">•</span>
              <Badge
                variant={
                  student.status === "Active"
                    ? "success"
                    : student.status === "Graduated"
                      ? "default"
                      : "secondary"
                }
                className="rounded-md"
              >
                {student.status}
              </Badge>
              {attendanceRate < 75 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" /> Low Attendance
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none p-0 bg-transparent mb-6 h-auto flex-wrap overflow-x-auto">
          {[
            { id: "overview", label: "Student Profile" },
            { id: "attendance", label: "Attendance" },
            { id: "ledger", label: "Ledger" },
            { id: "documents", label: "Documents" },
            { id: "remarks", label: "Remarks" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 pb-3 pt-3 text-sm font-semibold uppercase tracking-wider transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab: Student Profile (Overview) */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-muted/20 md:col-span-3">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Demographics & Enrollment</CardTitle>
                  <CardDescription>
                    Primary information and contact details.
                  </CardDescription>
                </div>
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true);
                      setEditForm({ ...student });
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm(student);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-1" /> Save Changes
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-6 mt-4">
                  {/* General & Enrollment */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Full Name
                      </label>
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        readOnly={!isEditing}
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none"
                            : "bg-muted/30"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Student ID (Read Only)
                      </label>
                      <Input
                        value={student.student_id || student.id.slice(0, 8)}
                        readOnly
                        className="bg-muted/10 border-none font-medium text-muted-foreground font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contact Number
                      </label>
                      <Input
                        value={editForm.contact || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, contact: e.target.value })
                        }
                        readOnly={!isEditing}
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none font-mono"
                            : "font-mono bg-muted/30"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Enrolled Course / Grade
                      </label>
                      <Input
                        value={editForm.grade || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, grade: e.target.value })
                        }
                        readOnly={!isEditing}
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none"
                            : "bg-muted/30"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.status || "Active"}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              status: e.target.value as any,
                            })
                          }
                          className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Graduated">Graduated</option>
                        </select>
                      ) : (
                        <Input
                          value={editForm.status || student.status || "Active"}
                          readOnly
                          className="bg-muted/10 border-none font-medium pointer-events-none"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Date of Birth
                      </label>
                      <Input
                        type="date"
                        value={editForm.date_of_birth || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            date_of_birth: e.target.value,
                          })
                        }
                        readOnly={!isEditing}
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none"
                            : "bg-muted/30"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Gender
                      </label>
                      <Input
                        value={editForm.gender || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, gender: e.target.value })
                        }
                        readOnly={!isEditing}
                        placeholder="e.g. Male, Female, Other"
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none"
                            : "bg-muted/30"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Blood Group
                      </label>
                      <Input
                        value={editForm.blood_group || ""}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            blood_group: e.target.value,
                          })
                        }
                        readOnly={!isEditing}
                        placeholder="e.g. O+, A-"
                        className={
                          !isEditing
                            ? "bg-muted/10 border-none font-medium pointer-events-none"
                            : "bg-muted/30"
                        }
                      />
                    </div>
                  </div>

                  {/* Parent & Guardian 1 */}
                  <div className="border-t pt-4">
                    <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">
                      Primary Parent / Guardian
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Guardian Name
                        </label>
                        <Input
                          value={editForm.parent1_name || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_name: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Relationship
                        </label>
                        <Input
                          value={editForm.parent1_relation || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_relation: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          placeholder="e.g. Father, Mother"
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Occupation
                        </label>
                        <Input
                          value={editForm.parent1_occupation || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_occupation: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Annual Income
                        </label>
                        <Input
                          value={editForm.parent1_income || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_income: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          placeholder="e.g. ₹6,000,000"
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          WhatsApp Number
                        </label>
                        <Input
                          type="text"
                          value={editForm.parent1_whatsapp || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_whatsapp: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Guardian Contact
                        </label>
                        <Input
                          value={editForm.parent1_contact || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              parent1_contact: e.target.value,
                              contact: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none font-mono"
                              : "bg-muted/30 font-mono"
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fee Structure */}
                  <div className="border-t pt-4">
                    <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">
                      Fee Structure
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4 sm:col-span-2">
                        <div className="space-y-2 w-full sm:w-1/2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total Fee Amount (₹)
                          </label>
                          <Input
                            type="number"
                            value={editForm.fee_per_installment || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                fee_per_installment:
                                  parseFloat(e.target.value) || null,
                              })
                            }
                            readOnly={!isEditing}
                            placeholder="e.g. 50000"
                            className={
                              !isEditing
                                ? "bg-muted/10 border-none font-medium pointer-events-none font-mono"
                                : "bg-muted/30 font-mono"
                            }
                          />
                        </div>

                        {isEditing && (
                          <Tabs
                            value={editActiveEmiTab}
                            onValueChange={setEditActiveEmiTab}
                            className="w-full mt-4"
                          >
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="monthly">
                                Monthly / Custom EMIs
                              </TabsTrigger>
                              <TabsTrigger value="annual">
                                Annual Fee System
                              </TabsTrigger>
                            </TabsList>
                            <TabsContent
                              value="monthly"
                              className="space-y-4 pt-4 border-t border-muted/20"
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editDivideRemaining}
                                  onChange={(e) =>
                                    setEditDivideRemaining(e.target.checked)
                                  }
                                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium leading-none">
                                  Divide remaining amount into EMIs?
                                </span>
                              </label>
                              {editDivideRemaining && (
                                <div className="grid grid-cols-2 gap-4 mt-3 w-full sm:w-3/4">
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      Frequency *
                                    </label>
                                    <select
                                      value={editEmiFrequency}
                                      onChange={(e) =>
                                        setEditEmiFrequency(e.target.value)
                                      }
                                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <option value="Monthly">Monthly</option>
                                      <option value="Quarterly">
                                        Quarterly
                                      </option>
                                      <option value="Half-Yearly">
                                        Half-Yearly
                                      </option>
                                      <option value="Annually">Annually</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      Target End Date *
                                    </label>
                                    <Input
                                      type="date"
                                      value={editTargetEndMonth}
                                      onChange={(e) =>
                                        setEditTargetEndMonth(e.target.value)
                                      }
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1 col-span-2">
                                    The remaining balance will be divided
                                    equally into each term between the
                                    enrollment date and this month.
                                  </p>
                                </div>
                              )}

                              {editDivideRemaining &&
                                editTargetEndMonth &&
                                (editForm.fee_per_installment || 0) > 0 && (
                                  <FeeEmiPreview
                                    totalCourseFee={
                                      editForm.fee_per_installment || 0
                                    }
                                    downpayment={computedInvoices.reduce(
                                      (sum, inv) => {
                                        const paidForInv = transactions
                                          .filter(
                                            (t) =>
                                              t.invoice_id === inv.id ||
                                              t.invoiceId === inv.id,
                                          )
                                          .reduce(
                                            (s, t) => s + (t.amount || 0),
                                            0,
                                          );
                                        return sum + paidForInv;
                                      },
                                      0,
                                    )}
                                    targetEndMonth={editTargetEndMonth}
                                    enrollmentDate={
                                      student?.enrollment_date ||
                                      new Date().toISOString().split("T")[0]
                                    }
                                    emiFrequency={editEmiFrequency}
                                    onEmisChange={setEditCustomEmis}
                                  />
                                )}
                            </TabsContent>
                            <TabsContent
                              value="annual"
                              className="pt-4 border-t border-muted/20"
                            >
                              <div className="space-y-4">
                                <div className="space-y-1 sm:w-2/3">
                                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    EMI Frequency *
                                  </label>
                                  <div className="flex gap-2">
                                    <select
                                      value={editAnnualEmiFrequency}
                                      onChange={(e) =>
                                        setEditAnnualEmiFrequency(
                                          e.target.value,
                                        )
                                      }
                                      className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <option value="Monthly">Monthly</option>
                                      <option value="Quarterly">
                                        Quarterly
                                      </option>
                                      <option value="Half-Yearly">
                                        Half-Yearly
                                      </option>
                                      <option value="Annually">Annually</option>
                                      <option value="Custom">Custom</option>
                                    </select>

                                    {editAnnualEmiFrequency === "Custom" && (
                                      <>
                                        <div className="flex flex-col">
                                          <Input
                                            type="number"
                                            value={
                                              editForm.annualEmiCustomTerms ||
                                              ""
                                            }
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                annualEmiCustomTerms:
                                                  e.target.value,
                                              }))
                                            }
                                            placeholder="# Emis"
                                            className="w-20 font-mono h-9"
                                          />
                                          <span className="text-[9px] text-muted-foreground mt-1">
                                            Total EMIs
                                          </span>
                                        </div>
                                        <div className="flex flex-col">
                                          <Input
                                            type="number"
                                            value={
                                              editForm.annualEmiCustomGap || ""
                                            }
                                            onChange={(e) =>
                                              setEditForm((prev) => ({
                                                ...prev,
                                                annualEmiCustomGap:
                                                  e.target.value,
                                              }))
                                            }
                                            placeholder="Gap"
                                            className="w-20 font-mono h-9"
                                          />
                                          <span className="text-[9px] text-muted-foreground mt-1">
                                            Gap (Months)
                                          </span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {(editForm.fee_per_installment || 0) > 0 && (
                                  <AnnualEmiPolicyMaker
                                    totalCourseFee={
                                      editForm.fee_per_installment || 0
                                    }
                                    downpayment={computedInvoices.reduce(
                                      (sum, inv) => {
                                        const paidForInv = transactions
                                          .filter(
                                            (t) =>
                                              t.invoice_id === inv.id ||
                                              t.invoiceId === inv.id,
                                          )
                                          .reduce(
                                            (s, t) => s + (t.amount || 0),
                                            0,
                                          );
                                        return sum + paidForInv;
                                      },
                                      0,
                                    )}
                                    frequency={editAnnualEmiFrequency}
                                    customTerms={
                                      editForm.annualEmiCustomTerms
                                        ? parseInt(
                                            editForm.annualEmiCustomTerms as string,
                                          )
                                        : undefined
                                    }
                                    customGap={
                                      editForm.annualEmiCustomGap
                                        ? parseInt(
                                            editForm.annualEmiCustomGap as string,
                                          )
                                        : undefined
                                    }
                                    enrollmentDate={editForm.enrollment_date}
                                    onPolicyChange={setEditAnnualEmis}
                                  />
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address Detail */}
                  <div className="border-t pt-4">
                    <h3 className="font-serif text-sm font-bold text-primary mb-4 uppercase tracking-widest">
                      Residential Address
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Address Line 1
                        </label>
                        <Input
                          value={editForm.address_line1 || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              address_line1: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          City
                        </label>
                        <Input
                          value={editForm.city || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, city: e.target.value })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          State
                        </label>
                        <Input
                          value={editForm.state || ""}
                          onChange={(e) =>
                            setEditForm({ ...editForm, state: e.target.value })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none"
                              : "bg-muted/30"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Zip / Postal Code
                        </label>
                        <Input
                          value={editForm.zip_code || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              zip_code: e.target.value,
                            })
                          }
                          readOnly={!isEditing}
                          className={
                            !isEditing
                              ? "bg-muted/10 border-none font-medium pointer-events-none font-mono"
                              : "bg-muted/30 font-mono"
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>{" "}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Attendance */}
        <TabsContent value="attendance" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-1 bg-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success animate-pulse"></div>
                  <CardTitle className="text-sm">
                    Real-time Attendance
                  </CardTitle>
                </div>
                <CardDescription className="text-[10px]">
                  Changes sync instantly to the cloud
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  {[
                    {
                      s: "Present" as const,
                      i: CheckCircle2,
                      colors:
                        "border-success/30 hover:bg-success/10 text-success",
                    },
                    {
                      s: "Absent" as const,
                      i: AlertCircle,
                      colors:
                        "border-destructive/30 hover:bg-destructive/10 text-destructive",
                    },
                    {
                      s: "Late" as const,
                      i: Clock,
                      colors:
                        "border-warning/30 hover:bg-warning/10 text-warning",
                    },
                    {
                      s: "Excused" as const,
                      i: FileText,
                      colors: "border-info/30 hover:bg-info/10 text-info",
                    },
                  ].map((btn) => (
                    <Button
                      key={btn.s}
                      onClick={() => handleMarkAttendance(btn.s)}
                      variant="outline"
                      size="sm"
                      className={`justify-start gap-2 capitalize ${btn.colors}`}
                    >
                      <btn.i className="h-3.5 w-3.5" /> {btn.s}
                    </Button>
                  ))}
                </div>
                <div className="pt-2">
                  <p className="text-[9px] text-muted-foreground uppercase font-black mb-1.5 tracking-tighter">
                    Status Log
                  </p>
                  <div className="text-[10px] space-y-1 font-mono max-h-[100px] overflow-y-auto pr-2">
                    {attendance.slice(0, 3).map((a, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/50"
                      >
                        <span className="opacity-70">
                          {a.date.split("-").slice(1).join("/")}
                        </span>
                        <span
                          className={`font-bold ${a.status === "Present" ? "text-success" : "text-primary"}`}
                        >
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle>Presence History</CardTitle>
                    <div className="flex items-center bg-muted/30 rounded-lg p-1 border border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const d = new Date(currentViewDate);
                          d.setMonth(d.getMonth() - 1);
                          setCurrentViewDate(d);
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="px-3 min-w-[120px] text-center">
                        <span className="text-xs font-bold uppercase tracking-widest">
                          {currentViewDate.toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const d = new Date(currentViewDate);
                          d.setMonth(d.getMonth() + 1);
                          setCurrentViewDate(d);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Daily engagement tracked in the cloud
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-tighter">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-success"></div>{" "}
                    Present
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-destructive"></div>{" "}
                    Absent
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-warning"></div> Late
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>{" "}
                    Holiday
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const year = currentViewDate.getFullYear();
                    const month = currentViewDate.getMonth();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

                    return Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const dateStr = `${monthStr}-${String(dayNum).padStart(2, "0")}`;
                      const dayRecord = attendance.find(
                        (a) => a.date === dateStr,
                      );
                      const status = dayRecord?.status;

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            const dayRecords = attendance.filter(
                              (a) => a.date === dateStr,
                            );
                            if (dayRecords.length > 0) {
                              setSelectedDay({
                                ...dayRecords[0],
                                sessions: dayRecords.map((r) => ({
                                  subject: r.subject || "General",
                                  status: r.status as any,
                                  time: r.created_at
                                    ? new Date(r.created_at).toLocaleTimeString(
                                        [],
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                          hour12: true,
                                        },
                                      )
                                    : "N/A",
                                })),
                              });
                            }
                          }}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center border border-muted/20 relative group transition-all hover:scale-110 active:scale-95
                                ${
                                  status === "Present"
                                    ? "bg-success/10 border-success/30"
                                    : status === "Absent"
                                      ? "bg-destructive/10 border-destructive/30"
                                      : status === "Late"
                                        ? "bg-warning/10 border-warning/30"
                                        : status === "Holiday"
                                          ? "bg-purple-500/10 border-purple-500/30"
                                          : status === "Excused"
                                            ? "bg-info/10 border-info/30"
                                            : "bg-muted/5"
                                }`}
                        >
                          <span className="text-[10px] font-mono opacity-50">
                            {dayNum}
                          </span>
                          {status && (
                            <div
                              className={`w-1.5 h-1.5 rounded-full mt-1 ${
                                status === "Present"
                                  ? "bg-emerald-500"
                                  : status === "Absent"
                                    ? "bg-destructive"
                                    : status === "Late"
                                      ? "bg-yellow-500"
                                      : status === "Holiday"
                                        ? "bg-purple-500"
                                        : "bg-blue-500"
                              }`}
                            ></div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status Distribution</CardTitle>
                <CardDescription className="text-[10px]">
                  Monthly performance for{" "}
                  {currentViewDate.toLocaleString("default", { month: "long" })}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] p-0 pr-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(() => {
                      const year = currentViewDate.getFullYear();
                      const month = currentViewDate.getMonth();
                      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
                      const monthlyRecords = attendance.filter((a) =>
                        a.date.startsWith(monthStr),
                      );

                      return [
                        {
                          name: "Present",
                          value: monthlyRecords.filter(
                            (r) => r.status === "Present",
                          ).length,
                        },
                        {
                          name: "Absent",
                          value: monthlyRecords.filter(
                            (r) => r.status === "Absent",
                          ).length,
                        },
                        {
                          name: "Late",
                          value: monthlyRecords.filter(
                            (r) => r.status === "Late",
                          ).length,
                        },
                        {
                          name: "Holiday",
                          value: monthlyRecords.filter(
                            (r) => r.status === "Holiday",
                          ).length,
                        },
                        {
                          name: "Excused",
                          value: monthlyRecords.filter(
                            (r) => r.status === "Excused",
                          ).length,
                        },
                      ];
                    })()}
                  >
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 9,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(var(--primary), 0.1)" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "10px",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar dataKey="value">
                      {[
                        { name: "Present", color: "#16A34A" },
                        { name: "Absent", color: "#DC2626" },
                        { name: "Late", color: "#D97706" },
                        { name: "Holiday", color: "#7C3AED" },
                        { name: "Excused", color: "#2563EB" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={
                stats.consecutiveAbsences >= 3
                  ? "bg-destructive/5 border-destructive/20 relative overflow-hidden"
                  : "bg-emerald-50/5 border-emerald-200/50 relative overflow-hidden"
              }
            >
              <div className="absolute top-0 right-0 p-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[10px] uppercase font-bold"
                  onClick={() => {
                    const msg = `Dear Parent, ${student.name} has been absent for 3 consecutive days. Please contact the office.`;
                    window.open(
                      `https://wa.me/${student.contact}?text=${encodeURIComponent(msg)}`,
                      "_blank",
                    );
                  }}
                >
                  <Send className="w-3 h-3 mr-1" /> Send WhatsApp
                </Button>
              </div>
              <CardContent className="p-6 flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center ${stats.consecutiveAbsences >= 3 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"}`}
                >
                  {stats.consecutiveAbsences >= 3 ? (
                    <AlertCircle className="h-6 w-6" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h3
                    className={`font-bold ${stats.consecutiveAbsences >= 3 ? "text-destructive underline underline-offset-4 decoration-destructive/30" : "text-emerald-700"}`}
                  >
                    {stats.consecutiveAbsences >= 3
                      ? "Action Required: Absence Alert"
                      : "Attendance Standing: Excellent"}
                  </h3>
                  <p className="text-sm text-destructive/80 mr-24">
                    {stats.consecutiveAbsences >= 3
                      ? `${stats.consecutiveAbsences} consecutive absences (${stats.dateRange}) flagged. Intervention needed.`
                      : "Consistent presence maintained. No recent flags."}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-primary">Punctuality Score</h3>
                  <p className="text-sm text-primary/80">
                    {stats.punctualityScore}% of sessions started on time.
                    Improving from last month.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Remarks */}
        <TabsContent value="remarks" className="space-y-6 mt-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Communication History</CardTitle>
                <CardDescription>
                  Teacher remarks and system notifications
                </CardDescription>
              </div>
              <Button size="sm">
                <MessageSquare className="mr-2 h-4 w-4" /> Add New Remark
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-muted">
                {remarks.map((rem) => (
                  <div key={rem.id} className="relative pl-12">
                    <div
                      className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-4 border-background shadow-sm
                            ${rem.category === "Academic" ? "bg-success text-foreground" : "bg-info text-foreground"}`}
                    >
                      {rem.category === "Academic" ? (
                        <Award className="h-4 w-4" />
                      ) : (
                        <MessageSquare className="h-4 w-4" />
                      )}
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border border-muted/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold">
                          {rem.category} Remark
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {rem.date}
                        </span>
                      </div>
                      <p className="text-sm italic text-foreground/80 mb-3">
                        "{rem.comment}"
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                        <span>Authored by: {rem.teacherName}</span>
                        <Badge variant="outline" className="text-[9px] py-0">
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="relative pl-12">
                  <div className="absolute left-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="bg-muted/10 p-4 rounded-xl border border-dashed border-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Automated: Monthly progress report SMS sent to parent
                      contact.
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      2024-05-01 09:00 AM
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Financial Ledger */}
        <TabsContent
          value="ledger"
          className="mt-0 animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <div className="bg-white border border-gray-200 rounded-sm p-8 shadow-sm space-y-8">
            {/* Summary Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-8">
              <div className="flex flex-wrap items-center gap-8">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Total Batch Fee
                  </p>
                  <p className="text-3xl font-light text-slate-900 tabular-nums">
                    ₹
                    {totalNetInvoiceAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Total Paid
                  </p>
                  <p className="text-3xl font-light text-emerald-600 tabular-nums">
                    ₹
                    {totalPaid.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Total Due
                  </p>
                  <p className="text-3xl font-light text-red-600 tabular-nums">
                    ₹
                    {totalDue.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <span className="hidden lg:block h-10 w-px bg-slate-200 self-center" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                    Total Installments / EMIs
                  </p>
                  <p className="text-3xl font-light text-slate-800 tabular-nums flex items-baseline gap-2">
                    <span>{totalInstallmentsCount}</span>
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded border border-teal-100 shadow-xs">
                      {paidInstallmentsCount} of {totalInstallmentsCount} Paid
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 sm:mt-0">
                <Button
                  variant="outline"
                  className="bg-white text-teal-800 hover:bg-teal-50 border-teal-200 rounded px-4 py-5 text-sm font-medium tracking-wide shadow-none transition-colors"
                  onClick={() => setIsCustomFeeDialogOpen(true)}
                >
                  [+ Add Custom Fee]
                </Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded px-6 py-5 text-sm font-medium tracking-wide shadow-none transition-colors"
                  onClick={() => setIsPaymentDrawerOpen(true)}
                >
                  [+ Collect Payment]
                </Button>
              </div>
            </div>

            {/* Monthly / Annual Basis Subscription Alert */}
            {paymentBasisText.startsWith("Annual Plan") ? (
              <div className="p-4 bg-emerald-50/50 border border-emerald-250 rounded-sm text-emerald-950 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-emerald-950">
                        Active Fee Plan
                      </p>
                      <span className="px-2 py-0.5 bg-emerald-100/70 border border-emerald-250/20 text-emerald-800 text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Annual Fee System
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      This student purchased this batch on a structured annual
                      fee program with{" "}
                      <strong className="font-bold text-emerald-900">
                        {totalInstallmentsCount} active EMIs / installments
                      </strong>{" "}
                      ({paidInstallmentsCount} paid,{" "}
                      {totalInstallmentsCount - paidInstallmentsCount}{" "}
                      upcoming).
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold leading-none mb-1">
                    {paymentBasisText.includes("Monthly")
                      ? "MONTHLY COST BASIS"
                      : paymentBasisText.includes("Quarterly")
                        ? "QUARTERLY COST BASIS"
                        : paymentBasisText.includes("Half")
                          ? "HALF-YEARLY COST BASIS"
                          : "ANNUAL COST BASIS"}
                  </p>
                  <p className="text-base font-black text-emerald-950 tabular-nums">
                    {formattedPaymentBasis}
                  </p>
                </div>
              </div>
            ) : paymentBasisText === "Monthly Basis" ? (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-sm text-teal-900 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-teal-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-teal-950">
                      Active Fee Plan
                    </p>
                    <p className="text-xs text-teal-700">
                      This student purchased this batch on a monthly fee program
                      with{" "}
                      <strong className="font-bold text-teal-950">
                        {totalInstallmentsCount} active EMIs / installments
                      </strong>{" "}
                      ({paidInstallmentsCount} paid,{" "}
                      {totalInstallmentsCount - paidInstallmentsCount}{" "}
                      upcoming).
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-teal-600 uppercase tracking-widest font-bold leading-none mb-1">
                    Monthly Cost basis
                  </p>
                  <p className="text-base font-black text-teal-950 tabular-nums">
                    ₹
                    {paymentBasisAmount.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    /- MONTH
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm text-slate-800 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-slate-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-950">
                      Payment Setup Status
                    </p>
                    <p className="text-xs text-slate-600">
                      The billing schedule contract frequency has been
                      established with{" "}
                      <strong className="font-bold text-slate-900">
                        {totalInstallmentsCount} active EMIs / installments
                      </strong>{" "}
                      ({paidInstallmentsCount} paid,{" "}
                      {totalInstallmentsCount - paidInstallmentsCount}{" "}
                      upcoming).
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold leading-none mb-1">
                    Billing frequency
                  </p>
                  <p className="text-base font-black text-slate-900">
                    {formattedPaymentBasis}
                  </p>
                </div>
              </div>
            )}

            {/* Bank Statement Ledger Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm text-slate-900 whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-250 text-left">
                    <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider text-xs w-[12%]">
                      Date
                    </th>
                    <th className="py-3 px-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">
                      Particulars &amp; Details
                    </th>
                    <th className="py-3 px-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs w-[15%]">
                      Overdue / Pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compiledLedgerRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-12 text-center text-gray-400 italic"
                      >
                        No financial entries found for this student.
                      </td>
                    </tr>
                  ) : (
                    compiledLedgerRows.map((row, index) => {
                      const isInvoice = !!row.rawInvoice;
                      const isEditingThisInvoice =
                        isInvoice && editingInvoiceId === row.rawInvoice.id;

                      let rowDueDate: string | null = null;
                      let rowDueAmount: number | null = null;
                      let rowPaidAmount: number | null = null;
                      let rowPayDate: string | null = null;

                      if (isInvoice) {
                        const inv = row.rawInvoice;
                        rowDueDate = inv.dueDate;
                        rowDueAmount = inv.totalAmount;
                        rowPaidAmount = inv.amountPaid || 0;

                        // Find successful payments
                        const payTransactions = transactions.filter(
                          (t) =>
                            (t.invoiceId === inv.id ||
                              t.invoice_id === inv.id) &&
                            (t.status === "Success" ||
                              t.status === "success") &&
                            t.type !== "Discount" &&
                            t.category !== "Discount" &&
                            !t.description
                              ?.toLowerCase()
                              .includes("discount") &&
                            !t.description
                              ?.toLowerCase()
                              .includes("scholarship") &&
                            Number(t.amount) > 0,
                        );
                        if (payTransactions.length > 0) {
                          const sortedTxns = [...payTransactions].sort(
                            (a, b) =>
                              new Date(a.date).getTime() -
                              new Date(b.date).getTime(),
                          );
                          rowPayDate = sortedTxns
                            .map((t) => formatLedgerDate(t.date))
                            .join(", ");
                        }
                      } else if (row.rawTxn) {
                        const txn = row.rawTxn;
                        const linkedInv = computedInvoices.find(
                          (i) =>
                            i.id === txn.invoiceId || i.id === txn.invoice_id,
                        );

                        if (linkedInv) {
                          rowDueDate = linkedInv.dueDate;
                          rowDueAmount = linkedInv.totalAmount;
                        }

                        if (row.cr !== null) {
                          rowPaidAmount = row.cr;
                          rowPayDate = txn.date;
                        }
                      }

                      return (
                        <tr
                          key={index}
                          className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                        >
                          {/* Date Column */}
                          <td className="py-4 px-4 tabular-nums text-slate-550 text-xs text-left">
                            {formatLedgerDate(row.date)}
                          </td>

                          {/* Particulars & Details Column */}
                          <td className="py-4 px-4 text-slate-900">
                            {isInvoice ? (
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {row.particulars}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                                      row.rawInvoice.computedStatus === "Paid"
                                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                                        : row.rawInvoice.computedStatus ===
                                            "Overdue"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : row.rawInvoice.computedStatus ===
                                                "Partially Paid" ||
                                              row.rawInvoice.computedStatus ===
                                                "Partial"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-gray-50 text-gray-700 border border-gray-200"
                                    }`}
                                  >
                                    {row.rawInvoice.computedStatus}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                  <span>
                                    Due Date:{" "}
                                    {rowDueDate
                                      ? formatLedgerDate(rowDueDate)
                                      : "-"}
                                  </span>
                                  <span className="text-gray-300">|</span>
                                  <span>
                                    Original Due:{" "}
                                    <strong>
                                      ₹
                                      {rowDueAmount?.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }) || "0.00"}
                                    </strong>
                                  </span>
                                  {rowPaidAmount !== null &&
                                    rowPaidAmount > 0 && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span className="text-teal-600 font-medium">
                                          Total Paid: ₹
                                          {rowPaidAmount?.toLocaleString(
                                            "en-IN",
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )}
                                        </span>
                                      </>
                                    )}
                                </div>

                                {/* Render each payment/receipt beautifully inline */}
                                {(() => {
                                  const payTransactions = transactions.filter(
                                    (t) =>
                                      (t.invoiceId === row.rawInvoice.id ||
                                        t.invoice_id === row.rawInvoice.id) &&
                                      (t.status === "Success" ||
                                        t.status === "success") &&
                                      t.type !== "Discount" &&
                                      t.category !== "Discount" &&
                                      !t.description
                                        ?.toLowerCase()
                                        .includes("discount") &&
                                      !t.description
                                        ?.toLowerCase()
                                        .includes("scholarship") &&
                                      Number(t.amount) > 0,
                                  );
                                  const discountTransactions =
                                    transactions.filter(
                                      (t) =>
                                        (t.invoiceId === row.rawInvoice.id ||
                                          t.invoice_id === row.rawInvoice.id) &&
                                        (t.status === "Success" ||
                                          t.status === "success") &&
                                        (t.type === "Discount" ||
                                          t.category === "Discount" ||
                                          t.description
                                            ?.toLowerCase()
                                            .includes("discount") ||
                                          t.description
                                            ?.toLowerCase()
                                            .includes("scholarship") ||
                                          Number(t.amount) < 0),
                                    );
                                  const lateFeeTransactions =
                                    transactions.filter(
                                      (t) =>
                                        (t.invoiceId === row.rawInvoice.id ||
                                          t.invoice_id === row.rawInvoice.id) &&
                                        (t.status === "Success" ||
                                          t.status === "success") &&
                                        (t.type === "Late Fee" ||
                                          t.description
                                            ?.toLowerCase()
                                            .includes("late fee") ||
                                          t.description
                                            ?.toLowerCase()
                                            .includes("penalty")) &&
                                        Number(t.amount) > 0,
                                    );

                                  if (
                                    payTransactions.length === 0 &&
                                    discountTransactions.length === 0 &&
                                    lateFeeTransactions.length === 0
                                  ) {
                                    return null;
                                  }

                                  return (
                                    <div className="mt-2 space-y-1 bg-slate-50/50 p-2.5 rounded border border-gray-100 max-w-xl">
                                      {payTransactions.map((txn, tIdx) => (
                                        <div
                                          key={txn.id || tIdx}
                                          className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap pl-2 border-l-2 border-emerald-500 py-0.5"
                                        >
                                          <span className="font-semibold text-emerald-700">
                                            Payment: ₹
                                            {Number(txn.amount).toLocaleString(
                                              "en-IN",
                                              {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              },
                                            )}
                                          </span>
                                          <span className="text-gray-300">
                                            •
                                          </span>
                                          <span>
                                            {formatLedgerDate(txn.date)}
                                          </span>
                                          {txn.paymentMethod && (
                                            <>
                                              <span className="text-gray-300">
                                                •
                                              </span>
                                              <span className="text-slate-500 font-medium">
                                                {txn.paymentMethod}
                                              </span>
                                            </>
                                          )}
                                          {txn.referenceId && (
                                            <>
                                              <span className="text-gray-300">
                                                •
                                              </span>
                                              <span className="font-mono text-[10px] text-gray-500 bg-gray-150 px-1 py-0.5 rounded">
                                                Ref: {txn.referenceId}
                                              </span>
                                            </>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              viewReceiptFromTxn(txn)
                                            }
                                            className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider text-teal-600 hover:text-teal-700 bg-white hover:bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded transition-colors ml-auto"
                                            title="Print PDF Receipt"
                                          >
                                            <Receipt className="h-2.5 w-2.5" />
                                            <span>Receipt</span>
                                          </button>
                                        </div>
                                      ))}
                                      {discountTransactions.map((txn, tIdx) => (
                                        <div
                                          key={txn.id || tIdx}
                                          className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap pl-2 border-l-2 border-amber-500 py-0.5"
                                        >
                                          <span className="font-semibold text-amber-700">
                                            Discount: -₹
                                            {Math.abs(
                                              Number(txn.amount),
                                            ).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </span>
                                          <span className="text-gray-300">
                                            •
                                          </span>
                                          <span>
                                            {formatLedgerDate(txn.date)}
                                          </span>
                                          {txn.description && (
                                            <>
                                              <span className="text-gray-300">
                                                •
                                              </span>
                                              <span className="italic text-gray-500">
                                                "{txn.description}"
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                      {lateFeeTransactions.map((txn, tIdx) => (
                                        <div
                                          key={txn.id || tIdx}
                                          className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap pl-2 border-l-2 border-red-500 py-0.5"
                                        >
                                          <span className="font-semibold text-red-700">
                                            Late Fee: +₹
                                            {Math.abs(
                                              Number(txn.amount),
                                            ).toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </span>
                                          <span className="text-gray-300">
                                            •
                                          </span>
                                          <span>
                                            {formatLedgerDate(txn.date)}
                                          </span>
                                          {txn.description && (
                                            <>
                                              <span className="text-gray-300">
                                                •
                                              </span>
                                              <span className="italic text-gray-500">
                                                "{txn.description}"
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-800">
                                    {row.particulars}
                                  </span>
                                  {row.cr !== null && (
                                    <span className="text-teal-600 font-bold text-xs bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">
                                      +₹
                                      {row.cr.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  )}
                                  {row.rawTxn && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        viewReceiptFromTxn(row.rawTxn)
                                      }
                                      className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-100 transition-colors ml-1"
                                      title="Print PDF Receipt"
                                    >
                                      <Receipt className="h-3 w-3" />
                                      <span>Receipt</span>
                                    </button>
                                  )}
                                </div>
                                {row.rawTxn && (
                                  <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                                    <span>
                                      Transaction Date:{" "}
                                      {formatLedgerDate(row.date)}
                                    </span>
                                    {row.rawTxn.paymentMethod && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span>
                                          Method: {row.rawTxn.paymentMethod}
                                        </span>
                                      </>
                                    )}
                                    {row.rawTxn.referenceId && (
                                      <>
                                        <span className="text-gray-300">|</span>
                                        <span className="font-mono">
                                          Ref: {row.rawTxn.referenceId}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Overdue / Pending column with Inline Edit Support */}
                          <td className="py-4 px-4 text-right tabular-nums">
                            {isEditingThisInvoice ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <Input
                                  type="number"
                                  value={editInvoiceAmount}
                                  onChange={(e) =>
                                    setEditInvoiceAmount(e.target.value)
                                  }
                                  className="h-7 w-24 text-xs px-2 text-right tabular-nums rounded-sm border-gray-300 bg-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")
                                      handleSaveInvoiceEdit();
                                    if (e.key === "Escape")
                                      setEditingInvoiceId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                  onClick={handleSaveInvoiceEdit}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  className="p-1 text-red-650 hover:text-red-700 hover:bg-red-50 rounded"
                                  onClick={() => setEditingInvoiceId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : row.dr !== null ? (
                              <div className="flex items-center justify-end gap-1.5 group">
                                <span className="text-red-600 font-semibold">
                                  ₹
                                  {row.dr.toLocaleString("en-IN", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                {isInvoice &&
                                  row.rawInvoice.computedStatus !== "Paid" && (
                                    <button
                                      type="button"
                                      className="text-gray-400 hover:text-teal-600 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                      onClick={() => {
                                        setEditingInvoiceId(row.rawInvoice.id);
                                        setEditInvoiceAmount(
                                          row.rawInvoice.totalAmount.toString(),
                                        );
                                      }}
                                      title="Edit original amount"
                                    >
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                  )}
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Document Vault */}
        <TabsContent
          value="documents"
          className="space-y-6 mt-0 animate-in fade-in zoom-in-95 duration-300"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-primary" /> Document
                Repository
              </h2>
              <p className="text-xs text-muted-foreground">
                Securely manage student records, certificates, and ID proofs
              </p>
            </div>
            <div className="flex bg-muted/20 p-1 rounded-lg border border-muted/10">
              {["All", "Academic", "Legal", "ID Proof"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveDocCategory(cat as any)}
                  className={`text-[10px] px-3 py-1.5 rounded-md uppercase font-black tracking-widest transition-all ${activeDocCategory === cat || (cat === "All" && !activeDocCategory) ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Upload Zone */}
            <div className="md:col-span-1">
              <div className="sticky top-6 space-y-4">
                <div
                  className="border-2 border-dashed border-primary/20 hover:border-primary/50 bg-primary/5 rounded-3xl p-8 transition-all group flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden"
                  onClick={() =>
                    document.getElementById("file-upload-input")?.click()
                  }
                >
                  <input
                    type="file"
                    id="file-upload-input"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-[0_0_20px_rgba(var(--primary),0.1)]">
                    <Upload className="h-8 w-8" />
                  </div>
                  <p className="font-bold text-sm mb-1 text-foreground">
                    {uploading ? "Processing..." : "Drop File Here"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">
                    Max Size: 5MB
                  </p>

                  {uploading && (
                    <div className="absolute inset-0 bg-card/80 flex flex-col items-center justify-center p-4">
                      <div className="w-full bg-muted rounded-full h-1 mb-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          className="h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                        />
                      </div>
                      <span className="text-[10px] font-black text-primary animate-pulse tracking-widest">
                        SECURE_SYNC...
                      </span>
                    </div>
                  )}
                </div>

                <Card className="bg-muted/50 border-border overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                      <span>Storage Used</span>
                      <span className="text-foreground">
                        {(documents.length * 0.4).toFixed(1)} / 50 MB
                      </span>
                    </div>
                    <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, documents.length * 2)}%`,
                        }}
                        className="bg-cyan-500 h-1.5 rounded-full"
                      />
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center gap-2 text-emerald-600 mb-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                          256-bit Encryption Verified
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                        System state: HEALTHY. Files are encrypted via AES-256
                        before cloud commit.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Document Grid */}
            <div className="md:col-span-3">
              {documents.length === 0 ? (
                <div className="h-[400px] border border-dashed border-muted/30 rounded-3xl flex flex-col items-center justify-center text-muted-foreground opacity-50 bg-muted/5 group hover:border-primary/20 transition-colors">
                  <div className="p-4 rounded-full bg-muted/10 mb-4 group-hover:scale-110 transition-transform">
                    <File className="h-12 w-12" />
                  </div>
                  <p className="text-xs font-mono tracking-[0.3em] uppercase">
                    DRIVE_IS_EMPTY
                  </p>
                  <p className="text-[10px] mt-2 italic font-serif">
                    Awaiting student record uploads...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {documents
                      .filter((doc) => doc.name !== ".emptyFolderPlaceholder")
                      .filter((doc) => {
                        if (activeDocCategory === "All") return true;
                        return doc.name.startsWith(activeDocCategory);
                      })
                      .map((doc, idx) => {
                        const isPDF = doc.name.toLowerCase().endsWith(".pdf");
                        const isImage = /\.(jpg|jpeg|png|webp)$/i.test(
                          doc.name,
                        );
                        const category = doc.name.split("_")[0] || "Unsorted";
                        const originalName =
                          doc.name.split("_").slice(2).join("_") || doc.name;

                        return (
                          <motion.div
                            key={doc.id || idx}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="group relative bg-secondary/30 border border-muted/10 hover:border-primary/40 rounded-2xl p-4 transition-all hover:bg-muted/80"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div
                                className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all group-hover:-translate-y-1 group-hover:rotate-3 shadow-lg ${isPDF ? "bg-red-500/10 text-red-500 border border-red-500/20" : isImage ? "bg-cyan-500/10 text-cyan-500 border border-cyan-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}
                              >
                                {isPDF ? (
                                  <FileText className="h-5 w-5" />
                                ) : isImage ? (
                                  <Smartphone className="h-5 w-5" />
                                ) : (
                                  <File className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-primary/20 hover:text-primary transition-all"
                                  onClick={() =>
                                    setViewingDoc({
                                      name: originalName,
                                      url: doc.url || "",
                                      type: isPDF ? "application/pdf" : "image",
                                    })
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-muted hover:text-foreground"
                                  onClick={() =>
                                    doc.url &&
                                    handleDownloadDocument(
                                      doc.url,
                                      originalName,
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDeleteDocument(doc.name)}
                                  disabled={deletingDocument === doc.name}
                                >
                                  {deletingDocument === doc.name ? (
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent animate-spin rounded-full" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-bold text-[11px] truncate pr-2 text-foreground group-hover:text-primary transition-colors">
                                {originalName}
                              </h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-mono opacity-60">
                                  {(doc.metadata?.size / 1024).toFixed(1) || 0}{" "}
                                  KB
                                </span>
                                <div className="h-1 w-1 rounded-full bg-muted opacity-40"></div>
                                <span
                                  className={`text-[9px] uppercase font-black tracking-tighter opacity-70 ${category === "Academic" ? "text-blue-400" : category === "Legal" ? "text-purple-400" : "text-emerald-600"}`}
                                >
                                  {category}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-muted/10 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                <span className="text-[9px] font-black uppercase text-emerald-600/80 tracking-widest">
                                  Verified
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-muted-foreground opacity-30 uppercase tracking-tighter">
                                {doc.created_at
                                  ? new Date(
                                      doc.created_at,
                                    ).toLocaleDateString()
                                  : "RECENT"}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ID Card Generator Modal/Preview */}
      {showIDCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-primary/20 overflow-hidden relative animate-in zoom-in-95 duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setShowIDCard(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="bg-primary/95 p-6 text-foreground flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 h-full w-32 bg-white/5 skew-x-[-20deg] translate-x-12"></div>
              <div className="relative z-10">
                <h2 className="text-xl font-black italic tracking-tighter uppercase">
                  TRIYUGA CLASSES
                </h2>
                <p className="text-[10px] opacity-80 uppercase tracking-widest">
                  Achieving Excellence Together
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-border text-foreground relative z-10"
              >
                2024-25
              </Badge>
            </div>

            <div className="p-8 flex flex-col items-center">
              <div className="h-32 w-32 rounded-xl bg-muted flex items-center justify-center mb-6 border-4 border-background shadow-lg overflow-hidden relative">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="h-16 w-16 text-muted-foreground" />
                )}
                <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-[8px] text-foreground py-1 flex items-center justify-center uppercase font-bold tracking-tighter">
                  PHOTO ID
                </div>
              </div>

              <div className="text-center space-y-1 mb-8">
                <h3 className="text-2xl font-bold uppercase tracking-tight">
                  {student.name}
                </h3>
                <p className="text-sm font-semibold text-primary uppercase tracking-widest border-y border-primary/20 py-1">
                  {student.grade}
                </p>
              </div>

              <div className="w-full space-y-4 text-sm mb-8">
                <div className="flex justify-between border-b border-muted py-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold">
                    Student ID
                  </span>
                  <span className="font-mono text-xs">
                    {student.student_id || student.id.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-muted py-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold">
                    Contact
                  </span>
                  <span className="font-mono text-xs">
                    +91 {student.contact}
                  </span>
                </div>
                <div className="flex justify-between border-b border-muted py-1">
                  <span className="text-muted-foreground text-xs uppercase font-bold">
                    Valid Up To
                  </span>
                  <span className="font-mono text-xs">MAR-2025</span>
                </div>
              </div>

              <div className="w-full flex justify-between items-end">
                <div className="space-y-1">
                  <div className="bg-white p-1 rounded-sm shadow-sm">
                    <QRCodeSVG
                      value={`ATTENDANCE_SCAN:${id || student.id}`}
                      size={64}
                      level="H"
                      className="rounded-sm"
                    />
                  </div>
                  <p className="text-[8px] text-muted-foreground font-mono">
                    SCAN TO VERIFY
                  </p>
                </div>
                <div className="text-right">
                  <div className="h-8 w-24 border-b border-muted mx-auto mb-1"></div>
                  <p className="text-[8px] text-muted-foreground uppercase font-bold">
                    Admin Signature
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/20 border-t flex gap-2">
              <Button className="flex-1" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" /> Print ID Card
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Session Detail Dialog */}
      <Dialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Session Breakdown</span>
              <Badge
                variant={
                  selectedDay?.status === "Present"
                    ? "success"
                    : selectedDay?.status === "Absent"
                      ? "destructive"
                      : "warning"
                }
              >
                {selectedDay?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detailed period-wise attendance for {selectedDay?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {selectedDay?.sessions?.map((session, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-md ${session.status === "Present" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{session.subject}</p>
                    <p className="text-[10px] text-primary/70 font-mono tracking-tighter bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 inline-block mt-1 uppercase">
                      {session.time}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    session.status === "Present" ? "success" : "destructive"
                  }
                  className="text-[9px] h-5 py-0"
                >
                  {session.status}
                </Badge>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Automatic Payment Receipt */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-md bg-background border-border p-0 overflow-hidden shadow-2xl">
          <div className="relative p-6 pt-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
            <div className="absolute -top-12 -right-12 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-primary/10 rounded-full blur-3xl" />

            <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 border-4 border-background shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <h2 className="text-2xl font-black text-foreground tracking-tight mb-1">
              Receipt Generated
            </h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-muted-foreground mb-6">
              Payment Successful • Verified
            </p>

            <div className="bg-muted/30 border border-muted/20 rounded-2xl p-5 text-left space-y-4 text-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-0.5">
                    Transaction ID
                  </p>
                  <p className="text-xs font-mono font-bold">
                    {receiptData?.transaction_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-0.5">
                    Date
                  </p>
                  <p className="text-[10px] font-bold">{receiptData?.date}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-muted/30 space-y-2">
                <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground font-sans">
                  Invoice Details
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold">
                    {receiptData?.installment_title}
                  </span>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-500/5 px-2 py-1 rounded">
                    ₹{receiptData?.paid_amount?.toLocaleString() || 0}
                  </span>
                </div>
                {receiptData?.discount_amount ||
                receiptData?.total_discount ||
                receiptData?.discountAmount ? (
                  <div className="flex justify-between items-center text-[11px] text-emerald-600 font-semibold bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10">
                    <span className="font-sans">Scholarship / Discount:</span>
                    <span className="font-mono font-bold">
                      -₹
                      {Math.abs(
                        Number(
                          receiptData?.discount_amount ||
                            receiptData?.total_discount ||
                            receiptData?.discountAmount,
                        ),
                      ).toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-between items-center py-2 border-y border-muted/30">
                <div>
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-0.5">
                    Method
                  </p>
                  <p className="text-[10px] font-bold">
                    {receiptData?.payment_method}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-0.5 font-sans">
                    Ref ID
                  </p>
                  <p className="text-[9px] font-mono italic">
                    {receiptData?.reference_id}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex justify-between items-end">
                <div>
                  <div
                    className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded inline-block ${receiptData?.new_status === "Paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-yellow-500/10 text-yellow-600"}`}
                  >
                    Final Status: {receiptData?.new_status}
                  </div>
                </div>
                {receiptData?.amount_due > 0 && (
                  <div className="text-right">
                    <p className="text-[9px] uppercase font-black tracking-widest text-red-500/60 mb-0.5">
                      Remaining Due
                    </p>
                    <p className="text-xs font-black text-red-500 font-mono">
                      ₹{receiptData?.amount_due?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 h-12 rounded-xl bg-foreground text-background font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-transform"
              >
                Close Receipt
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="h-12 w-12 rounded-xl border-muted/20 text-muted-foreground hover:bg-muted/10"
              >
                <Printer className="h-4 w-4 text-foreground" />
              </Button>
            </div>

            <p className="mt-6 text-[8px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-40 italic">
              Powered by Triyuga Ledger Systems • Digital Authentic Signature
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Slide-out Drawer */}
      <AnimatePresence>
        {isPaymentDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-primary/20 z-[41] shadow-2xl flex flex-col pt-6"
            >
              <div className="px-6 flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-xl font-black text-foreground italic tracking-tighter uppercase">
                    Collect Payment
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
                    Fee Management Hub
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPaymentDrawerOpen(false)}
                  className="rounded-full hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-10">
                {/* Quick Select Student Info */}
                <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {student.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-mono">
                      {student.id} • {student.grade}
                    </p>
                  </div>
                </div>

                {/* Payment Form Shell */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Select Invoice
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {computedInvoices
                        .filter((i) => i.computedStatus !== "Paid")
                        .map((inv) => (
                          <button
                            key={inv.id}
                            onClick={() => {
                              setSelectedInvoiceId(inv.id);
                              setPaymentAmount(inv.amountDue.toString());
                            }}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all text-left ${selectedInvoiceId === inv.id ? "border-primary/50 bg-primary/10" : "border-muted/20 bg-muted/10 flex-col hover:border-primary/30"}`}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span className="truncate pr-2">{inv.title}</span>
                              <span
                                className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${inv.computedStatus === "Overdue" ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}
                              >
                                {inv.computedStatus}
                              </span>
                            </div>
                            <div className="text-primary mt-1">
                              ₹{inv.amountDue.toLocaleString()}
                            </div>
                          </button>
                        ))}
                      {computedInvoices.filter(
                        (i) => i.computedStatus !== "Paid",
                      ).length === 0 && (
                        <div className="col-span-2 text-center py-4 text-xs font-mono text-muted-foreground">
                          No pending invoices.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Amount to Collect
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                          <Input
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            type="number"
                            className="pl-10 h-10 bg-muted border-border text-lg font-black italic"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Collected Date (For Backdate){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={collectedDate}
                            onChange={(e) => setCollectedDate(e.target.value)}
                            className="h-10 bg-muted border-border font-black"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Add Late Fee / Discount
                      </label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={adjustmentAmount}
                          onChange={(e) => setAdjustmentAmount(e.target.value)}
                          className="pl-10 h-10 bg-muted border-border text-sm font-black italic"
                          placeholder="+/- 0"
                        />
                      </div>
                      <p className="text-[8px] text-muted-foreground italic">
                        Use '-' for scholarship/discount.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          {
                            icon: <Smartphone className="h-4 w-4" />,
                            label: "UPI" as const,
                          },
                          {
                            icon: <CreditCard className="h-4 w-4" />,
                            label: "Card" as const,
                          },
                          {
                            icon: <IndianRupee className="h-4 w-4" />,
                            label: "Cash" as const,
                          },
                          {
                            icon: <FileText className="h-4 w-4" />,
                            label: "Cheque" as const,
                          },
                        ].map((m) => (
                          <button
                            key={m.label}
                            type="button"
                            onClick={() => setPaymentMethod(m.label)}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all group outline-none ${paymentMethod === m.label ? "border-primary/50 bg-primary/10" : "border-muted/20 bg-muted/5 hover:bg-primary/5 hover:border-primary/40"}`}
                          >
                            <div
                              className={`${paymentMethod === m.label ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors"}`}
                            >
                              {m.icon}
                            </div>
                            <span
                              className={`text-[9px] font-black uppercase tracking-tighter ${paymentMethod === m.label ? "text-primary" : "group-hover:text-primary"}`}
                            >
                              {m.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Reference ID / Txn Hash{" "}
                        {paymentMethod !== "Cash" && (
                          <span className="text-red-500">*</span>
                        )}
                      </label>
                      <Input
                        value={paymentRefId}
                        onChange={(e) => setPaymentRefId(e.target.value)}
                        className="h-10 bg-card border-muted/40 text-xs font-mono placeholder:text-muted-foreground/30 focus-visible:ring-primary/20"
                        placeholder="e.g. UPI-REF-909281 / CHQ-00129"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={async () => {
                        if (!collectedDate) {
                          alert("Collected Date is required.");
                          return;
                        }
                        if (
                          !selectedInvoiceId ||
                          !paymentAmount ||
                          isNaN(Number(paymentAmount)) ||
                          Number(paymentAmount) <= 0
                        )
                          return;
                        if (
                          !paymentRefId &&
                          (paymentMethod === "UPI" ||
                            paymentMethod === "Cheque" ||
                            paymentMethod === "Card")
                        ) {
                          alert(
                            "Reference ID is required for digital/cheque payments.",
                          );
                          return;
                        }

                        setIsPaymentConfirmDialogOpen(true);
                      }}
                      disabled={
                        !selectedInvoiceId ||
                        !paymentAmount ||
                        isProcessingPayment ||
                        (paymentMethod !== "Cash" && !paymentRefId.trim())
                      }
                      className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.2)] mt-8"
                    >
                      {isProcessingPayment
                        ? "Processing..."
                        : "Confirm Payment"}
                    </Button>
                  </div>
                </div>

                {/* Payment processing is handled by the main Confirm Payment button above */}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between text-foreground">
            <div>
              <DialogTitle className="text-sm uppercase tracking-[0.2em] font-black">
                {viewingDoc?.name}
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground uppercase font-bold">
                SECURE_VIEWER_V2.0
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-card relative">
            {viewingDoc?.type === "application/pdf" ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={`${viewingDoc.url}#toolbar=1&view=FitH`}
                  className="w-full flex-1 border-none bg-muted/10"
                  title={viewingDoc.name}
                >
                  <p className="p-10 text-center">
                    Your browser does not support iframes.{" "}
                    <a
                      href={viewingDoc.url}
                      target="_blank"
                      className="text-primary underline"
                    >
                      Click here to view PDF
                    </a>
                  </p>
                </iframe>
                <div className="p-2 text-center text-[9px] text-muted-foreground bg-muted/20 flex justify-center items-center gap-4">
                  <span>PDF Viewer acting up?</span>
                  <button
                    onClick={() =>
                      viewingDoc?.url && window.open(viewingDoc.url, "_blank")
                    }
                    className="underline hover:text-primary transition-colors flex items-center font-bold"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Open in New Tab
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-4">
                <img
                  src={viewingDoc?.url}
                  alt={viewingDoc?.name}
                  className="max-h-full max-w-full object-contain shadow-2xl rounded-lg"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Overlay for aesthetic */}
            <div className="absolute inset-0 pointer-events-none border-[20px] border-black/5"></div>
          </div>
          <div className="p-3 border-t border-border flex justify-end gap-2 bg-background">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                viewingDoc?.url &&
                handleDownloadDocument(viewingDoc.url, viewingDoc.name)
              }
              className="text-[10px] uppercase font-black tracking-widest h-8"
            >
              <Download className="mr-2 h-3 w-3" /> Download
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setViewingDoc(null)}
              className="text-[10px] uppercase font-black tracking-widest h-8"
            >
              Close Viewer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Category Selection Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden bg-background border-border">
          <DialogHeader className="p-6 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-sm uppercase tracking-[0.2em] font-black">
                  Upload Document
                </DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground uppercase font-bold">
                  Select Category for {pendingUploadFile?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {["Academic", "Legal", "ID Proof"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setUploadCategory(cat as any)}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all group ${
                    uploadCategory === cat
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        uploadCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs font-black uppercase tracking-widest ${
                        uploadCategory === cat
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {cat}
                    </span>
                  </div>
                  {uploadCategory === cat && (
                    <CheckCircle2 className="h-5 w-5 text-primary animate-in zoom-in" />
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-dashed border-border text-center">
              Categorizing documents ensures they appear in the correct tabs and
              are easily searchable.
            </p>
          </div>

          <div className="p-6 border-t border-border flex gap-3 bg-muted/10">
            <Button
              variant="outline"
              className="flex-1 uppercase font-black tracking-widest text-[10px] h-11"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setPendingUploadFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 uppercase font-black tracking-widest text-[10px] h-11 shadow-lg shadow-primary/20"
              onClick={confirmUpload}
            >
              Start Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Dialog */}
      <Dialog
        open={isPaymentConfirmDialogOpen}
        onOpenChange={setIsPaymentConfirmDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Confirm Payment
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Please verify all payment details before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium text-sm">
                Amount
              </span>
              <span className="font-bold text-lg">₹{paymentAmount}</span>
            </div>
            {adjustmentAmount && Number(adjustmentAmount) !== 0 && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium text-sm">
                  {Number(adjustmentAmount) > 0 ? "Late Fee" : "Discount"}
                </span>
                <span className="font-bold text-lg">
                  ₹{Math.abs(Number(adjustmentAmount))}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground font-medium text-sm">
                Method
              </span>
              <span className="font-bold text-sm">{paymentMethod}</span>
            </div>
            {paymentRefId && paymentMethod !== "Cash" && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground font-medium text-sm">
                  Ref ID
                </span>
                <span className="font-mono text-sm max-w-[150px] truncate">
                  {paymentRefId}
                </span>
              </div>
            )}
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground font-medium text-sm">
                Date
              </span>
              <span className="font-bold text-sm">
                {collectedDate || new Date().toISOString().split("T")[0]}
              </span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPaymentConfirmDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={processSecurePayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? "Processing..." : "Confirm & Pay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Fee Dialog */}
      <Dialog open={isCustomFeeDialogOpen} onOpenChange={setIsCustomFeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Fee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fee Title</label>
              <Input
                placeholder="e.g. Transport, Uniform, Library Late Fee..."
                value={customFeeTitle}
                onChange={(e) => setCustomFeeTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (₹)</label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={customFeeAmount}
                onChange={(e) => setCustomFeeAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={customFeeDueDate}
                onChange={(e) => setCustomFeeDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCustomFeeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCustomFee}
              disabled={isAddingCustomFee || !customFeeTitle || !customFeeAmount}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isAddingCustomFee ? "Adding..." : "Add Fee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
