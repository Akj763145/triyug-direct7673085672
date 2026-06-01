import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RefreshCcw, Lock, Unlock } from 'lucide-react';

export function AnnualEmiPolicyMaker({
  totalCourseFee,
  downpayment,
  frequency,
  customTerms,
  customGap,
  enrollmentDate,
  onPolicyChange
}: {
  totalCourseFee: number;
  downpayment: number;
  frequency: string;
  customTerms?: number;
  customGap?: number;
  enrollmentDate?: string;
  onPolicyChange: (emis: { label: string, amount: number, percentage: number, date: string }[]) => void;
}) {
  const [emis, setEmis] = useState<{ id: string; label: string; percentage: number; amount: number; locked: boolean; date: string }[]>([]);

  const calculateDefaultPolicy = () => {
      let remaining = totalCourseFee - downpayment;
      if (remaining <= 0) {
         setEmis([]);
         return;
      }
      
      let terms = 12;
      let gap = 1;

      if (frequency === 'Quarterly') { terms = 4; gap = 3; }
      else if (frequency === 'Half-Yearly') { terms = 2; gap = 6; }
      else if (frequency === 'Annually') { terms = 1; gap = 12; }
      else if (frequency === 'Custom') {
         terms = customTerms && customTerms > 0 ? customTerms : 12;
         gap = customGap && customGap > 0 ? customGap : 1;
      }
      
      const defaultPercent = 100 / terms;
      const defaultAmount = remaining / terms;
      
      const startDate = enrollmentDate ? new Date(enrollmentDate) : new Date();

      const newEmis = [];
      for (let i = 0; i < terms; i++) {
          let termLabel = `Installment ${i + 1}`;
          if (frequency === 'Monthly') termLabel = `Month ${i + 1}`;
          else if (frequency === 'Quarterly') termLabel = `Quarter ${i + 1}`;
          else if (frequency === 'Half-Yearly') termLabel = `Half ${i + 1}`;
          
          const idue = new Date(startDate.getFullYear(), startDate.getMonth() + (i * gap), startDate.getDate());

          newEmis.push({
              id: `term-${i}`,
              label: termLabel,
              percentage: parseFloat(defaultPercent.toFixed(2)),
              amount: parseFloat(defaultAmount.toFixed(2)),
              locked: false,
              date: idue.toISOString().split('T')[0]
          });
      }
      
      // fix rounding
      const sumPercent = newEmis.reduce((s, e) => s + e.percentage, 0);
      if (sumPercent !== 100 && newEmis.length > 0) {
          newEmis[newEmis.length-1].percentage = parseFloat((newEmis[newEmis.length-1].percentage + (100 - sumPercent)).toFixed(2));
      }
      const sumAmount = newEmis.reduce((s, e) => s + e.amount, 0);
      if (sumAmount !== remaining && newEmis.length > 0) {
          newEmis[newEmis.length-1].amount = parseFloat((newEmis[newEmis.length-1].amount + (remaining - sumAmount)).toFixed(2));
      }
      
      setEmis(newEmis);
      onPolicyChange(newEmis.map(e => ({ label: e.label, amount: e.amount, percentage: e.percentage, date: e.date })));
  };

  useEffect(() => {
     calculateDefaultPolicy();
  }, [totalCourseFee, downpayment, frequency, customTerms, customGap, enrollmentDate]);
  
  const handlePercentageChange = (index: number, newPercent: number) => {
      let remaining = totalCourseFee - downpayment;
      const newEmis = [...emis];
      newEmis[index].percentage = newPercent;
      newEmis[index].amount = parseFloat(((newPercent / 100) * remaining).toFixed(2));
      newEmis[index].locked = true;
      
      const lockedSumPercent = newEmis.filter(e => e.locked).reduce((sum, e) => sum + e.percentage, 0);
      const unlockedCount = newEmis.filter(e => !e.locked).length;
      
      if (unlockedCount > 0) {
          const remainingPercent = Math.max(0, 100 - lockedSumPercent);
          const equalPercent = parseFloat((remainingPercent / unlockedCount).toFixed(2));
          
          let generatedPercent = 0;
          newEmis.forEach(e => {
              if (!e.locked) {
                  e.percentage = equalPercent;
                  e.amount = parseFloat(((equalPercent / 100) * remaining).toFixed(2));
                  generatedPercent += equalPercent;
              }
          });
          
          const diff = (100 - lockedSumPercent) - generatedPercent;
          if (diff !== 0) {
              const lastUnlocked = newEmis.concat().reverse().find(e => !e.locked);
              if (lastUnlocked) {
                  lastUnlocked.percentage = parseFloat((lastUnlocked.percentage + diff).toFixed(2));
                  lastUnlocked.amount = parseFloat(((lastUnlocked.percentage / 100) * remaining).toFixed(2));
              }
          }
      }
      
      setEmis(newEmis);
      onPolicyChange(newEmis.map(e => ({ label: e.label, amount: e.amount, percentage: e.percentage, date: e.date })));
  };
  
  const handleDateChange = (index: number, newDate: string) => {
      const newEmis = [...emis];
      newEmis[index].date = newDate;
      setEmis(newEmis);
      onPolicyChange(newEmis.map(e => ({ label: e.label, amount: e.amount, percentage: e.percentage, date: e.date })));
  };

  const toggleLock = (index: number) => {
     const newEmis = [...emis];
     newEmis[index].locked = !newEmis[index].locked;
     setEmis(newEmis);
     onPolicyChange(newEmis.map(e => ({ label: e.label, amount: e.amount, percentage: e.percentage, date: e.date })));
  };
  
  if (emis.length === 0) return null;
  
  return (
    <div className="mt-4 border border-input rounded-md overflow-hidden bg-muted/5">
      <div className="flex justify-between items-center p-3 bg-muted/10 border-b border-input">
        <div>
           <h4 className="text-xs font-bold uppercase tracking-wider">EMI Policy Maker</h4>
           <p className="text-[10px] text-muted-foreground mt-0.5">Distribute total fee logically by percentage.</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1.5" onClick={calculateDefaultPolicy}>
           <RefreshCcw className="h-3 w-3" /> Reset Policy
        </Button>
      </div>
      <div className="p-2 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
         {emis.map((emi, i) => (
            <div key={emi.id} className="flex flex-col gap-2 p-2 bg-background rounded border border-border/50">
               <div className="flex items-center gap-2 text-sm">
                  <div className="w-8 flex justify-center shrink-0">
                     <span className="text-[10px] font-black text-muted-foreground">#{i+1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                     <span className="text-xs font-medium text-foreground">{emi.label}</span>
                  </div>
                  <div className="w-24 shrink-0 flex items-center relative">
                     <span className="absolute left-2 text-[10px] font-bold text-muted-foreground">%</span>
                     <Input 
                       type="number"
                       value={emi.percentage}
                       onChange={(e) => handlePercentageChange(i, parseFloat(e.target.value) || 0)}
                       className="h-8 pl-6 py-1 text-xs font-mono font-bold bg-muted/20"
                     />
                  </div>
                  <div className="w-24 shrink-0 text-right pr-2">
                    <span className="text-xs font-mono text-muted-foreground">₹{emi.amount.toLocaleString()}</span>
                  </div>
                  <Button
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 shrink-0 ${emi.locked ? 'text-blue-500 bg-blue-500/10' : 'text-muted-foreground'}`}
                    onClick={(e) => { e.preventDefault(); toggleLock(i); }}
                    title={emi.locked ? "Unlock" : "Lock"}
                  >
                    {emi.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </Button>
               </div>
               <div className="pl-10 pr-10">
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider w-12 shrink-0">Due On:</span>
                      <Input
                        type="date"
                        value={emi.date || ''}
                        onChange={(e) => handleDateChange(i, e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                   </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
