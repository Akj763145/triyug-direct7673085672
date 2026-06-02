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
          let termLabel = `Annual Installment ${i + 1}`;
          if (frequency === 'Monthly') termLabel = `Annual Month ${i + 1}`;
          else if (frequency === 'Quarterly') termLabel = `Annual Quarter ${i + 1}`;
          else if (frequency === 'Half-Yearly') termLabel = `Annual Half ${i + 1}`;
          
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
    <div className="mt-4 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30 shadow-sm font-sans transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/70 backdrop-blur-sm border-b border-slate-150/80 gap-3">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
             <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">EMI Policy Maker</h4>
           </div>
           <p className="text-[11px] text-slate-500 mt-0.5">Distribute total fee logically by percentage.</p>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 text-xs px-3 gap-1.5 bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm font-medium transition-all" 
          onClick={calculateDefaultPolicy}
        >
           <RefreshCcw className="h-3.5 w-3.5 animate-hover-spin" /> Reset Policy
        </Button>
      </div>
      <div className="p-3 bg-slate-50/50 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
         {emis.map((emi, i) => (
            <div 
              key={emi.id} 
              className="group flex flex-col gap-3 text-sm bg-white p-3 rounded-lg border border-slate-200/70 hover:border-emerald-500/30 hover:shadow-sm transition-all duration-200"
            >
               <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                     <div className="h-7 w-7 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                        <span className="text-[11px] font-black text-slate-400 group-hover:text-emerald-600 transition-colors">#{i+1}</span>
                     </div>
                     <div className="min-w-0 space-y-0.5">
                        <span className="text-xs font-semibold text-slate-800 tracking-tight block truncate">{emi.label}</span>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <div className="w-24 shrink-0 flex items-center relative">
                        <span className="absolute left-3 text-xs font-black text-slate-400 select-none group-focus-within:text-emerald-500 transition-colors">%</span>
                        <input 
                          type="number"
                          value={emi.percentage}
                          onChange={(e) => handlePercentageChange(i, parseFloat(e.target.value) || 0)}
                          className="h-9 w-full rounded-md border border-slate-200 bg-slate-50/30 pl-7 pr-2 py-1 text-xs font-mono font-bold text-slate-800 hover:bg-slate-100/50 focus:bg-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 shadow-inner outline-none transition-all duration-200"
                        />
                     </div>
                     <div className="w-28 shrink-0 flex items-center justify-end pr-1">
                       <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-100 shadow-sm">₹{emi.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     <Button
                       variant="ghost" 
                       size="icon" 
                       className={`h-9 w-9 shrink-0 rounded-md transition-all ${emi.locked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-150'}`}
                       onClick={(e) => { e.preventDefault(); toggleLock(i); }}
                       title={emi.locked ? "Unlock" : "Lock"}
                     >
                       {emi.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                     </Button>
                  </div>
               </div>
               
               <div className="pl-10 pr-2">
                   <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-2 bg-slate-50/50 rounded-md border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5 shrink-0">
                         <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                         </svg>
                         Due On:
                      </span>
                      <input
                        type="date"
                        value={emi.date || ''}
                        onChange={(e) => handleDateChange(i, e.target.value)}
                        className="h-8 w-full sm:w-auto px-3 rounded-md border border-slate-200 bg-white text-xs font-mono font-medium text-slate-700 hover:border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                      />
                   </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
