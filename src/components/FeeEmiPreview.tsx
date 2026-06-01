import React, { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RefreshCcw, Lock, Unlock } from 'lucide-react';

export function FeeEmiPreview({
  totalCourseFee,
  downpayment,
  targetEndMonth,
  enrollmentDate,
  emiFrequency = 'Monthly',
  onEmisChange
}: {
  totalCourseFee: number;
  downpayment: number;
  targetEndMonth: string;
  enrollmentDate: string;
  emiFrequency?: string;
  onEmisChange: (emis: { id: string, date: string, label: string, amount: number }[]) => void;
}) {
  const [emis, setEmis] = useState<{ id: string; date: string; label: string; amount: number; locked: boolean }[]>([]);
  const [isPristine, setIsPristine] = useState(true);

  // Initial calculation or recalculation when base bounds change AND user hasn't manually tinkered (or forced recalculation)
  const calculateEmis = () => {
     let remaining = totalCourseFee - downpayment;
     if (remaining <= 0 || !targetEndMonth) {
        setEmis([]);
        return;
     }

     const startDate = new Date(enrollmentDate || new Date().toISOString().split('T')[0]);
     const endDate = new Date(targetEndMonth);
     
     let step = 1;
     if (emiFrequency === 'Quarterly') step = 3;
     else if (emiFrequency === 'Half-Yearly') step = 6;
     else if (emiFrequency === 'Annually') step = 12;

     let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
     if (monthsDiff <= 0) monthsDiff = 1;
     else monthsDiff += 1;

     let terms = Math.ceil(monthsDiff / step);
     if (terms <= 0) terms = 1;

     const emiAmount = remaining / terms;
     const newEmis = [];

     for (let i = 0; i < terms; i++) {
        const idue = new Date(startDate.getFullYear(), startDate.getMonth() + (i * step), startDate.getDate());
        const monthName = idue.toLocaleString('default', { month: 'long', year: 'numeric' });
        newEmis.push({
           id: `emi-${i}`,
           date: idue.toISOString().split('T')[0],
           label: `${monthName} Installment`,
           amount: parseFloat(emiAmount.toFixed(2)),
           locked: false
        });
     }

     // Fix rounding error on the last EMI
     const totalGenerated = newEmis.reduce((sum, item) => sum + item.amount, 0);
     const diff = remaining - totalGenerated;
     if (diff !== 0 && newEmis.length > 0) {
        newEmis[newEmis.length - 1].amount = parseFloat((newEmis[newEmis.length - 1].amount + diff).toFixed(2));
     }

     setEmis(newEmis);
     setIsPristine(true);
     onEmisChange(newEmis.map(e => ({ id: e.id, date: e.date, label: e.label, amount: e.amount })));
  };

  useEffect(() => {
     if (isPristine) {
        calculateEmis();
     }
  }, [totalCourseFee, downpayment, targetEndMonth, enrollmentDate, emiFrequency]);
  
  const handleManualEdit = (index: number, newAmount: number) => {
     setIsPristine(false);
     let remainingTarget = totalCourseFee - downpayment;
     
     let newEmis = [...emis];
     newEmis[index].amount = newAmount;
     newEmis[index].locked = true;

     const lockedSum = newEmis.filter(e => e.locked).reduce((sum, e) => sum + e.amount, 0);
     const unlockedCount = newEmis.filter(e => !e.locked).length;

     if (unlockedCount > 0) {
         const remainingForUnlocked = Math.max(0, remainingTarget - lockedSum);
         const equalUnlockedAmount = parseFloat((remainingForUnlocked / unlockedCount).toFixed(2));
         
         let sumUnlockedGenerated = 0;
         newEmis.forEach(e => {
            if (!e.locked) {
               e.amount = equalUnlockedAmount;
               sumUnlockedGenerated += equalUnlockedAmount;
            }
         });
         
         const diff = (remainingTarget - lockedSum) - sumUnlockedGenerated;
         if (diff !== 0) {
             const lastUnlocked = newEmis.concat().reverse().find(e => !e.locked);
             if (lastUnlocked) {
                 lastUnlocked.amount = parseFloat((lastUnlocked.amount + diff).toFixed(2));
             }
         }
     }
     
     setEmis(newEmis);
     onEmisChange(newEmis.map(e => ({ id: e.id, date: e.date, label: e.label, amount: e.amount })));
  };

  const toggleLock = (index: number) => {
     const newEmis = [...emis];
     newEmis[index].locked = !newEmis[index].locked;
     setEmis(newEmis);
     onEmisChange(newEmis.map(e => ({ id: e.id, date: e.date, label: e.label, amount: e.amount })));
  };

  if (!targetEndMonth || emis.length === 0) return null;

  const totalEmis = emis.reduce((sum, item) => sum + item.amount, 0);
  const remaining = parseFloat((totalCourseFee - downpayment).toFixed(2));

  return (
    <div className="mt-4 border border-input rounded-md overflow-hidden bg-muted/5">
      <div className="flex justify-between items-center p-3 bg-muted/10 border-b border-input">
        <div>
           <h4 className="text-xs font-bold uppercase tracking-wider">EMI Schedule Preview</h4>
           <p className="text-[10px] text-muted-foreground mt-0.5">Total remaining: ₹{remaining.toLocaleString()} | Allocated: <span className={Math.abs(remaining - totalEmis) > 1 ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}>₹{totalEmis.toLocaleString()}</span></p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1.5" onClick={calculateEmis}>
           <RefreshCcw className="h-3 w-3" /> Reset / Auto-Distribute
        </Button>
      </div>
      <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
         {emis.map((emi, i) => (
            <div key={emi.id} className="flex items-center gap-2 text-sm bg-background p-2 rounded border border-border/50">
               <div className="w-8 flex justify-center shrink-0">
                  <span className="text-[10px] font-black text-muted-foreground">#{i+1}</span>
               </div>
               <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">{emi.label}</span>
                  <div className="text-[10px] text-muted-foreground">{emi.date}</div>
               </div>
               <div className="w-24 shrink-0 flex items-center relative">
                  <span className="absolute left-2 text-[10px] font-bold text-muted-foreground">₹</span>
                  <Input 
                    type="number"
                    value={emi.amount}
                    onChange={(e) => handleManualEdit(i, parseFloat(e.target.value) || 0)}
                    className="h-8 pl-5 py-1 text-xs font-mono font-bold bg-muted/20"
                  />
               </div>
               <Button
                 variant="ghost" 
                 size="icon" 
                 className={`h-8 w-8 shrink-0 ${emi.locked ? 'text-blue-500 bg-blue-500/10' : 'text-muted-foreground'}`}
                 onClick={(e) => { e.preventDefault(); toggleLock(i); }}
                 title={emi.locked ? "Unlock EMI" : "Lock EMI amount"}
               >
                 {emi.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
               </Button>
            </div>
         ))}
      </div>
    </div>
  );
}
