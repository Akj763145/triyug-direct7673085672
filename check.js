const fs = require('fs');

let studentCode = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf-8');
let handleMarkCode = studentCode.match(/const handleMarkAttendance = async [\s\S]*?\} catch \(error\) \{[\s\S]*?\}\n  \};/);

console.log(handleMarkCode ? "Found handleMarkAttendance" : "Not Found handleMarkAttendance");

let states = studentCode.match(/const \[currentViewDate, setCurrentViewDate\] = useState\(new Date\(\)\);[\s\S]*?const \[selectedDay, setSelectedDay\] = useState.*?null\);/);
console.log(states ? "Found states" : "Not Found states");
