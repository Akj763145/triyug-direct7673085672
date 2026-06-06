import { useState, useEffect, useRef } from "react";
import { Bell, User, Menu, X, Check } from "lucide-react";
import { Button } from "../ui/button";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../lib/api";
import { ActivityLog } from "../../types";
import { useAutoRefresh } from "../../hooks/useAutoRefresh";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    const data = await api.getActivityLogs();
    if (data) {
      const sorted = (data as ActivityLog[]).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime() || b.id - a.id);
      setLogs(sorted.slice(0, 10));
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  useAutoRefresh(() => {
    loadLogs();
  }, ['activity_logs']);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/students')) return "Student Directory";
    if (path.startsWith('/staff')) return "Staff Management";
    if (path.startsWith('/batches')) return "Batch Management";
    if (path.startsWith('/fees')) return "Fee Management";
    if (path.startsWith('/ledger')) return "Ledger";
    if (path.startsWith('/expenses')) return "Expense Management";
    if (path.startsWith('/permissions')) return "Access Controls";
    return "Dashboard";
  };

  const userFullname = localStorage.getItem("triyuga_user_fullname") || "System Administrator";
  const userRole = localStorage.getItem("triyuga_user_role") || "Admin";

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
      </div>
      <div className="flex items-center space-x-3 ml-auto">
        <div className="relative" ref={dropdownRef}>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="outline" 
              size="icon" 
              className="text-slate-500 border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 relative rounded-full w-9 h-9"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <Bell className="h-4 w-4" />
              {logs.length > 0 && (
                <span className="absolute top-1.5 right-2 w-2 h-2 bg-primary rounded-full border-2 border-white"></span>
              )}
            </Button>
          </motion.div>
          
          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-slate-400 hover:text-slate-600" onClick={() => setNotificationsOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {logs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No new notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {logs.map((log) => (
                        <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Bell className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-slate-800 leading-snug">{log.action}</p>
                            <div className="flex items-center text-[11px] text-slate-500 gap-2">
                              {log.user && <span className="font-medium text-slate-600">{log.user}</span>}
                              {log.user && <span>•</span>}
                              <span>{new Date(log.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {logs.length > 0 && (
                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <Button variant="ghost" className="w-full text-xs h-8 text-primary hover:bg-primary/10 font-semibold" onClick={() => setLogs([])}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Mark all as read
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="flex flex-col items-end hidden sm:flex">
             <span className="text-sm font-semibold text-slate-900 leading-none">{userFullname}</span>
             <span className="text-[10px] uppercase text-primary font-bold tracking-widest mt-1">{userRole} Active</span>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 p-0 overflow-hidden w-9 h-9 border border-primary/20">
              <span className="text-xs font-black">{userFullname ? userFullname.charAt(0).toUpperCase() : "U"}</span>
            </Button>
          </motion.div>
        </div>
      </div>
    </header>
  );
}
