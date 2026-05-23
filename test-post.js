async function test() {
  const req = await fetch('http://localhost:3000/api/stream-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Testing Category' })
  });
  console.log(req.status, await req.text());
}
test();
