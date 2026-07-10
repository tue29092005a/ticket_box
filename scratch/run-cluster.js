const { spawn } = require('child_process');
const path = require('path');

const ports = [3000, 3001, 3002];
const processes = [];

console.log('--- KHỞI ĐỘNG BOOKING CLUSTER ---');

ports.forEach(port => {
  const env = { ...process.env, PORT: port.toString() };
  
  // Use npx ts-node to run the booking service
  const child = spawn('npx.cmd', ['ts-node', 'src/main.ts'], {
    env,
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });

  child.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.log(`[Server ${port}] ${output}`);
  });

  child.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) console.error(`[Server ${port}] ERROR: ${output}`);
  });

  processes.push(child);
  console.log(`=> Đang mở cổng ${port}...`);
});

process.on('SIGINT', () => {
  console.log('\nĐang tắt các server...');
  processes.forEach(p => p.kill());
  process.exit();
});
