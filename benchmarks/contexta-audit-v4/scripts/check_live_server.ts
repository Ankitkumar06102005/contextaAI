async function check() {
  const healthRes = await fetch('http://localhost:3000/health');
  console.log('Health status:', healthRes.status, await healthRes.json());
  const sampleRes = await fetch('http://localhost:3000/sample-doc');
  console.log('Sample doc:', sampleRes.status, await sampleRes.json());
}
check().catch(console.error);
