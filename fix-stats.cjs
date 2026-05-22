const fs = require('fs');
let code = fs.readFileSync('src/pages/StaffProfile.tsx', 'utf-8');

// The stats block
const replacement = `
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-emerald-50/5 border-emerald-200/50 relative overflow-hidden">
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-600">
                       <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-emerald-700">
                           Attendance Standing: Good
                        </h3>
                       <p className="text-sm text-emerald-700/80 mr-24">Consistent presence maintained. No recent flags.</p>
                    </div>
                 </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                 <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                       <Clock className="h-6 w-6" />
                    </div>
                    <div>
                       <h3 className="font-bold text-primary">Punctuality Overview</h3>
                       <p className="text-sm text-primary/80">Generally on-time for duty based on logs.</p>
                    </div>
                 </CardContent>
              </Card>
           </div>
`;

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?<\/div>\n\s*<\/TabsContent>/, replacement + '\n        </TabsContent>');

fs.writeFileSync('src/pages/StaffProfile.tsx', code);
console.log('Fixed stats block');
