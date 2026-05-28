import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Lock, User, Loader2 } from "lucide-react";
import { api } from "../lib/api";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await api.login(username, password);
      
      if (result.success && result.user) {
        localStorage.setItem("triyuga_auth", "true");
        localStorage.setItem("triyuga_user_role", result.user.role || "Admin");
        localStorage.setItem("triyuga_user_fullname", result.user.full_name || "User");
        localStorage.setItem("triyuga_username", result.user.username || username);
        onLogin();
        navigate("/");
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[radial-gradient(circle_at_center,_var(--color-primary)_0%,_transparent_100%)] bg-no-repeat bg-[length:100%_100%] bg-opacity-5">
      <div className="absolute inset-0 bg-background/90" />
      
      <Card className="w-full max-w-md relative z-10 border-primary/20 shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Lock className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Triyuga Classes</CardTitle>
          <CardDescription>Enter your credentials to access the portal</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="username">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="username" 
                  className="pl-10" 
                  placeholder="admin" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  className="pl-10" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-bold" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
            
            <div className="w-full text-center border-t border-slate-200/50 pt-3 mt-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Notice</p>
              <div className="grid gap-2 text-left">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-slate-600 mt-0.5" />
                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                    You can log in using custom accounts created from the <b>Access Controls</b> module. To begin, use the root account:<br/>
                    <span className="font-mono font-bold text-slate-800 bg-slate-200/50 px-1 py-0.5 rounded">admin</span> / <span className="font-mono font-bold text-slate-800 bg-slate-200/50 px-1 py-0.5 rounded">admin123</span>
                  </p>
                </div>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
