import React, { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { RefreshCcw, Lock, Unlock } from 'lucide-react';

export function FeeEmiPreview({
  totalCourseFee = 0,
  downpayment = 0,
  targetEndMonth,
  enrollmentDate,
  isMonthlyMode = false,
  monthlyFeeAmount = 0,
  emiFrequency = 'Monthly',
  onEmisChange
}: {
  totalCourseFee?: number;
  downpayment?: number;
  targetEndMonth: string;
  enrollmentDate: string;
  isMonthlyMode?: boolean;
  monthlyFeeAmount?: number;
  emiFrequency?: string;
  onEmisChange: (emis: { id: string, date: string, label: string, amount: number }[]) => void;
}) {
  const [emis, setEmis] = useState<{ id: string; date: string; label: string; amount: number; locked: boolean }[]>([]);
  const [isPristine, setIsPristine] = useState(true);

  // Initial calculation or recalculation when base bounds change AND user hasn't manually tinkered (or forced recalculation)
  const calculateEmis = () => {
     if (isMonthlyMode) {
        const startDate = new Date(enrollmentDate || new Date().toISOString().split('T')[0]);
        const endDate = new Date(targetEndMonth || "2027-02-28");
        
        let monthsDiff = (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth());
        if (monthsDiff <= 0) monthsDiff = 1;
        else monthsDiff += 1;

        const newEmis = [];
        for (let i = 0; i < monthsDiff; i++) {
           const idue = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate());
           const monthName = idue.toLocaleString('default', { month: 'long', year: 'numeric' });
           newEmis.push({
              id: `emi-${i}`,
              date: idue.toISOString().split('T')[0],
              label: `${monthName} Fee`,
              amount: monthlyFeeAmount,
              locked: false
           });
        }

        setEmis(newEmis);
        setIsPristine(true);
        onEmisChange(newEmis.map(e => ({ id: e.id, date: e.date, label: e.label, amount: e.amount })));
        return;
     }

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
           label: `${monthName} Fee`,
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
  }, [totalCourseFee, downpayment, targetEndMonth, enrollmentDate, emiFrequency, isMonthlyMode, monthlyFeeAmount]);
  
  const handleManualEdit = (index: number, newAmount: number) => {
     setIsPristine(false);
     
     let newEmis = [...emis];
     newEmis[index].amount = newAmount;
     newEmis[index].locked = true;

     if (!isMonthlyMode) {
         let remainingTarget = totalCourseFee - downpayment;
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

  if (!targetEndMonth || (isMonthlyMode ? false : emis.length === 0)) return null;

  const totalEmis = emis.reduce((sum, item) => sum + item.amount, 0);
  const remaining = isMonthlyMode ? totalEmis : parseFloat((totalCourseFee - downpayment).toFixed(2));
  const allocatedClassName = Math.abs(remaining - totalEmis) > 1 ? "text-red-500 font-bold" : "text-emerald-500 font-bold";

  return (
    <div className="mt-4 border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/30 shadow-sm font-sans transition-all duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white/70 backdrop-blur-sm border-b border-slate-150/80 gap-3">
        <div className="space-y-1">
           <div className="flex items-center gap-2">
             <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
             <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">{isMonthlyMode ? 'Monthly Fee Structure' : 'EMI Schedule Plan'}</h4>
           </div>
           {isMonthlyMode ? (
             <p className="text-[11px] text-slate-500 mt-0.5">
               Total Months: <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">{emis.length}</span> | Cumulative Fee: <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">₹{totalEmis.toLocaleString('en-IN')}</span>
             </p>
           ) : (
             <p className="text-[11px] text-slate-500 mt-0.5">
               Total remaining: <span className="font-semibold text-slate-800">₹{remaining.toLocaleString('en-IN')}</span> | Allocated: <span className={`${allocatedClassName} bg-emerald-50/50 px-1.5 py-0.5 rounded-md`}>₹{totalEmis.toLocaleString('en-IN')}</span>
             </p>
           )}
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 text-xs px-3 gap-1.5 bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm font-medium transition-all" 
          onClick={calculateEmis}
        >
           <RefreshCcw className="h-3.5 w-3.5 animate-hover-spin" /> Auto-Distribute
        </Button>
      </div>
      <div className="p-3 bg-slate-50/50 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
         {emis.map((emi, i) => (
            <div 
              key={emi.id} 
              className="group flex items-center justify-between gap-3 text-sm bg-white p-3 rounded-lg border border-slate-200/70 hover:border-emerald-500/30 hover:shadow-sm transition-all duration-200"
            >
               <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-colors">
                     <span className="text-[11px] font-black text-slate-400 group-hover:text-emerald-600 transition-colors">#{i+1}</span>
                  </div>
                  <div className="min-w-0 space-y-0.5">
                     <span className="text-xs font-semibold text-slate-800 tracking-tight block truncate">{emi.label}</span>
                     <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{emi.date}</span>
                     </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                  <div className="w-28 shrink-0 flex items-center relative">
                     <span className="absolute left-3 text-xs font-black text-slate-400 select-none group-focus-within:text-emerald-500 transition-colors">₹</span>
                     <input 
                       type="number"
                       value={emi.amount}
                       onChange={(e) => handleManualEdit(i, parseFloat(e.target.value) || 0)}
                       className="h-9 w-full rounded-md border border-slate-200 bg-slate-50/30 pl-7 pr-3 py-1 text-xs font-mono font-bold text-slate-800 hover:bg-slate-100/50 focus:bg-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 shadow-inner outline-none transition-all duration-200"
                     />
                  </div>
                  {!isMonthlyMode && (
                    <Button
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-md transition-all ${emi.locked ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-150'}`}
                      onClick={(e) => { e.preventDefault(); toggleLock(i); }}
                      title={emi.locked ? "Unlock EMI" : "Lock EMI amount"}
                    >
                      {emi.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                    </Button>
                  )}
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
