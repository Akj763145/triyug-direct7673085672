import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserCog, Receipt, BookOpen, Layers, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "motion/react";

const navItems = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Student Management", to: "/students", icon: Users },
  { name: "Staff Management", to: "/staff", icon: UserCog },
  { name: "Batch & Installments", to: "/batches", icon: Layers },
  { name: "Fee Management", to: "/fees", icon: Receipt },
  { name: "Ledger Management", to: "/ledger", icon: BookOpen },
  { name: "Resource Management", to: "/resources", icon: Layers },
];

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("triyuga_auth");
    window.location.reload(); 
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ 
        width: isOpen ? 260 : 80,
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30,
        mass: 0.8
      }}
      className={cn(
        "bg-[#0A0A0A] text-slate-100 hidden md:flex flex-col h-screen sticky top-0 relative z-20 border-r border-white/5 overflow-hidden shadow-2xl"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-black/40 pointer-events-none opacity-40 block" />
      
      {/* Brand Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-white/5 z-10 transition-all duration-300",
        isOpen ? "px-6 gap-3" : "px-0 justify-center"
      )}>
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

      {/* Nav Section */}
      <nav className="flex-1 overflow-y-auto py-8 px-4 space-y-2 z-10 relative scrollbar-none">
        {navItems.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <NavLink
              to={item.to}
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
            className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-center mt-6 whitespace-nowrap overflow-hidden opacity-50 px-2"
          >
            &copy; {new Date().getFullYear()} Triyuga Management
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
