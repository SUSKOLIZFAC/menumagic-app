const { execSync } = require('child_process');
try {
  const log = execSync('git log -p firebase-applet-config.json').toString();
  console.log(log);
} catch (e) {
  console.log('Error:', e.message);
}
