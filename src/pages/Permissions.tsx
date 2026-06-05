import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { api } from "../lib/api";
import { 
  getRolePermissions, 
  saveRolePermissions, 
  defaultPermissions,
  RolePermissions,
  PermissionKey,
  refreshPermissions
} from "../lib/permissions";
import { 
  ShieldCheck, 
  UserSquare2, 
  Check, 
  Settings2, 
  LayoutDashboard,
  Users,
  UserCog,
  Layers,
  Receipt,
  BookOpen,
  Info,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  KeyRound,
  UserPlus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const MODULE_INFOS: { key: PermissionKey; name: string; desc: string; icon: any }[] = [
  { 
    key: "dashboard", 
    name: "Dashboard Overview", 
    desc: "Analytical widgets, admission charts, daily metrics, and activity logs ticker.",
    icon: LayoutDashboard 
  },
  { 
    key: "students", 
    name: "Student Management", 
    desc: "Registering new course admissions, modifying student records, profiling, and document storage.",
    icon: Users 
  },
  { 
    key: "staff", 
    name: "Staff Management", 
    desc: "Salary ledgers, staff database, marking employee attendances, and designated designations.",
    icon: UserCog 
  },
  { 
    key: "batches", 
    name: "Batch & Installments", 
    desc: "Course durations, curriculum structures, EMI schedules with multi-gap installment builders.",
    icon: Layers 
  },
  { 
    key: "fees", 
    name: "Fee Management", 
    desc: "Invoice templates, issuing collection notices, QR token tokens, and fee status updates.",
    icon: Receipt 
  },
  { 
    key: "ledger", 
    name: "Ledger Management", 
    desc: "Cash book ledgers, revenue records, expense statements, and financial metrics.",
    icon: BookOpen 
  },
  { 
    key: "expenses", 
    name: "Expense Management", 
    desc: "Operational costs, utilities, salary, and miscellaneous financial outgoings tracking.",
    icon: Layers 
  },
  { 
    key: "enquiries", 
    name: "Enquiries", 
    desc: "Manage prospective students, follow-ups, and conversions.",
    icon: Users 
  },
];

export function Permissions() {
  const [activeRole, setActiveRole] = useState<string>("Receptionist");
  const [allRoles, setAllRoles] = useState<string[]>(["Admin", "Receptionist"]);
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions.Receptionist);
  
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isAddingRole, setIsAddingRole] = useState(false);
  
  // User Management State
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "Receptionist"
  });
  const [userLoading, setUserLoading] = useState(false);



  useEffect(() => {
    const fetchData = async () => {
      const rolesData = await api.getRolePermissions();
      const roleKeys = Object.keys(rolesData);
      const uniqueRoles = Array.from(new Set(["Admin", "Receptionist", ...roleKeys]));
      setAllRoles(uniqueRoles);

      const users = await api.getUsers();
      setSystemUsers(users);
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Load current permissions for selected role
    const perms = getRolePermissions(activeRole);
    setPermissions(perms);
  }, [activeRole]);

  const handleToggle = (key: PermissionKey) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    setSuccess(false);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    const roleName = newRoleName.trim();
    if (allRoles.includes(roleName)) return;

    setSaving(true);
    const initialPerms = defaultPermissions.Receptionist;
    const result = await saveRolePermissions(roleName, initialPerms);
    
    if (result.success) {
      setAllRoles(prev => [...prev, roleName]);
      setActiveRole(roleName);
      setNewRoleName("");
      setIsAddingRole(false);
      setSuccess(true);
    }
    setSaving(false);
  };

  const handleDeleteRole = async (roleToDelete: string) => {
    if (roleToDelete === "Admin" || roleToDelete === "Receptionist") {
      alert("System default roles cannot be deleted.");
      return;
    }
    
    if (confirm(`Delete role "${roleToDelete}"? Users assigned to this role will lose access.`)) {
      const result = await api.deleteRole(roleToDelete);
      if (result.success) {
        setAllRoles(prev => prev.filter(r => r !== roleToDelete));
        if (activeRole === roleToDelete) setActiveRole("Receptionist");
        await refreshPermissions();
      }
    }
  };

  const handlePreset = (type: "front_desk" | "strict_office" | "lockdown" | "full") => {
    setSuccess(false);
    switch (type) {
      case "front_desk":
        setPermissions({
          dashboard: true,
          students: true,
          staff: false,
          batches: false,
          fees: true,
          ledger: false,
          expenses: true,
        });
        break;
      case "strict_office":
        setPermissions({
          dashboard: true,
          students: true,
          staff: false,
          batches: false,
          fees: false,
          ledger: false,
          expenses: true,
        });
        break;
      case "lockdown":
        setPermissions({
          dashboard: false,
          students: false,
          staff: false,
          batches: false,
          fees: false,
          ledger: false,
          expenses: false,
        });
        break;
      case "full":
        setPermissions({
          dashboard: true,
          students: true,
          staff: true,
          batches: true,
          fees: true,
          ledger: true,
          expenses: true,
        });
        break;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRolePermissions(activeRole, permissions);
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;
    setUserLoading(true);
    const result = await api.addUser(newUser);
    if (result.success) {
      const updatedUsers = await api.getUsers();
      setSystemUsers(updatedUsers);
      setIsAddingUser(false);
      setNewUser({ username: "", password: "", full_name: "", role: "Receptionist" });
    }
    setUserLoading(false);
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === "admin") {
      alert("Root admin user cannot be deleted.");
      return;
    }
    if (confirm(`Delete user account "${username}"?`)) {
      const result = await api.deleteUser(id);
      if (result.success) {
        setSystemUsers(prev => prev.filter(u => u.id !== id));
      }
    }
  };



  return (
    <div className="space-y-6 pb-20">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/10 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-[#1CA751] h-7 w-7" /> Access Control & Custom Roles
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl mt-1">
              Design custom clearance levels for your institution. Define precisely what each role can see, modify, or delete across the entire cloud infrastructure.
            </p>
          </div>
          

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Role Selector and Info on LHS (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-slate-100 shadow-sm border">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserSquare2 className="h-5 w-5 text-primary" /> Roles Directory
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-primary/10 text-primary w-8 h-8 cursor-pointer"
                  onClick={() => setIsAddingRole(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Select or create a user clearance level.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {isAddingRole && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-primary/5 rounded-xl border border-primary/20 space-y-3 mb-2"
                  >
                    <Label className="text-[10px] font-bold uppercase text-primary tracking-widest">New Designation Title</Label>
                    <Input 
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="e.g. Account Assistant"
                      className="text-xs h-9"
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" className="h-8 text-[11px] font-bold flex-1 cursor-pointer" onClick={() => setIsAddingRole(false)}>Cancel</Button>
                      <Button className="h-8 text-[11px] font-bold flex-1 bg-primary cursor-pointer" onClick={handleAddRole}>Create Role</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {allRoles.map((role) => (
                <div key={role} className="group relative">
                  <button
                    onClick={() => setActiveRole(role)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-4 cursor-pointer outline-none ${
                        activeRole === role
                        ? "bg-emerald-50/70 border-[#1CA751] shadow-sm"
                        : "bg-white border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      activeRole === role ? "bg-[#1CA751]/20 text-[#1CA751]" : "bg-slate-100 text-slate-500"
                    }`}>
                      {role === "Admin" ? "🛡️" : role === "Receptionist" ? "👨‍💼" : "👤"}
                    </div>
                    <div>
                      <h3 className={`font-bold text-xs ${activeRole === role ? "text-[#1CA751]" : "text-slate-900"}`}>{role}</h3>
                      <p className={`text-[10px] mt-0.5 leading-normal ${activeRole === role ? "text-slate-700 font-medium" : "text-slate-500"}`}>
                        {role === "Admin" ? "Full system access & backend control." : `Custom clearance for ${role} module mapping.`}
                      </p>
                    </div>
                  </button>
                  {role !== "Admin" && role !== "Receptionist" && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRole(role);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-50 rounded-full cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Permissions Lists on RHS (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="shadow-sm border border-slate-100">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-black text-slate-900">
                    Clearance Module Access Matrix: {activeRole}
                  </CardTitle>
                  <CardDescription>
                    Enable modules to grant specific routes or actions to this role.
                  </CardDescription>
                </div>
                <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] tracking-wider uppercase font-black rounded-full select-none">
                  Editing Status
                </div>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0 max-h-[500px] overflow-y-auto">
              {MODULE_INFOS.map((item) => {
                const isSelected = permissions[item.key] !== false;
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => handleToggle(item.key)}
                    className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                        isSelected 
                          ? "bg-[#1CA751]/10 text-[#1CA751]" 
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        <Icon className="w-5 h-5 max-w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                          {item.name}
                          {!isSelected && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full select-none">
                              <Lock className="w-2.5 h-2.5" /> Restricted
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
                          {item.desc}
                        </p>
                      </div>
                    </div>

                    <div className="relative shrink-0 mt-1">
                      <div className={`w-11 h-6 rounded-full transition-all duration-300 ${
                        isSelected ? "bg-[#1CA751]" : "bg-slate-200"
                      }`}>
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${
                          isSelected ? "translate-x-5" : "translate-x-0"
                        }`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
            
            <CardFooter className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between rounded-b-xl gap-3">
              <p className="text-[10px] text-slate-500 font-medium">
                Administrative changes apply instantly across all connected sessions.
              </p>
              
              <div className="flex items-center gap-3">
                {success && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-emerald-600 font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Config Saved
                  </motion.span>
                )}
                <Button
                  onClick={handleSave}
                  disabled={saving || activeRole === "Admin"}
                  className="rounded-full px-5 py-5 text-xs font-bold bg-[#1CA751] hover:bg-[#1CA751]/90 shadow-md flex items-center gap-2 cursor-pointer h-10 select-none transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : <><Settings2 className="w-4 h-4" /> Save Selection</>}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* User Management Section */}
          <Card className="shadow-sm border border-slate-100 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900">Dedicated Login Credentials</CardTitle>
                    <CardDescription>Manage user accounts and their associated access roles.</CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => setIsAddingUser(true)}
                  className="rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-bold gap-2 h-9 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" /> Create Account
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <AnimatePresence>
                 {isAddingUser && (
                   <motion.div 
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: "auto", opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     className="p-6 bg-slate-50 border-b border-slate-100"
                   >
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest pl-1">Display Name</Label>
                         <Input 
                           placeholder="Full Name" 
                           value={newUser.full_name}
                           onChange={(e) => setNewUser(prev => ({ ...prev, full_name: e.target.value }))}
                           className="h-10 text-xs bg-white"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest pl-1">Unique Username</Label>
                         <Input 
                           placeholder="username" 
                           value={newUser.username}
                           onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                           className="h-10 text-xs bg-white font-mono"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest pl-1">Security Password</Label>
                         <Input 
                           type="password"
                           placeholder="••••••••" 
                           value={newUser.password}
                           onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                           className="h-10 text-xs bg-white"
                         />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest pl-1">Clearance Designation</Label>
                         <select 
                           value={newUser.role}
                           onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                           className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                         >
                           {allRoles.map(r => (
                             <option key={r} value={r}>{r}</option>
                           ))}
                         </select>
                       </div>
                     </div>
                     <div className="flex justify-end gap-3 mt-6">
                       <Button variant="ghost" className="h-10 text-xs font-bold cursor-pointer" onClick={() => setIsAddingUser(false)}>Cancel</Button>
                       <Button 
                         disabled={userLoading}
                         onClick={handleAddUser}
                         className="h-10 text-xs font-bold px-8 bg-[#1CA751] hover:bg-[#1CA751]/90 cursor-pointer"
                       >
                         {userLoading ? "Provisioning..." : "Finalize Credential"}
                       </Button>
                     </div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-widest border-b border-slate-100">
                     <tr>
                       <th className="px-6 py-4">User Details</th>
                       <th className="px-6 py-4">Access Level</th>
                       <th className="px-6 py-4">Username</th>
                       <th className="px-6 py-4 text-right">Self Service</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {systemUsers.map((user) => (
                       <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                               {user.full_name?.charAt(0) || "U"}
                             </div>
                             <div>
                               <p className="text-xs font-bold text-slate-900">{user.full_name || "N/A"}</p>
                               <p className="text-[10px] font-medium text-slate-400">ID: {user.id.slice(0, 8)}...</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              user.role === "Admin" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {user.role}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                           <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono">{user.username}</code>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             onClick={() => handleDeleteUser(user.id, user.username)}
                             className="rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" 
                             disabled={user.username === "admin"}
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
