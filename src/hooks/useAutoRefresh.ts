import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback: () => void, tables?: string[]) {
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Use JSON.stringify for tables array to avoid infinite loops from new array references
  const tablesKey = tables ? JSON.stringify(tables) : null;

  useEffect(() => {
    const handler = ((e: CustomEvent) => {
      const changedTable = e.detail?.table;
      
      // If tables are specified, only trigger if the changed table matches
      if (tablesKey && changedTable && changedTable !== '*') {
         const parsedTables = JSON.parse(tablesKey);
         if (!parsedTables.includes(changedTable)) {
           return;
         }
      }
      
      savedCallback.current();
    }) as EventListener;
    
    window.addEventListener('triyuga_db_update', handler);
    
    // Robust fallback: Background polling every 10 seconds to sync changes 
    // across different browser profiles/devices when Realtime connects are missed
    const pollInterval = setInterval(() => {
      savedCallback.current();
    }, 10000);

    return () => {
      window.removeEventListener('triyuga_db_update', handler);
      clearInterval(pollInterval);
    };
  }, [tablesKey]);
}
