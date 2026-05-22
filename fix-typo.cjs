const fs = require('fs');
let content = fs.readFileSync('src/pages/Staff.tsx', 'utf-8');
content = content.replace(/text-_xs/g, 'text-xs');
fs.writeFileSync('src/pages/Staff.tsx', content);
