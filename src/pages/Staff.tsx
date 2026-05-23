import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, UserPlus, QrCode, PlusCircle, CheckCircle, ShieldAlert, X, User, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "../components/ui/dialog";
import { supabase } from "../lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";

interface Designation {
  id: string;
  name: string;
  description: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  designations: string[];
  profile_picture?: string | null;
}

export function Staff() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Dialogs
  const [isNewStaffOpen, setIsNewStaffOpen] = useState(false);
  const [isDesignationOpen, setIsDesignationOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isQrViewOpen, setIsQrViewOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Forms
  const [newDesignationName, setNewDesignationName] = useState("");
  const [newDesignationDesc, setNewDesignationDesc] = useState("");
  
  const [staffForm, setStaffForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    status: "Active",
    designationIds: [] as string[],
    dateOfBirth: "",
    permanentAddress: "",
    currentAddress: "",
    governmentId: "",
    educationQualifications: "",
    employmentHistory: "",
    referenceContacts: "",
    backgroundScreening: "",
    bankAccountDetails: "",
    taxDeclarations: "",
    pensionAccounts: "",
    emergencyContact: "",
    signedContract: false,
    equipmentRequirements: "",
    expectedArrivalTime: "09:00",
    profilePicture: ""
  });

  // Scanner Simulator
  const [scanInput, setScanInput] = useState("");
  const [scanMessage, setScanMessage] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    
    // Fallback Mock System if DB fails
    let ds: Designation[] = [];
    let ss: StaffMember[] = [];
    
    try {
      const [{ data: dData }, { data: sData }, { data: sdData }] = await Promise.all([
        supabase.from('designations').select('*'),
        supabase.from('staffs').select('*'),
        supabase.from('staff_designations').select('*')
      ]);

      if (dData) ds = dData as Designation[];
      
      if (sData) {
        ss = sData.map(s => {
          const theirD = sdData?.filter(sd => sd.staff_id === s.id).map(sd => sd.designation_id) || [];
          const labels = theirD.map(id => ds.find(d => d.id === id)?.name || "Unknown").filter(Boolean);
          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            email: s.email,
            phone: s.phone,
            status: s.status,
            designations: labels,
            profile_picture: s.profile_picture
          };
        });
      }
    } catch (e) {
      console.warn("Using minimal fallback", e);
    }

    setDesignations(ds);
    setStaffList(ss);
    setLoading(false);
  };

  const handleCreateDesignation = async () => {
    if (!newDesignationName) return;
    
    const { error } = await supabase.from('designations').insert([{
      name: newDesignationName,
      description: newDesignationDesc
    }]);

    if (!error) {
      setNewDesignationName("");
      setNewDesignationDesc("");
      setIsDesignationOpen(false);
      loadData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const handleCreateStaff = async () => {
    if (!staffForm.firstName || !staffForm.lastName) return;

    const { data: insertedStaff, error } = await supabase.from('staffs').insert([{
      first_name: staffForm.firstName,
      last_name: staffForm.lastName,
      email: staffForm.email,
      phone: staffForm.phone,
      status: staffForm.status,
      date_of_birth: staffForm.dateOfBirth || null,
      permanent_address: staffForm.permanentAddress,
      current_address: staffForm.currentAddress,
      government_id: staffForm.governmentId,
      education_qualifications: staffForm.educationQualifications,
      employment_history: staffForm.employmentHistory,
      reference_contacts: staffForm.referenceContacts,
      background_screening: staffForm.backgroundScreening,
      bank_account_details: staffForm.bankAccountDetails,
      tax_declarations: staffForm.taxDeclarations,
      pension_accounts: staffForm.pensionAccounts,
      emergency_contact: staffForm.emergencyContact,
      signed_contract: staffForm.signedContract,
      equipment_requirements: staffForm.equipmentRequirements,
      expected_arrival_time: staffForm.expectedArrivalTime,
      profile_picture: staffForm.profilePicture || null
    }]).select('id').single();

    if (!error && insertedStaff && staffForm.designationIds.length > 0) {
      const joins = staffForm.designationIds.map(dId => ({
        staff_id: insertedStaff.id,
        designation_id: dId
      }));
      await supabase.from('staff_designations').insert(joins);
    }

    if (!error) {
      setIsNewStaffOpen(false);
      setStaffForm({ 
        firstName: "", lastName: "", email: "", phone: "", status: "Active", designationIds: [],
        dateOfBirth: "", permanentAddress: "", currentAddress: "", governmentId: "", educationQualifications: "",
        employmentHistory: "", referenceContacts: "", backgroundScreening: "", bankAccountDetails: "",
        taxDeclarations: "", pensionAccounts: "", emergencyContact: "", signedContract: false, equipmentRequirements: "",
        expectedArrivalTime: "09:00", profilePicture: ""
      });
      loadData();
    } else {
      alert("Error generating staff: " + error?.message);
    }
  };

  const handleDeleteStaff = async (e: React.MouseEvent, sId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this staff member? This will clear them from any assigned batches database-wide.")) return;
    
    try {
      const { error } = await supabase.from('staffs').delete().eq('id', sId);
      if (error) {
        console.error("Error deleting staff:", error);
        alert("Failed to delete staff member: " + error.message);
      } else {
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert("An error occurred while deleting staff.");
    }
  };

  const toggleDesignationSelection = (id: string) => {
    setStaffForm(prev => {
      const idx = prev.designationIds.indexOf(id);
      if (idx > -1) {
        return { ...prev, designationIds: prev.designationIds.filter(x => x !== id) };
      } else {
        return { ...prev, designationIds: [...prev.designationIds, id] };
      }
    });
  };

  const handleScanFocus = () => {
    if (scanInputRef.current) scanInputRef.current.focus();
  };

  const handleMarkAttendance = async (e: any) => {
    e.preventDefault();
    if (!scanInput) return;

    const sId = scanInput.trim().toUpperCase();
    
    // Check if staff exists
    const validStaff = staffList.find(s => s.id === sId);
    if (!validStaff) {
       setScanMessage({ msg: "Invalid ID: Staff not found.", type: 'error' });
       setScanInput("");
       return;
    }

    try {
      // Calculate if late
      let finalStatus = "Present";
      
      const staffMember = await supabase.from('staffs').select('expected_arrival_time').eq('id', sId).single();
      if (staffMember.data?.expected_arrival_time) {
        const expectedTimeStr = staffMember.data.expected_arrival_time; // HH:mm:ss
        const [expH, expM] = expectedTimeStr.split(':').map(Number);
        
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const limitMinutes = expH * 60 + expM + 20; // 20 minute grace period
        
        if (currentMinutes > limitMinutes) {
          finalStatus = "Late";
        }
      }

      const { error } = await supabase.from('staff_attendance').insert([{
        staff_id: sId,
        status: finalStatus,
        date: new Date().toLocaleDateString('en-CA'),
      }]);

      if (error) {
        setScanMessage({ msg: "Attendance already logged today, or error.", type: 'error' });
      } else {
        setScanMessage({ msg: `SUCCESS! Logged ${finalStatus} for ${validStaff.first_name} ${validStaff.last_name}`, type: 'success' });
      }
    } catch (e) {
      setScanMessage({ msg: "System Error.", type: 'error' });
    }
    
    setScanInput("");
    // Re-focus scanner
    setTimeout(() => {
      handleScanFocus();
    }, 100);
  };

  const filteredStaff = staffList.filter(s => 
    (s.first_name + " " + s.last_name).toLowerCase().includes(search.toLowerCase()) || 
    s.designations.some(d => d.toLowerCase().includes(search.toLowerCase())) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight">Staff Management</h2>
           <p className="text-sm text-muted-foreground mt-1">Manage personnel, custom designations, and biometrics.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Attendance Scanner Dialog */}
          <Dialog open={isAttendanceOpen} onOpenChange={(open) => {
             setIsAttendanceOpen(open);
             if(open) { setTimeout(() => handleScanFocus(), 100); setScanMessage(null); }
          }}>
            <DialogTrigger asChild>
              <Button variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <QrCode className="mr-2 h-4 w-4" /> ID Scanner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-zinc-950 text-white border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-center font-mono">STAFF ATTENDANCE SCANNER</DialogTitle>
                <DialogDescription className="text-center text-zinc-400">
                  Ensure laser alignment with QR code.
                </DialogDescription>
              </DialogHeader>
              <div className="py-8 flex flex-col items-center justify-center space-y-6">
                
                {/* Virtual Scanner Target View */}
                <div 
                  className="relative w-48 h-48 border-2 border-emerald-500/30 rounded-xl flex items-center justify-center bg-emerald-500/5 overflow-hidden group cursor-pointer"
                  onClick={handleScanFocus}
                >
                  <div className="absolute inset-0 bg-emerald-500/10 animate-pulse opacity-50" />
                  {/* Scan Laser */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_2px_rgba(52,211,153,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
                  <QrCode className="h-16 w-16 text-emerald-500/40" />
                  
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-500" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-500" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-500" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-500" />
                </div>

                <form onSubmit={handleMarkAttendance} className="w-full relative">
                  <Input 
                    ref={scanInputRef}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan EMP ID..."
                    className="bg-zinc-900 border-zinc-700 text-center font-mono text-zinc-300 placeholder:text-zinc-600 focus-visible:ring-emerald-500"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1.5 opacity-50 text-[10px] uppercase font-bold text-emerald-400">Ready</div>
                </form>

                {scanMessage && (
                  <div className={`text-sm p-3 rounded flex items-center gap-2 w-full font-medium ${scanMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {scanMessage.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    {scanMessage.msg}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* New Designation Dialog */}
          <Dialog open={isDesignationOpen} onOpenChange={setIsDesignationOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10">
                <PlusCircle className="mr-2 h-4 w-4" /> Manage Designations
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Custom Designations</DialogTitle>
                <DialogDescription>Define multi-assignable roles for complex team hierarchies.</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</label>
                  <Input value={newDesignationName} onChange={e => setNewDesignationName(e.target.value)} placeholder="e.g. Senior Faculty, Operations Lead" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</label>
                  <Input value={newDesignationDesc} onChange={e => setNewDesignationDesc(e.target.value)} placeholder="Role clearance outline" />
                </div>
                <Button className="w-full mt-2 bg-foreground text-background" onClick={handleCreateDesignation}>Create Designation Rule</Button>

                <div className="mt-8">
                  <h4 className="text-xs font-bold uppercase mb-3">Live Roster Designations</h4>
                  <div className="flex flex-wrap gap-2">
                     {designations.length === 0 ? <p className="text-xs italic opacity-50">No designations defined.</p> : designations.map(d => (
                       <Badge key={d.id} variant="secondary" className="px-3 py-1 font-medium">{d.name}</Badge>
                     ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* New Staff Dialog */}
          <Dialog open={isNewStaffOpen} onOpenChange={setIsNewStaffOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" /> Recruit Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Enroll Personnel</DialogTitle>
                <DialogDescription>Complete comprehensive personnel onboarding forms.</DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="personal" className="w-full mt-2">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                  <TabsTrigger value="professional" className="text-xs">Professional</TabsTrigger>
                  <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
                  <TabsTrigger value="setup" className="text-xs">Setup</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4 pt-4 outline-none">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground w-full text-center">Profile Photo</label>
                       <div className="w-24 h-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 relative group">
                         {staffForm.profilePicture ? (
                            <img src={staffForm.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                         ) : (
                            <div className="flex pl-4 pr-4 flex-col items-center justify-center text-muted-foreground">
                               <PlusCircle className="h-6 w-6 opacity-30" />
                            </div>
                         )}
                         <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => setStaffForm({...staffForm, profilePicture: reader.result as string});
                                 reader.readAsDataURL(file);
                               }
                            }}
                         />
                       </div>
                    </div>
                    <div className="flex-grow space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Name*</label>
                          <Input value={staffForm.firstName} onChange={e => setStaffForm({...staffForm, firstName: e.target.value})} placeholder="Jane" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Name*</label>
                          <Input value={staffForm.lastName} onChange={e => setStaffForm({...staffForm, lastName: e.target.value})} placeholder="Doe" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</label>
                          <Input value={staffForm.email} onChange={e => setStaffForm({...staffForm, email: e.target.value})} placeholder="jane@org.com" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                          <Input value={staffForm.phone} onChange={e => setStaffForm({...staffForm, phone: e.target.value})} placeholder="+91..." />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</label>
                      <Input type="date" value={staffForm.dateOfBirth} onChange={e => setStaffForm({...staffForm, dateOfBirth: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Govt/National ID</label>
                      <Input value={staffForm.governmentId} onChange={e => setStaffForm({...staffForm, governmentId: e.target.value})} placeholder="PAN / Aadhaar / Passport Num" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Address</label>
                    <Input value={staffForm.currentAddress} onChange={e => setStaffForm({...staffForm, currentAddress: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Permanent Address</label>
                    <Input value={staffForm.permanentAddress} onChange={e => setStaffForm({...staffForm, permanentAddress: e.target.value})} />
                  </div>
                </TabsContent>

                <TabsContent value="professional" className="space-y-4 pt-4 outline-none">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Educational Qualifications</label>
                    <Input value={staffForm.educationQualifications} onChange={e => setStaffForm({...staffForm, educationQualifications: e.target.value})} placeholder="Highest degrees, certifications..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employment History</label>
                    <Input value={staffForm.employmentHistory} onChange={e => setStaffForm({...staffForm, employmentHistory: e.target.value})} placeholder="Previous organizations and roles..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reference Contacts</label>
                    <Input value={staffForm.referenceContacts} onChange={e => setStaffForm({...staffForm, referenceContacts: e.target.value})} placeholder="Names and phone numbers of references..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Background Screening</label>
                    <Input value={staffForm.backgroundScreening} onChange={e => setStaffForm({...staffForm, backgroundScreening: e.target.value})} placeholder="Notes on BGV status or police verification..." />
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4 pt-4 outline-none">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bank Account Information</label>
                    <Input value={staffForm.bankAccountDetails} onChange={e => setStaffForm({...staffForm, bankAccountDetails: e.target.value})} placeholder="Bank Name, Account Num, IFSC/Routing Code" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tax Declarations</label>
                      <Input value={staffForm.taxDeclarations} onChange={e => setStaffForm({...staffForm, taxDeclarations: e.target.value})} placeholder="Tax regime, exemptions..." />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pension / Provident</label>
                      <Input value={staffForm.pensionAccounts} onChange={e => setStaffForm({...staffForm, pensionAccounts: e.target.value})} placeholder="UAN / PF Number..." />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="setup" className="space-y-4 pt-4 outline-none">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emergency Contact</label>
                      <Input value={staffForm.emergencyContact} onChange={e => setStaffForm({...staffForm, emergencyContact: e.target.value})} placeholder="Name & Num..." />
                    </div>
                    <div className="space-y-2 flex items-center pt-8">
                       <input type="checkbox" id="signedContract" className="mr-2 h-4 w-4 rounded border-gray-300" checked={staffForm.signedContract} onChange={e => setStaffForm({...staffForm, signedContract: e.target.checked})} />
                       <label htmlFor="signedContract" className="text-sm font-medium">Employment Contract Signed</label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipment & Access Needs</label>
                    <Input value={staffForm.equipmentRequirements} onChange={e => setStaffForm({...staffForm, equipmentRequirements: e.target.value})} placeholder="Laptop specs, keycard access, software licenses..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Arrival Time</label>
                      <Input type="time" value={staffForm.expectedArrivalTime} onChange={e => setStaffForm({...staffForm, expectedArrivalTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                      <select 
                        className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-sm"
                        value={staffForm.status} 
                        onChange={e => setStaffForm({...staffForm, status: e.target.value})}
                      >
                        <option value="Active">Active Duty</option>
                        <option value="On Leave">On Leave</option>
                      </select>
                    </div>
                  </div>
                  <div className="pt-4 border-t mt-4 border-border">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Assign Multiple Designations</label>
                    <div className="flex flex-wrap gap-2">
                      {designations.length === 0 ? <p className="text-xs italic text-muted-foreground">Please create designations first.</p> : 
                        designations.map(d => {
                          const isSel = staffForm.designationIds.includes(d.id);
                          return (
                            <Badge 
                              key={d.id} 
                              onClick={() => toggleDesignationSelection(d.id)}
                              variant={isSel ? "default" : "outline"} 
                              className={`cursor-pointer px-3 py-1 transition-all ${isSel ? 'bg-primary text-primary-foreground hover:bg-primary/80' : 'hover:bg-muted font-normal text-muted-foreground'}`}
                            >
                              {d.name} {isSel && <CheckCircle className="ml-1.5 h-3 w-3 inline" />}
                            </Badge>
                          )
                        })
                      }
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6 border-t pt-4">
                <Button onClick={handleCreateStaff} disabled={!staffForm.firstName || !staffForm.lastName}>
                  Finalize Contract & Enroll
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={isQrViewOpen} onOpenChange={setIsQrViewOpen}>
        <DialogContent className="max-w-sm flex flex-col items-center justify-center p-8 bg-zinc-50 border-zinc-200">
          <DialogTitle className="sr-only">Staff ID Card</DialogTitle>
          <div className="w-full bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden shadow-black/5 relative">
            <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-center">
               <div className="font-serif text-zinc-100 font-bold uppercase text-[10px] tracking-[4px]">Staff ID Permit</div>
            </div>
            <div className="p-8 flex flex-col items-center">
              {selectedStaff?.profile_picture ? (
                 <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 overflow-hidden -mt-16 bg-zinc-100 z-10 relative">
                    <img src={selectedStaff.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                 </div>
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 overflow-hidden -mt-16 bg-zinc-100 z-10 relative flex items-center justify-center">
                    <User className="h-10 w-10 text-zinc-300" />
                </div>
              )}
              <div className="bg-white p-3 border-2 border-zinc-100 rounded-xl mb-6 shadow-sm">
                 {selectedStaff && <QRCodeSVG value={selectedStaff.id} size={110} level="H" fgColor="#09090b" />}
              </div>
              <h2 className="font-bold text-xl text-zinc-900 mb-1">{selectedStaff?.first_name} {selectedStaff?.last_name}</h2>
              <div className="font-mono text-zinc-400 font-bold text-xs tracking-widest">{selectedStaff?.id}</div>
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5">
                 {selectedStaff?.designations?.map(d => <Badge key={d} variant="secondary" className="text-[10px] uppercase font-bold text-zinc-600 bg-zinc-100/50">{d}</Badge>)}
              </div>
            </div>
            {/* Hologram graphic */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-50 mix-blend-overlay pointer-events-none" />
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-4">
           <CardTitle>Staff Directory</CardTitle>
           <CardDescription>Comprehensive personnel roster categorized by multi-assignable roles.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4 border-b flex items-center space-x-2">
            <Search className="h-5 w-5 text-muted-foreground/50" />
            <Input 
              placeholder="Search by name, EMP ID, or designation tag..." 
              className="max-w-md border-0 focus-visible:ring-0 bg-transparent px-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold text-xs tracking-wider">EMP ID</TableHead>
                <TableHead className="font-bold text-xs tracking-wider">PERSONNEL</TableHead>
                <TableHead className="font-bold text-xs tracking-wider">ASSIGNED DESIGNATIONS</TableHead>
                <TableHead className="font-bold text-xs tracking-wider">STATUS</TableHead>
                <TableHead className="font-bold text-xs tracking-wider text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout" initial={false}>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </TableCell>
                      <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <p className="text-muted-foreground/75 font-medium">No personnel found.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStaff.map((staff, idx) => (
                    <motion.tr 
                      key={staff.id} 
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      layout
                      className="group hover:bg-muted/10 cursor-pointer border-b border-slate-100"
                      onClick={() => navigate(`/staff/${staff.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground/75 w-[120px]">{staff.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {staff.profile_picture ? (
                            <img src={staff.profile_picture} alt="Profile" className="w-10 h-10 rounded-full object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                               <User className="h-4 w-4 text-muted-foreground opacity-50" />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-sm">{staff.first_name} {staff.last_name}</div>
                            <div className="text-[10px] text-muted-foreground">{staff.phone} • {staff.email || 'No email provided'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                            {staff.designations.length === 0 ? (
                              <span className="text-[10px] italic text-muted-foreground/50">Unassigned Pipeline</span>
                            ) : (
                              staff.designations.map(d => <Badge key={d} variant="outline" className="text-[10px] font-bold border-primary/20 text-foreground shadow-sm bg-background/50 h-5 px-1.5">{d}</Badge>)
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={staff.status === 'Active' ? 'success' : 'secondary'} className="text-[10px] uppercase font-bold px-1.5 h-5 shadow-none pb-[2px]">
                          {staff.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { 
                              e.stopPropagation();
                              setSelectedStaff(staff); 
                              setIsQrViewOpen(true); 
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-750 hover:bg-red-50 opacity-50 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteStaff(e, staff.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(188px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

