const fs = require('fs');

let studentCode = fs.readFileSync('src/pages/StudentProfile.tsx', 'utf-8');
let staffCode = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

// The required state from StudentProfile
const stateCode = `  const [currentViewDate, setCurrentViewDate] = useState(new Date());
  
  type AttendanceRecord = {
    id?: string;
    date: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    marked_by?: string;
    scanned_at?: string;
    subject?: string;
    sessions?: { subject: string, status: string, time: string }[];
  };
  const [selectedDay, setSelectedDay] = useState<AttendanceRecord | null>(null);`;

if (!staffCode.includes('currentViewDate')) {
  staffCode = staffCode.replace(
    /const \[isEditDialogOpen, setIsEditDialogOpen\] = useState\(false\);/,
    `const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);\n${stateCode}`
  );
}

const handleMarkCode = `
  const handleMarkAttendance = async (status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    if (!id) return;
    const date = new Date().toISOString().split('T')[0];
    try {
      const { error } = await supabase.from('staff_attendance').upsert({
        staff_id: id,
        date: date,
        status: status
      }, { onConflict: 'staff_id,date' });
      if (error) throw error;
      loadData();
    } catch (error) {
       console.error("Error marking attendance:", error);
       alert("Error marking attendance");
    }
  };
`;

if (!staffCode.includes('handleMarkAttendance')) {
  staffCode = staffCode.replace(
    /const handleSaveProfile = async \(\) => \{/,
    `${handleMarkCode}\n\n  const handleSaveProfile = async () => {`
  );
}

// Get the attendance tab from StudentProfile
const studentTabMatch = studentCode.match(/<TabsContent value="attendance"[^>]*>([\s\S]*?)<\/TabsContent>/);
if (studentTabMatch) {
  let studentTabContent = studentTabMatch[0];
  
  // Replace student_id with staff_id if there are queries? No, it's just frontend.
  // Replace references to subject, maybe just remove subject or keep it.
  
  // Replace the attendance tab in StaffProfile
  staffCode = staffCode.replace(
    /<TabsContent value="attendance"[^>]*>([\s\S]*?)<\/TabsContent>/,
    studentTabContent
  );

  // We need to add the Dialog for selected day at the end of StaffProfile
  if (!staffCode.includes('selectedDay?.date')) {
    const dialogMatch = studentCode.match(/<Dialog open=\{!!selectedDay\}[\s\S]*Detailed period-wise attendance[\s\S]*?<\/Dialog>/);
    if (dialogMatch) {
      staffCode = staffCode.replace(
        /<\/Tabs>\n\n\s*<Dialog open=\{isEditDialogOpen\}/,
        `</Tabs>\n\n      ${dialogMatch[0]}\n\n      <Dialog open={isEditDialogOpen}`
      );
    }
  }

}

fs.writeFileSync('src/pages/StaffProfile.tsx', staffCode);
console.log('Done');
