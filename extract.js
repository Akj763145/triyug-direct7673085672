const fs = require('fs');

const studentContent = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf-8');
const staffContent = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

// We need to extract the attendance tab from StudentProfile.tsx
// Let's find the start of the TabsContent value="attendance"
let studentTabContent = '';
const studentTabMatch = studentContent.match(/<TabsContent value="attendance"[^>]*>([\s\S]*?)<\/TabsContent>/);
if (studentTabMatch) {
  studentTabContent = studentTabMatch[0];
} else {
  console.log('Could not find TabsContent value="attendance" in StudentProfile.tsx');
  process.exit(1);
}

// Now replace it in StaffProfile.tsx
let newStaffContent = staffContent.replace(
  /<TabsContent value="attendance"[^>]*>([\s\S]*?)<\/TabsContent>/,
  studentTabContent
);

// We need to replace the variable references where necessary.
// student_id -> staff_id in any queries
// Oh, the queries for marking attendance might be in the component! Let's check handleMarkAttendance
fs.writeFileSync('src/pages/StaffProfile.tsx', newStaffContent);
console.log('Replaced attendance tab');
