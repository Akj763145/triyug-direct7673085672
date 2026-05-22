import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useLocation } from "react-router-dom";

export function PageLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground font-sans">
      <Sidebar isOpen={isSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="mx-auto max-w-7xl w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
