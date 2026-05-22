import { Bell, Search, User, Menu } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const location = useLocation();
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/students')) return "Student Directory";
    if (path.startsWith('/staff')) return "Staff Management";
    if (path.startsWith('/batches')) return "Batch Management";
    if (path.startsWith('/fees')) return "Fee Management";
    if (path.startsWith('/ledger')) return "Ledger";
    if (path.startsWith('/resources')) return "Resource Management";
    return "Dashboard";
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex-1 flex justify-start items-center gap-4">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar}
            className="text-slate-500 hover:text-primary transition-colors focus:ring-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>
        <h2 className="text-sm font-semibold text-slate-800 tracking-tight hidden md:block w-48 truncate">
          {getPageTitle()}
        </h2>
        <motion.div 
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "100%" }}
          className="relative w-full max-w-sm hidden sm:block mx-auto flex-1"
        >
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            type="search"
            placeholder="Search by ID or name (Press /)"
            className="w-full bg-slate-100/50 pl-9 border-transparent text-sm focus-visible:ring-primary focus-visible:bg-white transition-all rounded-full h-9"
          />
        </motion.div>
      </div>
      <div className="flex items-center space-x-3 ml-auto">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline" size="icon" className="text-slate-500 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 relative rounded-full w-9 h-9">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
          </Button>
        </motion.div>
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="flex flex-col items-end hidden sm:flex">
             <span className="text-sm font-semibold text-slate-900 leading-none">Admin</span>
             <span className="text-[10px] uppercase text-primary font-bold tracking-widest mt-1">Role Active</span>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 p-0 overflow-hidden w-9 h-9 border border-primary/20">
              <User className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
