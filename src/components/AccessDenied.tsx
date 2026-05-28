import { ShieldAlert, ArrowLeft, Lock } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export function AccessDenied() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("triyuga_user_fullname") || "User";
  const userRole = localStorage.getItem("triyuga_user_role") || "Receptionist";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mb-6 shadow-lg shadow-red-500/5 relative"
      >
        <Lock className="w-10 h-10 stroke-[2.5]" />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center border-2 border-background"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="max-w-md space-y-3"
      >
        <h1 className="text-3xl font-black tracking-tight text-slate-900 balance">
          Module Access Locked
        </h1>
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
          Secured for Higher Clearance
        </p>
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-left text-slate-600 text-xs leading-relaxed space-y-1 my-4">
          <p><span className="font-bold text-slate-800">Active User:</span> {userName}</p>
          <p><span className="font-bold text-slate-800">Clearance Level:</span> {userRole}</p>
          <p className="text-slate-500 mt-2 border-t border-slate-200/60 pt-2 font-medium">
            This module has been restricted for your role by the Administrator. If you require access, please contact the IT team or Administrator to update your role permissions.
          </p>
        </div>
        
        <div className="pt-2 flex justify-center gap-3">
          <Button 
            variant="outline"
            className="rounded-full px-5 py-5 text-xs font-bold leading-none inline-flex items-center gap-2 cursor-pointer"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
          <Button 
            className="rounded-full px-6 py-5 text-xs font-bold leading-none inline-flex items-center gap-1 cursor-pointer bg-[#1CA751] hover:bg-[#1CA751]/90"
            onClick={() => navigate("/")}
          >
            Return to Dashboard
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
