const fs = require('fs');
let code = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

code = code.replace(
  /import \{ Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis \} from "recharts";/,
  `import { Area, AreaChart, BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";`
);

fs.writeFileSync('src/pages/StaffProfile.tsx', code);
console.log('Fixed Recharts imports');
