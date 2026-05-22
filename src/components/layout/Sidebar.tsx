import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserCog, Receipt, BookOpen, Layers, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

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
    window.location.reload(); // Hard reload to clear App state
  };

  return (
    <aside className={cn(
      "bg-[#0A0A0A] text-slate-100 hidden md:flex flex-col h-screen sticky top-0 relative transition-all duration-300 ease-in-out z-20 border-r border-slate-800/60 overflow-hidden",
      isOpen ? "w-64" : "w-20"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-50 block" />
      <div className={cn(
        "h-16 flex items-center border-b border-slate-800/60 z-10 transition-all",
        isOpen ? "px-6 gap-3" : "px-0 justify-center"
      )}>
        <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden shrink-0 border border-[#1CA751]/30 shadow-[0_0_15px_-3px_rgba(28,167,81,0.3)]">
           <svg viewBox="100 50 280 230" className="w-full h-full p-0.5" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(0, -10)">
                  {/* Larger Student */}
                  <polygon points="262,85 232,100 262,115 292,100" fill="#1CA751" />
                  <polygon points="247,106 247,114 277,114 277,106" fill="#1CA751" />
                  <circle cx="262" cy="132" r="16" fill="#1CA751" />
                  <path d="M 190,110 C 220,160 300,190 320,130 C 335,90 280,60 230,90 C 270,120 290,170 240,220 C 200,260 210,260 220,256 C 270,240 330,190 310,110 C 290,170 220,150 190,110 Z" fill="#1CA751" />

                  {/* Smaller Student */}
                  <polygon points="175,182 153,193 175,204 197,193" fill="#1CA751" />
                  <polygon points="164,198 164,204 186,204 186,198" fill="#1CA751" />
                  <circle cx="175" cy="216" r="12" fill="#1CA751" />
                  <path d="M 225,175 C 200,210 150,220 145,180 C 140,150 175,130 210,150 C 180,170 160,210 195,245 C 220,270 238,272 230,268 C 185,250 145,220 165,170 C 180,210 210,200 225,175 Z" fill="#1CA751" />
              </g>
           </svg>
        </div>
        {isOpen && (
          <div className="flex flex-col whitespace-nowrap overflow-hidden transition-all duration-300">
            <h1 className="text-[17px] font-black tracking-wider text-[#1CA751] leading-none">TRIYUGA</h1>
            <span className="text-[9px] font-bold text-white/60 uppercase tracking-tighter mt-0.5">Career Classes</span>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5 z-10 relative">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            title={!isOpen ? item.name : ""}
            className={({ isActive }) =>
              cn(
                "flex items-center rounded-lg transition-all duration-200 group relative",
                isOpen ? "px-3.5 py-2.5 space-x-3 text-[14px]" : "p-3 justify-center",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary-foreground" : "text-slate-500 group-hover:text-primary")} />
                {isOpen && <span className="whitespace-nowrap transition-all duration-300 overflow-hidden">{item.name}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className={cn("p-4 border-t border-slate-800/60 z-10 mt-auto transition-all", !isOpen && "items-center")}>
        <Button 
          variant="ghost" 
          title={!isOpen ? "Logout" : ""}
          className={cn(
            "text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all",
            isOpen ? "w-full justify-start" : "w-12 h-12 p-0 justify-center"
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", isOpen && "mr-2")} />
          {isOpen && <span className="whitespace-nowrap overflow-hidden">Logout</span>}
        </Button>
        {isOpen && (
          <div className="text-xs text-slate-500 text-center mt-4 whitespace-nowrap overflow-hidden transition-all duration-300">
            &copy; {new Date().getFullYear()} Triyuga Classes
          </div>
        )}
      </div>
    </aside>
  );
}
