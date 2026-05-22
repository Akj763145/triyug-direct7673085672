const fs = require('fs');

let content = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

if(!content.includes("import ActivityCalendar")) {
  content = content.replace(
    'import { motion } from "motion/react";',
    'import { motion } from "motion/react";\nimport ActivityCalendar from "react-activity-calendar";'
  );
}

const calendarDataFn = `
  const generateCalendarData = () => {
    const today = new Date();
    const data = [];
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(today.getMonth() - 11);
    
    for (let d = new Date(oneYearAgo); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const log = attendance.find(a => a.date === dateStr);
      let level = 0;
      if (log) {
         if (log.status === 'Present') level = 4;
         else if (log.status === 'Half Day' || log.status === 'Late') level = 2;
         else if (log.status === 'Absent') level = 1;
      }
      data.push({
        date: dateStr,
        count: log ? 1 : 0,
        level: level
      });
    }
    return data;
  };
`;

if (!content.includes('generateCalendarData')) {
  content = content.replace(
    'const totalOwed = salaries',
    calendarDataFn + '\n  const totalOwed = salaries'
  );
}

const replacement = `                     <CardContent className="pt-6 overflow-x-auto">
                      <div className="flex justify-start sm:justify-center w-full px-2 min-w-[700px]">
                        <ActivityCalendar 
                          data={generateCalendarData()} 
                          theme={{
                            light: ['hsl(var(--muted))', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
                            dark: ['hsl(var(--muted)/0.5)', '#0e4429', '#006d32', '#26a641', '#39d353']
                          }}
                          colorScheme="dark"
                          labels={{
                            legend: {
                              less: 'Absent',
                              more: 'Present'
                            },
                            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                          }}
                        />
                      </div>
                    </CardContent>`;

content = content.replace(/<CardContent className="pt-6">[\s\S]*?<\/CardContent>/, replacement);

fs.writeFileSync('src/pages/StaffProfile.tsx', content);
