import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserCog, Receipt, BookOpen, Layers, LogOut, ShieldCheck, Banknote } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { hasPermission } from "../../lib/permissions";
import { supabase } from "../../lib/supabase";
import { api, invalidateApiCache } from "../../lib/api";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [permissionsTrigger, setPermissionsTrigger] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hasPendingExpenses, setHasPendingExpenses] = useState(false);

  const checkPendingExpenses = async () => {
    try {
      const data = await api.getExpenses();
      if (data && Array.isArray(data)) {
        const hasPending = data.some((exp: any) => 
          exp && ["Pending", "Awaiting Approval"].includes(exp.status)
        );
        setHasPendingExpenses(hasPending);
      }
    } catch (err) {
      console.error("Error fetching pending expenses for sidebar:", err);
    }
  };

  useEffect(() => {
    checkPendingExpenses();
  }, []);

  useAutoRefresh(() => {
    checkPendingExpenses();
  }, ['expenses']);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleItemClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Trigger re-render when permissions are saved in real-time
  useEffect(() => {
    const handleUpdate = () => {
      setPermissionsTrigger((prev) => prev + 1);
    };
    window.addEventListener('triyuga_permissions_updated', handleUpdate);
    return () => {
      window.removeEventListener('triyuga_permissions_updated', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("triyuga_auth");
    localStorage.removeItem("triyuga_user_role");
    localStorage.removeItem("triyuga_user_fullname");
    localStorage.removeItem("triyuga_username");
    if (isMobile && onClose) {
      onClose();
    }
    window.location.reload(); 
  };

  const userRole = localStorage.getItem("triyuga_user_role") || "Admin";

  const baseNavItems = [
    { name: "Dashboard", to: "/", icon: LayoutDashboard, permissionKey: "dashboard" as const },
    { name: "Student Management", to: "/students", icon: Users, permissionKey: "students" as const },
    { name: "Enquiries", to: "/enquiries", icon: Users, permissionKey: "enquiries" as const },
    { name: "Staff Management", to: "/staff", icon: UserCog, permissionKey: "staff" as const },
    { name: "Batch & Installments", to: "/batches", icon: Layers, permissionKey: "batches" as const },
    { name: "Fee Management", to: "/fees", icon: Receipt, permissionKey: "fees" as const },
    { name: "Ledger Management", to: "/ledger", icon: BookOpen, permissionKey: "ledger" as const },
    { name: "Expense Management", to: "/expenses", icon: Banknote, permissionKey: "expenses" as const },
  ];

  // Filter items matching the user permissions
  const filteredNavItems = baseNavItems.filter((item) =>
    hasPermission(userRole, item.permissionKey)
  );

  // Expose Permissions Editor only to Administrator
  if (userRole === "Admin") {
    filteredNavItems.push({
      name: "Access Controls",
      to: "/permissions",
      icon: ShieldCheck,
      permissionKey: "dashboard" as any,
    });
  }

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isMobile ? 260 : (isOpen ? 260 : 80),
        x: isMobile ? (isOpen ? 0 : -260) : 0,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8
      }}
      className={cn(
        "bg-[#0A0A0A] text-slate-100 flex flex-col h-screen border-r border-[#1CA751]/10 overflow-hidden shadow-2xl",
        isMobile ? "fixed left-0 top-0 bottom-0 z-40" : "sticky top-0 relative z-20"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-black/40 pointer-events-none opacity-40 block" />
      
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-white/5 z-10 transition-all duration-300",
        isOpen ? "px-6 gap-3" : "px-0 justify-center"
      )}>
        <div className="flex items-center gap-3">
          <motion.div 
            layout
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden shrink-0 border border-[#1CA751]/40 shadow-[0_0_20px_-5px_rgba(28,167,81,0.5)]"
          >
             <svg viewBox="100 50 280 230" className="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg">
                <g transform="translate(0, -10)">
                    <polygon points="262,85 232,100 262,115 292,100" fill="#1CA751" />
                    <polygon points="247,106 247,114 277,114 277,106" fill="#1CA751" />
                    <circle cx="262" cy="132" r="16" fill="#1CA751" />
                    <path d="M 190,110 C 220,160 300,190 320,130 C 335,90 280,60 230,90 C 270,120 290,170 240,220 C 200,260 210,260 220,256 C 270,240 330,190 310,110 C 290,170 220,150 190,110 Z" fill="#1CA751" />
                    <polygon points="175,182 153,193 175,204 197,193" fill="#1CA751" />
                    <polygon points="164,198 164,204 186,204 186,198" fill="#1CA751" />
                    <circle cx="175" cy="216" r="12" fill="#1CA751" />
                    <path d="M 225,175 C 200,210 150,220 145,180 C 140,150 175,130 210,150 C 180,170 160,210 195,245 C 220,270 238,272 230,268 C 185,250 145,220 165,170 C 180,210 210,200 225,175 Z" fill="#1CA751" />
                </g>
             </svg>
          </motion.div>
          <AnimatePresence>
            {isOpen && (
              <motion.div 
                initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.2 }}
                className="flex flex-col whitespace-nowrap overflow-hidden"
              >
                <h1 className="text-[17px] font-black tracking-widest text-[#1CA751] leading-none">TRIYUGA</h1>
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[2px] mt-1">Career Classes</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isMobile && isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 hover:bg-white/5 h-8 w-8 rounded-lg"
          >
            <span className="text-lg font-bold leading-none">&times;</span>
          </Button>
        )}
      </div>

      {/* Nav Section */}
      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 z-10 relative scrollbar-none">
        {filteredNavItems.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <NavLink
              to={item.to}
              onClick={handleItemClick}
              title={!isOpen ? item.name : ""}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-xl transition-all duration-300 group relative outline-none",
                  isOpen ? "px-4 py-3 space-x-3.5 text-[14px] font-medium" : "h-12 w-12 mx-auto justify-center",
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110", 
                    isActive ? "text-primary" : "text-slate-600 group-hover:text-primary"
                  )} />
                  
                  <AnimatePresence mode="popLayout">
                    {isOpen && (
                      <motion.span 
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {item.name === "Expense Management" && hasPendingExpenses && (
                    <span className={cn(
                      "absolute flex h-2 w-2 rounded-full",
                      isOpen ? "right-4 top-1/2 -translate-y-1/2" : "right-1.5 top-1.5"
                    )}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}

                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 bg-white/5 rounded-xl border border-white/5 -z-10"
                      transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-l-full shadow-[0_0_8px_rgba(28,167,81,0.5)]" />
                    </motion.div>
                  )}
                </>
              )}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Footer Section */}
      <div className={cn("p-4 border-t border-white/5 z-10 mt-auto bg-black/20 backdrop-blur-sm", !isOpen && "flex flex-col items-center")}>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
          <Button 
            variant="ghost" 
            title={!isOpen ? "Logout" : ""}
            className={cn(
              "text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl",
              isOpen ? "w-full justify-start px-4 h-11" : "w-11 h-11 p-0 justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-4 w-4", isOpen && "mr-3")} />
            {isOpen && <span className="font-medium whitespace-nowrap overflow-hidden">Logout Session</span>}
          </Button>
        </motion.div>
        
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-1 mt-6 px-2 overflow-hidden whitespace-nowrap"
          >
            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center opacity-50">
              &copy; {new Date().getFullYear()} Triyuga Management
            </div>
            <div className="text-[9px] text-[#1CA751]/80 font-bold uppercase tracking-widest text-center">
              Developed by AYUSH
            </div>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
