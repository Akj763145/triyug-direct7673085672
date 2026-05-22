const fs = require('fs');

let code = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

code = code.replace(
  /import \{ ArrowLeft, UserCircle2, CalendarDays, Wallet, CheckCircle, BarChart3, PlusCircle, Edit2 \} from "lucide-react";/,
  `import { ArrowLeft, UserCircle2, CalendarDays, Wallet, CheckCircle, BarChart3, PlusCircle, Edit2, ChevronLeft, ChevronRight, AlertCircle, Clock, FileText, CheckCircle2 } from "lucide-react";`
);

fs.writeFileSync('src/pages/StaffProfile.tsx', code);
console.log('Fixed imports');
