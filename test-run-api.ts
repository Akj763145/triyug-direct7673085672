import { apiCache, invalidateApiCache, fetchFromSupabase, api } from './test-api-mock';

async function check() {
  const students = await api.getStudents();
  console.log("Students from api: ", students.length);
  if (students.length > 0) console.log(students[0]);
}
check();
