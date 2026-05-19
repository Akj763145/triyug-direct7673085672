import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserCog, Receipt, BookOpen, Layers, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

const navItems = [
  { name: "Dashboard", to: "/", icon: LayoutDashboard },
  { name: "Student Management", to: "/students", icon: Users },
  { name: "Staff Management", to: "/staff", icon: UserCog },
  { name: "Fee Management", to: "/fees", icon: Receipt },
  { name: "Ledger Management", to: "/ledger", icon: BookOpen },
  { name: "Resource Management", to: "/resources", icon: Layers },
];

export function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("triyuga_auth");
    window.location.reload(); // Hard reload to clear App state
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-card hidden md:flex flex-col h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="text-xl font-bold tracking-tight text-primary">Triyuga Classes</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t space-y-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
        <div className="text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Triyuga Classes
        </div>
      </div>
    </aside>
  );
}
