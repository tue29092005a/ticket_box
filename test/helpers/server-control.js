const { exec } = require('child_process');

function killPort(port) {
  return new Promise((resolve, reject) => {
    // Windows specific command to find process by port and kill it
    const command = `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`;
    
    exec(command, (error, stdout, stderr) => {
      if (error && !error.message.includes('No tasks running')) {
        // Ignore "No tasks running" error
        console.log(`Port ${port} was probably already free or error: ${error.message}`);
      } else {
        console.log(`Successfully killed process on port ${port}`);
      }
      resolve();
    });
  });
}

const args = process.argv.slice(2);
const action = args[0];

if (!action) {
  console.log('Usage: node server-control.js <kill-auth|kill-info|kill-booking|kill-all>');
  process.exit(1);
}

async function main() {
  switch (action) {
    case 'kill-auth':
      console.log('Stopping Auth Service (port 3001)...');
      await killPort(3001);
      break;
    case 'kill-info':
      console.log('Stopping Info Service (port 3003)...'); // based on nginx config info is 3003
      await killPort(3003);
      break;
    case 'kill-booking':
      console.log('Stopping Booking Service nodes (ports 3002, 3012, 3022)...');
      await Promise.all([killPort(3002), killPort(3012), killPort(3022)]);
      break;
    case 'kill-booking-one':
      console.log('Stopping Booking Service Node 1 (port 3002)...');
      await killPort(3002);
      break;
    case 'kill-booking-two':
      console.log('Stopping Booking Service Node 1 & 2 (port 3002, 3012)...');
      await Promise.all([killPort(3002), killPort(3012)]);
      break;
    case 'kill-all':
      console.log('Stopping all services...');
      await Promise.all([
        killPort(3001), 
        killPort(3003), 
        killPort(3004), 
        killPort(3002), 
        killPort(3012), 
        killPort(3022)
      ]);
      break;
    default:
      console.log('Unknown action');
  }
}

main();
