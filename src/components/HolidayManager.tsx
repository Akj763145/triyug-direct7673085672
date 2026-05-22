import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { CalendarDays, Plus, Trash2, Loader2, PartyPopper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";

export function HolidayManager() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchHolidays = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: false });
    setHolidays(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleAddHoliday = async () => {
    if (!newDate) return;
    setIsSyncing(true);
    try {
      // 1. Add current holiday
      const { data: holiday, error: hError } = await supabase
        .from('holidays')
        .insert([{ date: newDate, reason: newReason }])
        .select()
        .single();

      if (hError) throw hError;

      setNewDate("");
      setNewReason("");
      setIsAdding(false);
      fetchHolidays();
      alert("Holiday marked and will be highlighted on all attendance calendars!");
    } catch (err: any) {
      console.error(err);
      alert("Error adding holiday: " + (err.message || "Unknown error"));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteHoliday = async (id: string, date: string) => {
    if (!confirm("Are you sure? This will instantly remove the holiday status from everyone's calendar.")) return;
    
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) alert("Error deleting");
    else fetchHolidays();
  };

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-purple-700">
            <PartyPopper className="h-4 w-4" /> Global Holiday Sync
          </CardTitle>
          <CardDescription className="text-[10px]">Mark a date as a holiday to update everyone's calendar</CardDescription>
        </div>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-8 gap-1 shadow-none">
              <Plus className="h-3.5 w-3.5" /> Mark Holiday
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Mark Global Holiday</DialogTitle>
              <CardDescription>
                This will automatically mark ALL staff and students as "Holiday" on the selected date.
              </CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Holiday Date</label>
                <Input 
                  type="date" 
                  value={newDate} 
                  onChange={(e) => setNewDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase">Reason / Name (e.g. Christmas)</label>
                <Input 
                  placeholder="National Holiday, Season Break, etc." 
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={handleAddHoliday}
                disabled={isSyncing || !newDate}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing Records...
                  </>
                ) : (
                  "Sync Holiday Everything"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-purple-600" /></div>
        ) : holidays.length === 0 ? (
          <p className="text-[10px] text-center py-4 text-muted-foreground italic">No holidays marked yet.</p>
        ) : (
          <div className="max-h-[200px] overflow-y-auto pr-2">
            <Table>
              <TableHeader className="bg-muted/50 rounded-md">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="h-8 text-[9px] uppercase font-black">Date</TableHead>
                  <TableHead className="h-8 text-[9px] uppercase font-black">Reason</TableHead>
                  <TableHead className="h-8 text-[9px] uppercase font-black text-right">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id} className="border-purple-500/10">
                    <TableCell className="py-2 text-[10px] font-mono">{h.date}</TableCell>
                    <TableCell className="py-2 text-[10px] font-medium">{h.reason}</TableCell>
                    <TableCell className="py-2 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteHoliday(h.id, h.date)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
