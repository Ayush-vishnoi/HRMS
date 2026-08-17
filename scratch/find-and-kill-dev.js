const { execSync } = require('child_process');

try {
  const psScript = `Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' } | Select-Object ProcessId, CommandLine | ConvertTo-Json`;
  const output = execSync(`powershell -NoProfile -Command "${psScript}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const list = JSON.parse(output);
  const items = Array.isArray(list) ? list : [list];
  for (const item of items) {
    if (item.CommandLine && item.CommandLine.includes('HRMS') && !item.CommandLine.includes('find-and-kill-dev')) {
      console.log('Terminating background process:', item.ProcessId, item.CommandLine.slice(0, 80));
      try {
        process.kill(item.ProcessId, 'SIGKILL');
      } catch (e) {
        console.log('Error:', e.message);
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
