import { useEffect } from 'react';

export function useAutoRefresh(callback: () => void, tables?: string[]) {
  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      const changedTable = e.detail?.table;
      
      // If tables are specified, only trigger if the changed table matches
      if (tables && changedTable && changedTable !== '*') {
         if (!tables.includes(changedTable)) {
           return;
         }
      }
      
      callback();
    }) as EventListener;
    
    window.addEventListener('triyuga_db_update', handler);
    return () => window.removeEventListener('triyuga_db_update', handler);
  }, [callback, tables]);
}
